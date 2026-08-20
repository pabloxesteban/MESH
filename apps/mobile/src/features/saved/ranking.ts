/**
 * Lo más guardado.
 *
 * Dos ventanas, semana y mes, y un conteo que es un hecho medido. **No hay
 * puesto, ni medalla, ni "subió tres lugares"**: el orden ya es el ranking, y
 * lo demás es la maquinaria que convierte una lista en un juego. Ver ADR-017.
 *
 * El agregado es público; quién guardó no lo es. Ninguna de estas consultas
 * devuelve una identidad, y la RPC tampoco tiene la columna — hay un test de
 * pgTAP que falla si alguien se la agrega.
 */

import { supabase } from '../../data/supabase.ts'

export type RankingWindow = 'week' | 'month'

export interface RankedPiece {
  readonly portfolioItemId: string
  readonly saves: number
  readonly professionalSlug: string
  readonly professionalName: string
  readonly isFixture: boolean
  readonly mediaPath: string
  readonly blurhash: string | null
  readonly width: number | null
  readonly height: number | null
}

const DIAS: Record<RankingWindow, number> = { week: 7, month: 30 }

/**
 * Desde cuándo cuenta una ventana.
 *
 * Pura y exportada para poder testearla: es la única parte del ranking donde
 * un error no se ve —una ventana de 7 días que en realidad son 8 devuelve algo
 * verosímil y equivocado— y donde además hay que pensar en zonas horarias.
 */
export function windowStart(window: RankingWindow, now: Date): Date {
  const desde = new Date(now.getTime())
  desde.setUTCDate(desde.getUTCDate() - (DIAS[window] ?? 7))
  return desde
}

export async function fetchTopSaved(
  categorySlug: string,
  window: RankingWindow,
  now: Date = new Date(),
): Promise<readonly RankedPiece[]> {
  const { data, error } = await supabase.rpc('get_top_saved', {
    p_category_slug: categorySlug,
    p_since: windowStart(window, now).toISOString(),
  })
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    portfolioItemId: row.portfolio_item_id,
    saves: row.saves,
    professionalSlug: row.professional_slug,
    professionalName: row.professional_display_name,
    isFixture: row.is_fixture,
    mediaPath: row.media_path,
    blurhash: row.media_blurhash,
    width: row.media_width,
    height: row.media_height,
  }))
}

export interface OwnSaveCount {
  readonly portfolioItemId: string
  readonly saves: number
  /** Cuántos de esos son nuevos desde la última vez que el artista miró. */
  readonly savesSince: number
  readonly lastSavedAt: string | null
}

/** Los guardados de la obra PROPIA. Nunca dice quién. */
export async function fetchOwnSaveCounts(
  since: string | null,
): Promise<readonly OwnSaveCount[]> {
  // `p_since` se omite en vez de mandarse en `null`: con
  // `exactOptionalPropertyTypes` no son lo mismo, y el default de la función
  // ya hace lo correcto — contar todo como nuevo la primera vez.
  const { data, error } = await supabase.rpc(
    'get_own_save_counts',
    since == null ? {} : { p_since: since },
  )
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    portfolioItemId: row.portfolio_item_id,
    saves: row.saves,
    savesSince: row.saves_since,
    lastSavedAt: row.last_saved_at,
  }))
}

export async function markSavesSeen(): Promise<void> {
  const { error } = await supabase.rpc('mark_saves_seen')
  if (error != null) throw error
}

/** Cuándo miró por última vez. `null` la primera vez. */
export async function fetchSavesSeenAt(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('saves_seen_at')
    .eq('id', userId)
    .maybeSingle()
  if (error != null) throw error
  return data?.saves_seen_at ?? null
}
