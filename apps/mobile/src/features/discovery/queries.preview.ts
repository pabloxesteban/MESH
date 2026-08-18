/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * Metro resuelve este archivo en lugar del real cuando MESH_PREVIEW=1. La
 * firma es idéntica a propósito: si cambia la del original, esto tiene que
 * dejar de compilar.
 */

import {
  PREVIEW_ARTISTS,
  previewMediaUrl,
  previewProfessionalId,
} from '../../../preview/store.ts'

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
  readonly nextCursor: string | null
}

/**
 * El mismo reparto fraccionario que hace el RPC: a la obra `i` de un artista
 * con `n` piezas le toca la posición `(i - 0,5) / n`. Sin esto el preview
 * mostraría diez piezas seguidas del mismo artista y el mazo no se parecería en
 * nada al de la app.
 */
const ORDERED: readonly FeedItem[] = PREVIEW_ARTISTS.flatMap((artist) =>
  artist.pieces.map((piece, index) => ({
    sort: (index + 0.5) / artist.pieces.length,
    item: {
      cursor: piece.id,
      portfolioItemId: piece.id,
      professionalId: previewProfessionalId(artist.slug),
      professionalSlug: artist.slug,
      professionalName: artist.displayName,
      isFixture: artist.isFixture,
      caption: piece.caption,
      year: piece.year,
      mediaBucket: 'portfolio',
      mediaPath: piece.id,
      mediaWidth: piece.width,
      mediaHeight: piece.height,
      blurhash: null,
      styles: piece.styles,
    } satisfies FeedItem,
  })),
)
  .sort((a, b) => a.sort - b.sort || a.item.cursor.localeCompare(b.item.cursor))
  .map((entry) => entry.item)

export async function fetchDiscoveryFeed(
  _categorySlug: string,
  cursor: string | null,
): Promise<FeedPage> {
  const { previewInteractions } = await import('../../../preview/store.ts')
  const seen = new Set(
    previewInteractions().map((entry) => entry.portfolioItemId),
  )

  const pending = ORDERED.filter((item) => !seen.has(item.portfolioItemId))
  const start =
    cursor == null ? 0 : pending.findIndex((item) => item.cursor === cursor) + 1
  const items = pending.slice(start, start + FEED_PAGE_SIZE)

  return {
    items,
    nextCursor:
      items.length === FEED_PAGE_SIZE
        ? (items[items.length - 1]?.cursor ?? null)
        : null,
  }
}

export function mediaUrl(path: string, _size: 'sm' | 'md' | 'lg'): string {
  // Un solo tamaño horneado: el preview no tiene de dónde bajar tres.
  return previewMediaUrl(path)
}
