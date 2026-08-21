/**
 * El ranking en el preview: se arma con lo que se guardó en esta sesión.
 *
 * Sin red y sin ventana de tiempo real — todo lo guardado en el preview cuenta
 * como de esta semana. Alcanza para lo que el preview sirve: mirar la fila con
 * obra de verdad adentro.
 */

import { PREVIEW_ARTISTS, artistOfPiece } from '../../../preview/store.ts'

import type { OwnSaveCount, RankedPiece, RankingWindow } from './ranking.ts'
import { fetchSavedIds } from './queries.preview.ts'

// Desde `window.ts` y no desde `./ranking.ts`: acá adentro ese especificador
// apunta a **este mismo archivo** por el swap de metro. Ver `window.ts`.
export { windowStart } from './window.ts'

export async function fetchTopSaved(
  _categorySlug: string,
  _window: RankingWindow,
): Promise<readonly RankedPiece[]> {
  const guardados = await fetchSavedIds()
  const piezas: RankedPiece[] = []

  for (const artista of PREVIEW_ARTISTS) {
    for (const pieza of artista.pieces) {
      if (!guardados.has(pieza.id)) continue
      const dueno = artistOfPiece(pieza.id) ?? artista
      piezas.push({
        portfolioItemId: pieza.id,
        // Uno: en el preview guarda una sola persona.
        saves: 1,
        professionalSlug: dueno.slug,
        professionalName: dueno.displayName,
        isFixture: dueno.isFixture,
        mediaPath: pieza.id,
        blurhash: null,
        width: pieza.width,
        height: pieza.height,
      })
    }
  }
  return piezas
}

export async function fetchOwnSaveCounts(
  _since: string | null,
): Promise<readonly OwnSaveCount[]> {
  const guardados = await fetchSavedIds()
  return [...guardados].map((id) => ({
    portfolioItemId: id,
    saves: 1,
    savesSince: 1,
    lastSavedAt: '2026-08-20T00:00:00Z',
  }))
}

export async function markSavesSeen(): Promise<void> {}

export async function fetchSavesSeenAt(): Promise<string | null> {
  return null
}
