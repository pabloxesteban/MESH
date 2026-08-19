/**
 * Escritura en Supabase con la service-role key.
 *
 * Todo lo de acá saltea RLS. Es la única parte del repositorio que puede
 * hacerlo, y por eso está separada del resto: leer este archivo tiene que ser
 * suficiente para saber qué escribe el seeder.
 *
 * Idempotencia: cada tabla se escribe con `upsert` sobre su clave natural
 * (`slug` para artistas, `(bucket, path)` para media, `media_id` para piezas).
 * Volver a correr la carga produce el mismo resultado y no duplica nada.
 */

import { createHash } from 'node:crypto'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@mesh/domain/db'
import {
  findLocation,
  portfolioPath,
  type ArtistContent,
  type PortfolioItemContent,
  type PortfolioSize,
} from '@mesh/domain'

import { readServiceRoleKey } from './guard.ts'
import type { ProcessedImage } from './media.ts'

export type Client = SupabaseClient<Database>

/** La forma exacta que espera la tabla, tomada del esquema generado. */
export type ProfessionalRow =
  Database['public']['Tables']['professionals']['Insert']

export function createServiceClient(url: string): Client {
  return createClient<Database>(url, readServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Falla ruidosamente. Un seeder que sigue después de un error deja media carga. */
function must<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error != null) {
    throw new Error(`${what}: ${result.error.message}`)
  }
  if (result.data == null) {
    throw new Error(`${what}: no devolvió filas`)
  }
  return result.data
}

export interface ReferenceIds {
  readonly categoryId: string
  readonly styleIdBySlug: ReadonlyMap<string, string>
  readonly locationIdBySlug: ReadonlyMap<string, string>
}

export async function loadReferenceIds(
  client: Client,
  categorySlug: string,
): Promise<ReferenceIds> {
  const category = must(
    await client
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single(),
    `no se encontró la categoría "${categorySlug}"`,
  )

  const styles = must(
    await client
      .from('styles')
      .select('id, slug')
      .eq('category_id', category.id),
    'no se pudieron leer los estilos',
  )

  const locations = must(
    await client.from('locations').select('id, slug'),
    'no se pudieron leer las ubicaciones',
  )

  return {
    categoryId: category.id,
    styleIdBySlug: new Map(styles.map((s) => [String(s.slug), s.id])),
    locationIdBySlug: new Map(locations.map((l) => [String(l.slug), l.id])),
  }
}

export interface UploadTarget {
  readonly bucket: 'portfolio'
  readonly path: string
  readonly bytes: Buffer
}

/**
 * Sube un objeto y devuelve `true` si efectivamente escribió.
 *
 * `upsert: true` sobre la misma ruta reemplaza el objeto. Como la ruta se deriva
 * del id de la pieza y el contenido del checksum, reemplazar solo pasa cuando
 * la imagen cambió de verdad.
 */
export async function uploadObject(
  client: Client,
  target: UploadTarget,
): Promise<void> {
  const { error } = await client.storage
    .from(target.bucket)
    .upload(target.path, target.bytes, {
      // Explícito, nunca inferido de la extensión.
      contentType: 'image/webp',
      upsert: true,
    })
  if (error != null) {
    throw new Error(`no se pudo subir ${target.path}: ${error.message}`)
  }
}

export interface UpsertArtistResult {
  readonly professionalId: string
  readonly pieces: number
}

/**
 * La fila de `professionals`, armada aparte para poder testearla.
 *
 * Es puro mapeo de YAML a columnas, que suena trivial hasta que un campo se
 * escribe mal y nadie se entera porque los fixtures no lo usan — los precios y
 * las fechas de disponibilidad son de los que solo aparecen con contenido real.
 *
 * **`is_published` solo se escribe en el alta**, y esa es la regla que este
 * archivo existe para hacer visible. Ver el comentario en `upsertArtist`.
 */
