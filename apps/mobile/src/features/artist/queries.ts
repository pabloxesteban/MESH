/**
 * El único lugar donde el modo artista habla con Supabase.
 *
 * Todo lo de acá está autorizado por RLS y no por estas funciones: un cliente
 * modificado que llame `addPiece` con el id de otro profesional recibe un 42501.
 * Ver supabase/tests/25_artist_ownership.sql.
 */

import type { GeoCoordinates } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'

import { weightsFor } from './weights.ts'

export interface OwnedProfessional {
  readonly id: string
  readonly slug: string
  readonly displayName: string
  readonly isPublished: boolean
  readonly studioCoordinates: GeoCoordinates | null
  /** Los estilos que el artista declaró. Distintos de los de cada pieza. */
  readonly styleSlugs: readonly string[]
  /** Solo lectura desde Perfil: se edita en el Estudio, no acá. */
  readonly bio: string | null
  /** Si la tarjeta de Inicio ya tiene foto. Ver el aviso de Perfil, ADR-030. */
  readonly hasAvatar: boolean
}

export interface OwnedPiece {
  readonly id: string
  readonly mediaPath: string
  readonly isFeatured: boolean
  readonly styleSlugs: readonly string[]
  readonly isOwnDesign: boolean
  readonly sizeLabel: string | null
  readonly price: { cents: number; currency: string } | null
}

/**
 * El perfil que esta persona reclamó, o `null`.
 *
 * **Filtra por `owner_user_id` a propósito, y no alcanza con RLS.** La primera
 * versión de esto confiaba en la política y pedía "cualquier profesional con
 * dueño", porque parecía que RLS ya recortaba a lo propio. No lo hace:
 * `professionals` tiene dos políticas de SELECT permisivas y una de ellas es
 * `using (is_published)`, así que *todo perfil publicado es legible por
 * cualquiera*. Sin este filtro, quien no tiene estudio abría el Estudio y veía
 * el perfil de otro artista — no podría escribirlo, porque ahí sí RLS lo para
 * con un 42501, pero lo vería.
 *
 * La seguridad sigue viviendo en la base. Esto es la consulta diciendo qué
 * fila quiere, que es otra cosa.
 */
export async function fetchOwnedProfessional(
  userId: string,
): Promise<OwnedProfessional | null> {
  const { data, error } = await supabase
    .from('professionals')
    .select(
      'id, slug, display_name, is_published, bio, studio_lat, studio_lng, avatar_media_id, professional_styles ( styles ( slug ) )',
    )
    .eq('owner_user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error != null) throw error
  if (data == null) return null

  return {
    id: data.id,
    slug: data.slug,
    displayName: data.display_name,
    isPublished: data.is_published,
    bio: data.bio,
    hasAvatar: data.avatar_media_id != null,
    studioCoordinates:
      data.studio_lat == null || data.studio_lng == null
        ? null
        : { lat: data.studio_lat, lng: data.studio_lng },
    styleSlugs: (
      (data.professional_styles ?? []) as Array<{
        styles: { slug: string } | null
      }>
    )
      .map((entry) => entry.styles?.slug)
      .filter((slug): slug is string => slug != null),
  }
}

/**
 * Crea el perfil de artista de quien llama. Devuelve el slug.
 *
 * Un camino distinto del código de reclamo, no un reemplazo: un perfil que
 * MESH armó se sigue reclamando con `claimProfessional`. Ver ADR-013.
 */
export async function createOwnProfessional(input: {
  displayName: string
  instagram?: string | undefined
  whatsapp?: string | undefined
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_own_professional', {
    p_display_name: input.displayName,
    ...(input.instagram != null ? { p_instagram: input.instagram } : {}),
    ...(input.whatsapp != null ? { p_whatsapp: input.whatsapp } : {}),
  })
  if (error != null) throw error
  return String(data)
}

/**
 * Reemplaza los estilos declarados del perfil propio.
 *
 * Sin esto el componente Estilo del matching —que pesa 0,70— le da cero al
 * artista: existe en el catálogo y no aparece nunca en los resultados.
 */
export async function setOwnStyles(
  styleSlugs: readonly string[],
): Promise<void> {
  const { error } = await supabase.rpc('set_own_styles', {
    p_style_slugs: [...styleSlugs],
  })
  if (error != null) throw error
}

