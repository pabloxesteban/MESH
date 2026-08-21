/**
 * Colecciones en el preview: en memoria y sin red.
 *
 * Mismo criterio que `saved/queries.preview.ts`: alcanza para crear una
 * colección, sumarle obra de lo ya guardado, sacarla y borrar la colección
 * entera, todo en esta sesión.
 *
 * El import de `../saved/queries.ts` se resuelve a su hermano `.preview.ts` en
 * tiempo de bundle (ver `metro.config.js`), así que lo que se lee acá es
 * exactamente lo que el corazón de esta misma sesión de preview guardó.
 */

import { fetchSaved } from '../saved/queries.ts'
import type { SavedPiece } from '../saved/queries.ts'
import type { CollectionSummary } from './queries.ts'

interface PreviewCollection {
  readonly id: string
  name: string
  readonly createdAt: string
  readonly itemIds: string[]
}

const collections: PreviewCollection[] = []
let counter = 0

export async function fetchMyCollections(): Promise<
  readonly CollectionSummary[]
> {
  const saved = await fetchSaved()
  const bySavedId = new Map(saved.map((piece) => [piece.savedItemId, piece]))

  return [...collections]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((collection) => {
      const pieces = collection.itemIds
        .map((id) => bySavedId.get(id))
        .filter((piece): piece is SavedPiece => piece != null)
      return {
        id: collection.id,
        name: collection.name,
        createdAt: collection.createdAt,
        itemCount: pieces.length,
        coverMediaPaths: pieces.slice(0, 4).map((piece) => piece.mediaPath),
      }
    })
}

export async function createCollection(
  _userId: string,
  name: string,
): Promise<string> {
  counter += 1
  const id = `preview-collection-${String(counter)}`
  // Un contador y no un reloj: dos corridas del preview tienen que ordenar
  // igual. Mismo criterio que el resto de `preview/store.ts`.
  collections.unshift({
    id,
    name,
    createdAt: `2026-08-21T00:00:${String(counter).padStart(2, '0')}Z`,
    itemIds: [],
  })
  return id
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const index = collections.findIndex((c) => c.id === collectionId)
  if (index !== -1) collections.splice(index, 1)
}

export async function fetchCollectionItems(
  collectionId: string,
): Promise<readonly SavedPiece[]> {
  const collection = collections.find((c) => c.id === collectionId)
  if (collection == null) return []
  const saved = await fetchSaved()
  const bySavedId = new Map(saved.map((piece) => [piece.savedItemId, piece]))
  return collection.itemIds
    .map((id) => bySavedId.get(id))
    .filter((piece): piece is SavedPiece => piece != null)
}

export async function fetchCollectionsForItem(
  savedItemId: string,
): Promise<ReadonlySet<string>> {
  return new Set(
    collections
      .filter((c) => c.itemIds.includes(savedItemId))
      .map((c) => c.id),
  )
}

export async function addToCollection(
  collectionId: string,
  savedItemId: string,
): Promise<void> {
  const collection = collections.find((c) => c.id === collectionId)
  if (collection == null) return
  if (!collection.itemIds.includes(savedItemId)) {
    collection.itemIds.unshift(savedItemId)
  }
}

export async function removeFromCollection(
  collectionId: string,
  savedItemId: string,
): Promise<void> {
  const collection = collections.find((c) => c.id === collectionId)
  if (collection == null) return
  const index = collection.itemIds.indexOf(savedItemId)
  if (index !== -1) collection.itemIds.splice(index, 1)
}
