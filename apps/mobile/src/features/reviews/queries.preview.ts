/**
 * Reseñas en el preview: en memoria y sin red.
 *
 * Arranca sin ninguna, a propósito: el estado vacío del perfil —"todavía nadie
 * dejó una reseña"— es exactamente la mitad que hay que poder mirar, y un
 * preview con reseñas horneadas serían testimonios inventados sobre personas
 * inventadas. Ver el innegociable 2.
 *
 * Lo que el preview NO prueba es lo único que importa de seguridad: que solo
 * pueda reseñar quien tuvo un turno. Eso lo decide la política de `reviews` y
 * está en `supabase/tests/51_reviews.sql`.
 */

import {
  addPreviewReview,
  artistBySlug,
  previewMediaUrl,
  previewReviewableAppointments,
  previewReviewSummaryOf,
  previewReviewsOf,
  previewSlugOfProfessional,
} from '../../../preview/store.ts'

import type { Review, ReviewSummary, ReviewableAppointment } from './queries.ts'

export async function fetchReviews(
  professionalId: string,
): Promise<readonly Review[]> {
  return previewReviewsOf(professionalId).map((review) => ({
    id: review.id,
    rating: review.rating,
    body: review.body,
    mediaPath: review.mediaPath,
    appointmentEndsAt: review.appointmentEndsAt,
    createdAt: review.createdAt,
    // Editar una reseña todavía no tiene pantalla, así que en el preview
    // ninguna está editada. Cuando la tenga, esto se llena de verdad.
    edited: false,
  }))
}

export async function fetchReviewSummary(
  professionalId: string,
): Promise<ReviewSummary> {
  return previewReviewSummaryOf(professionalId)
}

export async function fetchReviewableAppointments(): Promise<
  readonly ReviewableAppointment[]
> {
  return previewReviewableAppointments().map((turno) => {
    const slug = previewSlugOfProfessional(turno.professionalId)
    return {
      appointmentId: turno.appointmentId,
      professionalId: turno.professionalId,
      professionalSlug: slug,
      professionalName: artistBySlug(slug)?.displayName ?? slug,
      conversationId: turno.conversationId,
      endsAt: turno.endsAt,
    }
  })
}

export async function createReview(input: {
  appointmentId: string
  professionalId: string
  userId: string
  rating: number
  body: string | null
  mediaId: string | null
}): Promise<void> {
  addPreviewReview({
    appointmentId: input.appointmentId,
    professionalId: input.professionalId,
    rating: input.rating,
    body: input.body,
    // En el preview la ruta ES el id de la media. Ver `previewMediaUrl`.
    mediaPath: input.mediaId,
  })
}

export { previewMediaUrl as reviewMediaUrl }
