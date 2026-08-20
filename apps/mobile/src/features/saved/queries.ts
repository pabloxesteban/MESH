/**
 * Guardar una obra.
 *
 * `saved_items` es privada de punta a punta: RLS la filtra por `auth.uid()` y
 * no hay ninguna consulta que cuente corazones ajenos. El artista **no** ve
 * cuántas veces guardaron su obra — ver ADR-016 y `supabase/tests/48_saved_items.sql`,
 * donde eso es un test y no una promesa.
 *
 * Guardar y desguardar son insert y delete, no un booleano que se togglea. Un
 * `saved = false` deja la fila de alguien que se arrepintió, y esa fila es
 * exactamente la que después alguien cuenta como si fuera interés.
 */

import { supabase } from '../../data/supabase.ts'

export interface SavedPiece {
  readonly portfolioItemId: string
  readonly savedAt: string
  readonly mediaPath: string
  readonly blurhash: string | null
  readonly width: number | null
  readonly height: number | null
  readonly professionalSlug: string
  readonly professionalName: string
  readonly isFixture: boolean
}

interface SavedRow {
  portfolio_item_id: string
  created_at: string
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
}

/** Los ids que esta persona tiene guardados. Para dibujar el corazón. */
export async function fetchSavedIds(): Promise<ReadonlySet<string>> {
  const { data, error } = await supabase
    .from('saved_items')
    .select('portfolio_item_id')
  if (error != null) throw error
  return new Set((data ?? []).map((row) => row.portfolio_item_id))
}

/**
 * Lo guardado, con lo necesario para dibujarlo.
 *
 * Trae la obra y a quién pertenece en una sola consulta: la pantalla de
 * guardados tiene que poder llegar al artista desde cada obra, que es la regla
 * de toda la app — una grilla que no lleva a una persona sería otra cosa.
 */
export async function fetchSaved(): Promise<readonly SavedPiece[]> {
  const { data, error } = await supabase
    .from('saved_items')
    .select(
      `portfolio_item_id, created_at,
       portfolio_items ( media_assets ( path, blurhash, width, height ),
                         professionals ( slug, display_name, is_fixture ) )`,
    )
    .order('created_at', { ascending: false })
  if (error != null) throw error

  return ((data ?? []) as unknown as SavedRow[])
    .map((row): SavedPiece | null => {
      const media = row.portfolio_items?.media_assets
      const pro = row.portfolio_items?.professionals
      // Una obra sin media o sin artista no se puede dibujar ni abrir. Puede
      // pasar mientras se borra en cascada; se saltea en vez de romper.
      if (media == null || pro == null) return null
      return {
        portfolioItemId: row.portfolio_item_id,
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

export async function savePiece(
  userId: string,
  portfolioItemId: string,
): Promise<void> {
  const { error } = await supabase
    .from('saved_items')
    .insert({ user_id: userId, portfolio_item_id: portfolioItemId })
  // 23505 es el unique: ya estaba guardado. Que dos toques rápidos terminen en
  // "guardado" es el resultado correcto, no un error que mostrar.
  if (error != null && error.code !== '23505') throw error
}

export async function unsavePiece(portfolioItemId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('portfolio_item_id', portfolioItemId)
  if (error != null) throw error
}