export function artistRow(
  artist: ArtistContent,
  {
    categoryId,
    locationId,
    isNew,
  }: { categoryId: string; locationId: string | null; isNew: boolean },
): ProfessionalRow {
  return {
    category_id: categoryId,
    slug: artist.slug,
    display_name: artist.display_name,
    bio: artist.bio ?? null,
    location_id: locationId,
    travels: artist.travels ?? false,
    price_min_cents: artist.price?.min_cents ?? null,
    price_max_cents: artist.price?.max_cents ?? null,
    price_currency: artist.price?.currency ?? null,
    priced_at: artist.price?.priced_at ?? null,
    availability_status: artist.availability?.status ?? null,
    availability_updated_at: artist.availability?.updated_at ?? null,
    instagram_handle: artist.contact.instagram ?? null,
    whatsapp_e164: artist.contact.whatsapp ?? null,
    is_fixture: artist.is_fixture ?? false,
    // Publicar es una decisión aparte de cargar (content-policy §7), y
    // despublicar también: una actualización no toca este campo ni para arriba
    // ni para abajo.
    ...(isNew ? { is_published: false } : {}),
  }
}

export async function upsertArtist(
  client: Client,
  artist: ArtistContent,
  refs: ReferenceIds,
): Promise<string> {
  const location = findLocation(artist.location)
  const locationId =
    location == null ? null : (refs.locationIdBySlug.get(location.slug) ?? null)

  // ¿Ya existía? Decide una sola cosa, y es la que más duele equivocar: si esta
  // carga toca `is_published`.
  //
  // La versión anterior escribía `is_published: false` siempre, con el
  // razonamiento correcto —publicar es una decisión aparte de cargar— aplicado
  // al caso equivocado. En un alta es cierto; en una actualización significa
  // que **corregir una bio saca a la persona de la app**, en silencio, hasta
  // que alguien se acuerde de volver a correr con `--publish`. Y ese es
  // exactamente el procedimiento que documenta rollback.md caso 2 para arreglar
  // un dato en una hora.
  //
  // Se descubrió cargando de a un artista: quedaron nueve publicados de diez.
  const previo = await client
    .from('professionals')
    .select('id')
    .eq('slug', artist.slug)
    .maybeSingle()
  if (previo.error != null) {
    throw new Error(
      `no se pudo leer el profesional "${artist.slug}": ${previo.error.message}`,
    )
  }
  const esAlta = previo.data == null

  const professional = must(
    await client
      .from('professionals')
      .upsert(
        artistRow(artist, {
          categoryId: refs.categoryId,
          locationId,
          isNew: esAlta,
        }),
        { onConflict: 'slug' },
      )
      .select('id')
      .single(),
    `no se pudo escribir el profesional "${artist.slug}"`,
  )

  // Los estilos se reemplazan enteros: si alguien saca un estilo del YAML, tiene
  // que desaparecer de la base. Un upsert sin borrado dejaría el viejo puesto y
  // el vector de match seguiría contándolo.
  const remove = await client
    .from('professional_styles')
    .delete()
    .eq('professional_id', professional.id)
  if (remove.error != null) {
    throw new Error(
      `no se pudieron limpiar los estilos: ${remove.error.message}`,
    )
  }

  const rows = artist.styles.map((style) => {
    const styleId = refs.styleIdBySlug.get(style.slug)
    if (styleId == null) {
      throw new Error(`el estilo "${style.slug}" no existe en la base`)
    }
    return {
      professional_id: professional.id,
      style_id: styleId,
      proficiency: style.proficiency,
      is_primary: style.primary,
    }
  })

  // Los primarios primero: el trigger de tope cuenta filas ya insertadas, así
  // que insertar en un orden donde los primarios queden al final no cambia el
  // resultado, pero el orden explícito hace que el error, si lo hay, señale la
  // fila correcta.
  rows.sort((a, b) => Number(b.is_primary) - Number(a.is_primary))

  const inserted = await client.from('professional_styles').insert(rows)
  if (inserted.error != null) {
    throw new Error(
      `no se pudieron escribir los estilos: ${inserted.error.message}`,
    )
  }

  return professional.id
}

