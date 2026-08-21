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
  return (await todos())
    // El RPC esconde a quien no tiene una sola obra: su tarjeta saldría vacía.
    .filter((artist) => artist.pieces.length > 0)
}

/**
 * El mismo número que `queries.ts`, escrito de nuevo y no reexportado.
 *
 * Reexportarlo desde `./queries.ts` sería reexportarlo desde **este mismo
 * archivo**: el swap de metro reescribe `./queries.ts` a `./queries.preview.ts`
 * también acá adentro, así que el getter que genera el transpilador se termina
 * llamando a sí mismo. El síntoma es un stack overflow que no dice de dónde
 * viene. Ver `preview-swap.test.ts`.
 */
export const MIN_SEARCH_LENGTH = 2

/**
 * Buscar por nombre en el preview.
 *
 * Replica lo que hace la base, no lo que sería más fácil acá: sin acentos, sin
 * mayúsculas, por pedazo del nombre o del slug, y **sin filtrar a quien no
 * subió obra** —que es justamente la diferencia con la grilla—. El orden es el
 * mismo criterio: exacto, después arranca así, después una palabra arranca
 * así, después lo lleva adentro.
 */
export async function searchArtists(
  _categorySlug: string,
  query: string,
): Promise<readonly ArtistCardData[]> {
  const q = clave(query.trim())
  if (q.length < MIN_SEARCH_LENGTH) return []

  return (await todos())
    .filter(
      (artist) =>
        clave(artist.displayName).includes(q) || clave(artist.slug).includes(q),
    )
    .map((artist) => ({ artist, rango: rangoDe(clave(artist.displayName), q) }))
    .sort(
      (a, b) =>
        a.rango - b.rango ||
        Number(b.artist.pieces.length > 0) -
          Number(a.artist.pieces.length > 0) ||
        clave(a.artist.displayName).localeCompare(clave(b.artist.displayName)),
    )
    .map(({ artist }) => artist)
}

/** Lo mismo que `public.search_key`: sin acentos y en minúscula. */
function clave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function rangoDe(nombre: string, q: string): number {
  if (nombre === q) return 0
  if (nombre.startsWith(q)) return 1
  if (nombre.includes(` ${q}`)) return 2
  return 3
}

async function todos(): Promise<readonly ArtistCardData[]> {
  const propio = previewOwnedProfessional()

  return (
    previewArtists()
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

        const horneadas: readonly ArtistPiece[] = artist.pieces.map(
          (piece) => ({
            id: piece.id,
            mediaPath: piece.id,
            width: piece.width,
            height: piece.height,
            blurhash: null,
          }),
        )

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
  )
}

export function avatarUrl(path: string): string {
  return previewMediaUrl(path)
}

export { previewMediaUrl as mediaUrl }
