/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * Misma selección determinística que `get_style_examples` — mayor peso
 * declarado, desempatado por id de pieza — pero calculada en el cliente
 * sobre el catálogo horneado, ya que acá no hay base a la que preguntarle.
 */

import { PREVIEW_ARTISTS } from '../../../preview/store.ts'
import type { StyleExample } from './queries.ts'

export async function fetchStyleExamples(
  _categorySlug: string,
): Promise<readonly StyleExample[]> {
  const bestByStyle = new Map<string, { pieceId: string; weight: number }>()

  for (const artist of PREVIEW_ARTISTS) {
    for (const piece of artist.pieces) {
      for (const style of piece.styles) {
        const current = bestByStyle.get(style.slug)
        if (
          current == null ||
          style.weight > current.weight ||
          (style.weight === current.weight && piece.id < current.pieceId)
        ) {
          bestByStyle.set(style.slug, { pieceId: piece.id, weight: style.weight })
        }
      }
    }
  }

  return [...bestByStyle.entries()].map(([styleSlug, best]) => ({
    styleSlug,
    mediaPath: best.pieceId,
  }))
}
