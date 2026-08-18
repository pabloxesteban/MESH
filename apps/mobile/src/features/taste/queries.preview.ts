/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El vector de gusto NO se calcula acá: lo calcula `packages/domain`, igual que
 * en la app. Lo único que cambia es de dónde salen las interacciones y las
 * etiquetas de las piezas.
 */

import type { Interaction, PieceStyles } from '@mesh/domain'

import {
  PREVIEW_ARTISTS,
  previewInteractions,
  resetPreviewInteractions,
} from '../../../preview/store.ts'

export interface TasteSource {
  readonly interactions: readonly Interaction[]
  readonly pieces: ReadonlyMap<string, PieceStyles>
}

const PIECES: ReadonlyMap<string, PieceStyles> = new Map(
  PREVIEW_ARTISTS.flatMap((artist) =>
    artist.pieces.map(
      (piece) =>
        [
          piece.id,
          {
            portfolioItemId: piece.id,
            styles: piece.styles.map((style) => ({
              styleSlug: style.slug,
              weight: style.weight,
            })),
          },
        ] as const,
    ),
  ),
)

export async function fetchTasteSource(): Promise<TasteSource> {
  const interactions = previewInteractions()
  if (interactions.length === 0) return { interactions, pieces: new Map() }

  const pieces = new Map<string, PieceStyles>()
  for (const interaction of interactions) {
    const entry = PIECES.get(interaction.portfolioItemId)
    if (entry != null) pieces.set(interaction.portfolioItemId, entry)
  }
  return { interactions, pieces }
}

export interface PersistableTaste {
  readonly categoryId: string
  readonly scores: Readonly<Record<string, number>>
  readonly aversion: Readonly<Record<string, number>>
  readonly decisiveCount: number
  readonly isReady: boolean
  readonly algoVersion: string
}

export async function persistTaste(
  _userId: string,
  _taste: PersistableTaste,
): Promise<void> {
  // El vector es un caché derivado de las interacciones, que ya están en
  // memoria. No hay nada que guardar.
}

export async function fetchCategoryId(_slug: string): Promise<string | null> {
  return 'preview-category-tattoo'
}

export async function resetTaste(_userId: string): Promise<void> {
  resetPreviewInteractions()
}
