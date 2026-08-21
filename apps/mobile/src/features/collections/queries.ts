/**
 * Colecciones: una etiqueta sobre lo ya guardado, nunca un lugar nuevo.
 *
 * Separado de `features/saved/queries.ts` a propósito, aunque las dos hablen de
 * lo mismo: colecciones tiene su propio perímetro de RLS —`collections` y
 * `collection_items`, ninguna con `user_id` directo en la segunda— y su propia
 * pantalla. Mezclarlas obligaría a leer "guardar una obra" para entender "crear
 * una colección". Ver ADR-030.
 *
 * **"Todo" no vive acá.** No es una fila de `collections`, así que no hay
 * `fetchAll()`: es `fetchSaved()` de `features/saved/queries.ts`, sin ningún
 * filtro de colección encima. Modelarla como una colección especial que no se
 * puede borrar sería la clase de excepción que un día alguien rompe con un
 * DELETE que no debería poder correr.
 */

import { supabase } from '../../data/supabase.ts'
import type { SavedPiece } from '../saved/queries.ts'

export interface CollectionSummary {
  readonly id: string
  readonly name: string
  readonly createdAt: string
  readonly itemCount: number
  /** Hasta 4 rutas de portada, las últimas obras agregadas. Nunca se repiten. */
  readonly coverMediaPaths: readonly string[]
}

/**
 * Mis colecciones, con conteo y portadas, en un solo round trip.
 *
 * `get_my_collections()` ya hace el join colección → pertenencia → obra →
 * media agregado por colección — exactamente el caso que
 * `system-architecture.md` §4/§6 pide resolver con un RPC en vez de que el
 * cliente lo arme a mano.
 */
export async function fetchMyCollections(): Promise<
  readonly CollectionSummary[]
> {
  const { data, error } = await supabase.rpc('get_my_collections')
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    itemCount: row.item_count,
    coverMediaPaths: row.cover_media_paths ?? [],
  }))
}

/**
 * Crea una colección. Devuelve su id para poder aterrizar adentro.
 *
 * El cliente manda `user_id` explícito, mismo patrón que `savePiece`: no hay
 * valor por default que lo derive de `auth.uid()` del lado de la política.
 */
export async function createCollection(
  userId: string,
  name: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('collections')
    .insert({ user_id: userId, name })
    .select('id')
    .single()

  if (error != null || data == null) {
    throw error ?? new Error('no se pudo crear la colección')
  }
  return data.id
}

/**
 * Borra la colección. El cascade de `collection_items` lo resuelve Postgres
 * solo — la obra sigue guardada, ahora solo visible en "Todo".
 */
export async function deleteCollection(collectionId: string): Promise<void> {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId)
  if (error != null) throw error
}

interface CollectionItemRow {
  created_at: string
  saved_items: {
    id: string
    portfolio_item_id: string
    portfolio_items: {
      media_assets: {
        path: string
        blurhash: string | null
        width: number | null
        height: number | null
      } | null
      professionals: {
        slug: string
        display_name: string
        is_fixture: boolean
      } | null
    } | null
  } | null
}

/**
 * La obra de una colección, con lo necesario para dibujarla.
 *
 * Mismo shape que `fetchSaved()` — reutiliza `SavedPiece` — pero uniendo por
 * `collection_items.collection_id` en vez de traer todo lo guardado. `savedAt`
 * acá es cuándo se agregó ESTA obra a ESTA colección (el índice
 * `collection_items_collection_idx` ya ordena por eso), no cuándo se guardó
 * originalmente.
 */
export async function fetchCollectionItems(
  collectionId: string,
): Promise<readonly SavedPiece[]> {
  const { data, error } = await supabase
    .from('collection_items')
    .select(
      `created_at,
       saved_items ( id, portfolio_item_id,
         portfolio_items ( media_assets ( path, blurhash, width, height ),
                           professionals ( slug, display_name, is_fixture ) ) )`,
    )
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false })
  if (error != null) throw error

  return ((data ?? []) as unknown as CollectionItemRow[])
    .map((row): SavedPiece | null => {
      const saved = row.saved_items
      const media = saved?.portfolio_items?.media_assets
      const pro = saved?.portfolio_items?.professionals
      if (saved == null || media == null || pro == null) return null
      return {
        savedItemId: saved.id,
        portfolioItemId: saved.portfolio_item_id,
        savedAt: row.created_at,
        mediaPath: media.path,
        blurhash: media.blurhash,
        width: media.width,
        height: media.height,
        professionalSlug: pro.slug,
        professionalName: pro.display_name,
        isFixture: pro.is_fixture,
      }
    })
    .filter((piece): piece is SavedPiece => piece != null)
}

/** En qué colecciones está una obra guardada. Para el sheet de pertenencia. */
export async function fetchCollectionsForItem(
  savedItemId: string,
): Promise<ReadonlySet<string>> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('collection_id')
    .eq('saved_item_id', savedItemId)
  if (error != null) throw error
  return new Set((data ?? []).map((row) => row.collection_id))
}

/**
 * Agrega una obra a una colección.
 *
 * Insert idempotente, mismo patrón que `savePiece`: la clave primaria es
 * `(collection_id, saved_item_id)`, así que un 23505 significa "ya estaba" y
 * no es un error que mostrar.
 */
export async function addToCollection(
  collectionId: string,
  savedItemId: string,
): Promise<void> {
  const { error } = await supabase
    .from('collection_items')
    .insert({ collection_id: collectionId, saved_item_id: savedItemId })
  if (error != null && error.code !== '23505') throw error
}

/**
 * Saca una obra de una colección. Nunca toca `saved_items`: la obra sigue
 * guardada, solo deja de estar etiquetada con esta colección.
 */
export async function removeFromCollection(
  collectionId: string,
  savedItemId: string,
): Promise<void> {
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('saved_item_id', savedItemId)
  if (error != null) throw error
}