/** Publica (o actualiza) la ubicación real del estudio. Solo la fila propia. */
export async function setStudioLocation(
  coordinates: GeoCoordinates,
  neighborhoodSlug?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('set_studio_location', {
    p_lat: coordinates.lat,
    p_lng: coordinates.lng,
    ...(neighborhoodSlug != null
      ? { p_neighborhood_slug: neighborhoodSlug }
      : {}),
  })
  if (error != null) throw error
}

export async function fetchOwnedPieces(
  professionalId: string,
): Promise<readonly OwnedPiece[]> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select(
      'id, is_featured, sort_order, is_original_design, size_label, price_cents, price_currency, media_assets ( path ), portfolio_item_styles ( weight, styles ( slug ) )',
    )
    .eq('professional_id', professionalId)
    .order('sort_order', { ascending: true })

  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    mediaPath: row.media_assets?.path ?? '',
    isFeatured: row.is_featured,
    styleSlugs: (row.portfolio_item_styles ?? [])
      .slice()
      .sort((a, b) => Number(b.weight) - Number(a.weight))
      .map((entry) => entry.styles?.slug)
      .filter((slug): slug is string => slug != null),
    isOwnDesign: row.is_original_design,
    sizeLabel: row.size_label,
    price:
      row.price_cents == null
        ? null
        : { cents: row.price_cents, currency: row.price_currency ?? 'ARS' },
  }))
}

/** Canjea el código. Devuelve el slug del perfil reclamado. */
export async function claimProfessional(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_professional', {
    p_code: code,
  })
  if (error != null) throw error
  return String(data)
}

export interface NewPiece {
  readonly professionalId: string
  readonly mediaId: string
  readonly styleSlugsInOrder: readonly string[]
  readonly isFeatured: boolean
  readonly isOriginalDesign: boolean
  readonly sizeLabel: string | null
  readonly priceCents: number | null
}

/**
 * Crea la pieza y sus estilos.
 *
 * Dos escrituras y no una transacción: PostgREST no expone transacciones desde
 * el cliente. Si la segunda falla, se borra la primera — una pieza sin estilos
 * no aparece en el mazo pero sí ocupa lugar en el perfil, y una pieza a medias
 * es peor que ninguna.
 */
export async function addPiece(piece: NewPiece): Promise<string> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .insert({
      professional_id: piece.professionalId,
      media_id: piece.mediaId,
      is_featured: piece.isFeatured,
      is_original_design: piece.isOriginalDesign,
      size_label: piece.sizeLabel,
      price_cents: piece.priceCents,
      // Precio completo o ausente, mismo espíritu que la restricción de base
      // (ADR-034): si no hay precio declarado, tampoco hay moneda ni fecha.
      price_currency: piece.priceCents != null ? 'ARS' : null,
      priced_at:
        piece.priceCents != null ? new Date().toISOString().slice(0, 10) : null,
    })
    .select('id')
    .single()

  if (error != null || data == null) {
    throw error ?? new Error('no se pudo crear la pieza')
  }

  const weights = weightsFor(piece.styleSlugsInOrder)
  const { data: styleRows, error: stylesLookupError } = await supabase
    .from('styles')
    .select('id, slug')
    .in(
      'slug',
      weights.map((weight) => weight.slug),
    )

  if (stylesLookupError != null) {
    await supabase.from('portfolio_items').delete().eq('id', data.id)
    throw stylesLookupError
  }

  const byslug = new Map((styleRows ?? []).map((row) => [row.slug, row.id]))
  const { error: stylesError } = await supabase
    .from('portfolio_item_styles')
    .insert(
      weights.map((weight) => ({
        portfolio_item_id: data.id,
        style_id: byslug.get(weight.slug) as string,
        weight: weight.weight,
      })),
    )

  if (stylesError != null) {
    await supabase.from('portfolio_items').delete().eq('id', data.id)
    throw stylesError
  }

  return data.id
}

export async function removePiece(pieceId: string): Promise<void> {
  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', pieceId)
  if (error != null) throw error
}

/**
 * Cuántos turnos propios (como profesional) ya pasaron sin cancelarse.
 *
 * `0` si quien llama no tiene perfil de artista — el RPC lo calcula así, sin
 * fallar. Ver ADR-030 y `get_completed_appointments_count()`.
 */
export async function fetchCompletedAppointmentsCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_completed_appointments_count')
  if (error != null) throw error
  return data ?? 0
}
