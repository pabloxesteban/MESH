/**
 * Guardados en el preview: en memoria y sin red.
 *
 * El preview no tiene sesión ni Supabase, así que guardar vive en un Map que se
 * pierde al recargar. Alcanza para lo que el preview sirve: mirar el corazón
 * lleno y vacío en una pantalla de teléfono real.
 */

import { PREVIEW_ARTISTS, artistOfPiece } from '../../../preview/store.ts'
import type { SavedPiece } from './queries.ts'

const guardados = new Set<string>()

export async function fetchSavedIds(): Promise<ReadonlySet<string>> {
  return new Set(guardados)
}

export async function fetchSaved(): Promise<readonly SavedPiece[]> {
  const piezas: SavedPiece[] = []
  for (const artista of PREVIEW_ARTISTS) {
    for (const pieza of artista.pieces) {
      if (!guardados.has(pieza.id)) continue
      const dueno = artistOfPiece(pieza.id) ?? artista
      piezas.push({
        // En el preview no hay una fila de `saved_items` separada de la
        // pieza: el id de la obra hace las veces de las dos cosas, igual que
        // `mediaPath` más abajo.
        savedItemId: pieza.id,
        portfolioItemId: pieza.id,
        savedAt: '2026-08-20T00:00:00Z',
        // En el preview la ruta ES el id de la pieza. Ver `previewMediaUrl`.
        mediaPath: pieza.id,
        // El catálogo del preview trae la imagen entera embebida; no hay
        // blurhash porque no hay nada que esperar.
        blurhash: null,
        width: pieza.width,
        height: pieza.height,
        professionalSlug: dueno.slug,
        professionalName: dueno.displayName,
        isFixture: dueno.isFixture,
      })
    }
  }
  return piezas
}

export async function savePiece(
  _userId: string,
  portfolioItemId: string,
): Promise<void> {
  guardados.add(portfolioItemId)
}

export async function unsavePiece(portfolioItemId: string): Promise<void> {
  guardados.delete(portfolioItemId)
}
