/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El catálogo horneado no trae coordenadas de estudio —son fixtures, y no
 * inventamos una ubicación que nadie dio— así que en el preview casi todas las
 * tarjetas muestran "no publicó su ubicación". El único que puede tener
 * distancia es tu propio perfil, si le pusiste ubicación desde el estudio.
 * Es la misma verdad que en la app: la distancia necesita las dos puntas.
 */

import {
  previewArtists,
  previewMediaUrl,
  previewPiecesOf,
  previewOwnedProfessional,
  previewStudioCoordinatesOf,
} from '../../../preview/store.ts'

import type { ArtistCardData, ArtistPiece } from './queries.ts'

export type { ArtistCardData, ArtistPiece } from './queries.ts'

/** Cuántas obras entran en el carrusel. El mismo número que el RPC. */
const PIECES = 6

export async function fetchArtistGrid(
  _categorySlug: string,
): Promise<readonly ArtistCardData[]> {
  const propio = previewOwnedProfessional()

  return previewArtists()
    .map((artist) => {
      // Tu propio perfil muestra lo que subiste desde el estudio; el resto,
      // su obra horneada.
      const propias: readonly ArtistPiece[] =
        artist.slug === propio
          ? previewPiecesOf().map((piece) => ({
              id: piece.id,
              mediaPath: piece.id,
              width: null,
              height: null,
              blurhash: null,
            }))
          : []

      const horneadas: readonly ArtistPiece[] = artist.pieces.map((piece) => ({
        id: piece.id,
        mediaPath: piece.id,
        width: piece.width,
        height: piece.height,
        blurhash: null,
      }))

      return {
        professionalId: `preview-${artist.slug}`,
        slug: artist.slug,
        displayName: artist.displayName,
        isFixture: artist.isFixture,
        // Ningún fixture tiene avatar, igual que en la base.
        avatarPath: null,
        neighborhoodSlug: artist.location,
        studioCoordinates: previewStudioCoordinatesOf(artist.slug),
        pieces: [...propias, ...horneadas].slice(0, PIECES),
      }
    })
    // El RPC esconde a quien no tiene una sola obra: su tarjeta saldría vacía.
    .filter((artist) => artist.pieces.length > 0)
}

export function avatarUrl(path: string): string {
  return previewMediaUrl(path)
}

export { previewMediaUrl as mediaUrl }