export interface PieceInput {
  readonly item: PortfolioItemContent
  readonly image: ProcessedImage
  readonly index: number
}

export async function upsertPiece(
  client: Client,
  professionalId: string,
  artistSlug: string,
  input: PieceInput,
  refs: ReferenceIds,
): Promise<void> {
  // La ruta se deriva del id de la PIEZA, no del nombre del archivo, así que el
  // nombre que trajo el archivo nunca forma parte de una ruta de storage.
  const pieceId = deterministicPieceId(artistSlug, input.item.file)

  const paths = new Map<PortfolioSize, string>()
  for (const derivative of input.image.derivatives) {
    const path = portfolioPath(artistSlug, pieceId, derivative.size)
    paths.set(derivative.size, path)
    await uploadObject(client, {
      bucket: 'portfolio',
      path,
      bytes: derivative.bytes,
    })
  }

  const large = input.image.derivatives.find((d) => d.size === 'lg')
  if (large == null) throw new Error('falta el derivado lg')
  const largePath = paths.get('lg')
  if (largePath == null) throw new Error('falta la ruta del derivado lg')

  const media = must(
    await client
      .from('media_assets')
      .upsert(
        {
          bucket: 'portfolio',
          path: largePath,
          mime_type: 'image/webp',
          width: large.width,
          height: large.height,
          byte_size: large.bytes.length,
          blurhash: input.image.blurhash,
          checksum: input.image.checksum,
          owner_user_id: null,
        },
        { onConflict: 'bucket,path' },
      )
      .select('id')
      .single(),
    `no se pudo escribir la media de ${input.item.file}`,
  )

  const piece = must(
    await client
      .from('portfolio_items')
      .upsert(
        {
          professional_id: professionalId,
          media_id: media.id,
          caption: input.item.caption ?? null,
          year: input.item.year ?? null,
          is_featured: input.item.featured ?? false,
          sort_order: input.index,
        },
        { onConflict: 'media_id' },
      )
      .select('id')
      .single(),
    `no se pudo escribir la pieza ${input.item.file}`,
  )

  const remove = await client
    .from('portfolio_item_styles')
    .delete()
    .eq('portfolio_item_id', piece.id)
  if (remove.error != null) {
    throw new Error(
      `no se pudieron limpiar los estilos de la pieza: ${remove.error.message}`,
    )
  }

  const styleRows = input.item.styles.map((style) => {
    const styleId = refs.styleIdBySlug.get(style.slug)
    if (styleId == null) {
      throw new Error(`el estilo "${style.slug}" no existe en la base`)
    }
    return {
      portfolio_item_id: piece.id,
      style_id: styleId,
      weight: style.weight,
    }
  })

  const inserted = await client.from('portfolio_item_styles').insert(styleRows)
  if (inserted.error != null) {
    throw new Error(
      `no se pudieron escribir los estilos de la pieza: ${inserted.error.message}`,
    )
  }
}

/**
 * Id estable de una pieza, derivado de `(slug del artista, nombre del archivo)`.
 *
 * Tiene que ser determinístico: si cambiara entre corridas, la ruta de storage
 * cambiaría y cada carga dejaría una copia huérfana del objeto anterior. Se
 * arma con un UUID v5-like sobre un SHA-1 del par.
 */
export function deterministicPieceId(
  artistSlug: string,
  fileName: string,
): string {
  const digest = createHash('sha1')
    .update(`mesh/portfolio/${artistSlug}/${fileName}`)
    .digest('hex')

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    // Versión 5 y variante RFC 4122: el id tiene que ser un UUID válido porque
    // la columna lo es.
    `5${digest.slice(13, 16)}`,
    ((Number.parseInt(digest.slice(16, 17), 16) & 0x3) | 0x8).toString(16) +
      digest.slice(17, 20),
    digest.slice(20, 32),
  ].join('-')
}

export async function writeAuditEvent(
  client: Client,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from('audit_events').insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata as never,
  })
  if (error != null) {
    throw new Error(`no se pudo escribir el audit_event: ${error.message}`)
  }
}
