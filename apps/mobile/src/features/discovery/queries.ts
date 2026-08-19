/**
 * El único lugar donde descubrimiento habla con Supabase.
 *
 * Una sola llamada por página: el RPC `get_discovery_feed` devuelve la pieza,
 * su media, su profesional y sus estilos. Armar esto del lado del cliente
 * significaría bajar el catálogo entero para descartar la mayor parte.
 */

import { supabase } from '../../data/supabase.ts'

export const FEED_PAGE_SIZE = 12

export interface FeedStyle {
  readonly slug: string
  readonly weight: number
}

export interface FeedItem {
  readonly cursor: string
  readonly portfolioItemId: string
  readonly professionalId: string
  readonly professionalSlug: string
  readonly professionalName: string
  /** Registro de prueba. Toda superficie que lo muestre tiene que decirlo. */
  readonly isFixture: boolean
  readonly caption: string | null
  readonly year: number | null
  readonly mediaBucket: string
  readonly mediaPath: string
  readonly mediaWidth: number | null
  readonly mediaHeight: number | null
  readonly blurhash: string | null
  readonly styles: readonly FeedStyle[]
}

export interface FeedPage {
  readonly items: readonly FeedItem[]
  /** `null` cuando no hay más. La lista terminada es un estado, no un error. */
  readonly nextCursor: string | null
}

export interface FeedOptions {
  /**
   * Si trae también la obra ya decidida.
   *
   * `false` en el mazo: una obra que vuelve después de que la marcaste es una
   * decisión que no se respetó. `true` en la grilla: alguien que marcó treinta
   * obras abriría Descubrir y no encontraría ninguna, que es lo contrario de
   * explorar. Ver docs/design/MESH-VISUAL-DIRECTION-2.md.
   */
  readonly includeSeen?: boolean
}

export async function fetchDiscoveryFeed(
  categorySlug: string,
  cursor: string | null,
  options: FeedOptions = {},
): Promise<FeedPage> {
  const { data, error } = await supabase.rpc('get_discovery_feed', {
    p_category_slug: categorySlug,
    p_limit: FEED_PAGE_SIZE,
    // El tipo generado declara el argumento opcional, no nullable. Mandar
    // `undefined` en la primera página es lo mismo para Postgres, que aplica el
    // default de la función.
    ...(cursor != null ? { p_cursor: cursor } : {}),
    ...(options.includeSeen === true ? { p_include_seen: true } : {}),
  })

  if (error != null) throw error

  const items = (data ?? []).map(toFeedItem)
  return {
    items,
    // Se pide una página completa. Si vino incompleta, es la última — así no
    // hace falta una consulta extra para descubrir el final.
    nextCursor:
      items.length === FEED_PAGE_SIZE
        ? (items[items.length - 1]?.cursor ?? null)
        : null,
  }
}

/**
 * La fila cruda del RPC.
 *
 * Se mapea a mano en vez de pasar el tipo generado hacia arriba a propósito: el
 * resto de la app habla en camelCase y en tipos del dominio, y dejar entrar
 * `media_blurhash` hasta un componente es cómo un cambio de columna termina
 * tocando una pantalla.
 */
type FeedRow = Record<string, unknown>

function toFeedItem(row: FeedRow): FeedItem {
  const styles = Array.isArray(row['styles'])
    ? (row['styles'] as Array<{ slug?: unknown; weight?: unknown }>)
        .filter((style) => typeof style.slug === 'string')
        .map((style) => ({
          slug: String(style.slug),
          weight: Number(style.weight ?? 0),
        }))
    : []

  return {
    cursor: String(row['feed_cursor']),
    portfolioItemId: String(row['portfolio_item_id']),
    professionalId: String(row['professional_id']),
    professionalSlug: String(row['professional_slug']),
    professionalName: String(row['professional_display_name']),
    isFixture: row['professional_is_fixture'] === true,
    caption: (row['caption'] as string | null) ?? null,
    year: (row['year'] as number | null) ?? null,
    mediaBucket: String(row['media_bucket']),
    mediaPath: String(row['media_path']),
    mediaWidth: (row['media_width'] as number | null) ?? null,
    mediaHeight: (row['media_height'] as number | null) ?? null,
    blurhash: (row['media_blurhash'] as string | null) ?? null,
    styles,
  }
}

/**
 * URL pública de una imagen del catálogo, en el tamaño pedido.
 *
 * El bucket `portfolio` es de lectura pública, así que no hace falta firmar: es
 * la obra que el artista aceptó mostrar, y firmar cada tarjeta del mazo sería un
 * round trip por imagen.
 *
 * La ruta guardada apunta al derivado `lg`. Los otros dos son la misma ruta con
 * otro nombre de archivo, así que se derivan sin consultar nada.
 */
export function mediaUrl(path: string, size: 'sm' | 'md' | 'lg'): string {
  // Se cambia el tamaño y se CONSERVA la extensión: los tres derivados de una
  // pieza comparten formato, y hay dos productores con formatos distintos —
  // `tools/seed` escribe WebP y la app escribe JPEG. Ver storage/paths.ts.
  const resized = path.replace(
    /\/(sm|md|lg)\.(webp|jpg)$/,
    (_match, _size, extension: string) => `/${size}.${extension}`,
  )
  return supabase.storage.from('portfolio').getPublicUrl(resized).data.publicUrl
}
