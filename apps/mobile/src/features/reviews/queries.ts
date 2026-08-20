/**
 * Reseñas, contra la base.
 *
 * Tres cosas distintas y conviene no confundirlas:
 *
 * - **Leer las de un perfil** sale de `get_reviews()`, que devuelve columnas
 *   elegidas a mano y **nunca dice quién escribió cada una**. La tabla no se
 *   lee directo: la fila tiene `user_id`.
 * - **El promedio** sale de `get_review_summary()`, y se calcula al leer. No
 *   hay ningún contador guardado que se pueda desincronizar.
 * - **Escribir** es un insert normal, y el candado está en la política: hace
 *   falta un turno propio, con ese artista, que ya haya pasado.
 *
 * Ver ADR-019.
 */

import { supabase } from '../../data/supabase.ts'

export interface Review {
  readonly id: string
  readonly rating: number
  readonly body: string | null
  readonly mediaPath: string | null
  /** Cuándo fue el turno. Es la fecha que da garantía, no la de la reseña. */
  readonly appointmentEndsAt: string
  readonly createdAt: string
  readonly edited: boolean
}

export interface ReviewSummary {
  readonly count: number
  /** `null` cuando no hay ninguna. Un 0 se dibujaría como cero estrellas. */
  readonly average: number | null
}

/** Un turno propio que ya pasó y todavía no tiene reseña. */
export interface ReviewableAppointment {
  readonly appointmentId: string
  readonly professionalId: string
  readonly professionalSlug: string
  readonly professionalName: string
  readonly conversationId: string | null
  readonly endsAt: string
}

export async function fetchReviews(
  professionalId: string,
): Promise<readonly Review[]> {
  const { data, error } = await supabase.rpc('get_reviews', {
    p_professional_id: professionalId,
  })
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    rating: row.rating,
    body: row.body,
    mediaPath: row.media_path,
    appointmentEndsAt: row.appointment_ends_at,
    createdAt: row.created_at,
    edited: row.edited,
  }))
}

export async function fetchReviewSummary(
  professionalId: string,
): Promise<ReviewSummary> {
  const { data, error } = await supabase.rpc('get_review_summary', {
    p_professional_id: professionalId,
  })
  if (error != null) throw error

  const row = (data ?? [])[0]
  if (row == null) return { count: 0, average: null }
  return { count: row.reviews_count, average: row.average }
}

/**
 * Los turnos que esta persona puede reseñar.
 *
 * Se pregunta a la base en vez de repetir el candado acá: "quién puede
 * reseñar" vive en la política de `reviews`, y una segunda copia en TypeScript
 * es una copia que se va a desactualizar.
 */
export async function fetchReviewableAppointments(): Promise<
  readonly ReviewableAppointment[]
> {
  const { data, error } = await supabase.rpc('get_reviewable_appointments')
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    appointmentId: row.appointment_id,
    professionalId: row.professional_id,
    professionalSlug: row.professional_slug,
    professionalName: row.professional_display_name,
    conversationId: row.conversation_id,
    endsAt: row.ends_at,
  }))
}

export async function createReview(input: {
  appointmentId: string
  professionalId: string
  userId: string
  rating: number
  body: string | null
  mediaId: string | null
}): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    appointment_id: input.appointmentId,
    professional_id: input.professionalId,
    user_id: input.userId,
    rating: input.rating,
    body: input.body,
    media_id: input.mediaId,
  })
  if (error != null) throw error
}

/** La URL pública de la foto de una reseña. El bucket es de lectura pública. */
export function reviewMediaUrl(path: string): string {
  return supabase.storage.from('reviews').getPublicUrl(path).data.publicUrl
}
