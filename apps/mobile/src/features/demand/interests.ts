/**
 * El otro lado del interés: quién levantó la mano ante una búsqueda propia.
 *
 * Vive en `features/demand` y no en `features/projects` porque es la misma
 * feature vista desde la otra punta — si el mazo del artista cambia lo que
 * manda, esto cambia con él.
 */

import { supabase } from '../../data/supabase.ts'

export interface SearchInterest {
  readonly interestId: string
  readonly projectId: string
  readonly projectTitle: string
  readonly professionalId: string
  readonly professionalSlug: string
  readonly professionalName: string
  readonly createdAt: string
  /**
   * La propuesta. **Nunca es null**: desde ADR-020 un interés sin rango de
   * precio y sin sesiones no existe — lo impide una restricción de la tabla, no
   * una validación de pantalla.
   */
  readonly priceMinCents: number
  readonly priceMaxCents: number
  readonly priceCurrency: string
  readonly sessions: number
  /** La condición, si la escribió: "estimado, lo confirmo al verte". */
  readonly note: string | null
  /** Una obra del artista, para poder decidir mirando y no leyendo. */
  readonly sampleMediaPath: string | null
}

/** Sin `projectId`, los de todas las búsquedas propias. */
export async function fetchSearchInterests(
  projectId?: string,
): Promise<readonly SearchInterest[]> {
  const { data, error } = await supabase.rpc('get_search_interests', {
    ...(projectId != null ? { p_project_id: projectId } : {}),
  })

  if (error != null) throw error

  return (data ?? []).map((row) => ({
    interestId: row.interest_id,
    projectId: row.project_id,
    projectTitle: row.project_title,
    professionalId: row.professional_id,
    professionalSlug: row.professional_slug,
    professionalName: row.professional_display_name,
    createdAt: row.created_at,
    priceMinCents: row.price_min_cents,
    priceMaxCents: row.price_max_cents,
    priceCurrency: row.price_currency,
    sessions: row.sessions,
    note: row.note,
    sampleMediaPath: row.sample_media_path,
  }))
}

/**
 * Descartar. La bandeja es de la persona y se limpia sin explicarle nada a
 * nadie: el artista no recibe aviso de que lo descartaron.
 */
export async function dismissInterest(interestId: string): Promise<void> {
  const { error } = await supabase
    .from('project_interests')
    .delete()
    .eq('id', interestId)

  if (error != null) throw error
}
