/**
 * Las reseñas en el perfil del artista.
 *
 * Es lo que alguien viene a mirar antes de escribirle a un desconocido para que
 * le haga algo permanente en el cuerpo.
 *
 * Tres cosas que este componente NO hace, y las tres a propósito:
 *
 * · **No inventa un promedio cuando no hay reseñas.** Sin ninguna, lo dice con
 *   palabras. Cinco estrellas vacías se leen como una puntuación de cero, y un
 *   "5,0" sobre cero reseñas es una mentira redonda.
 * · **No dice quién escribió cada una.** La RPC no lo devuelve. Lo que da
 *   garantía es que **hubo un turno**, con fecha, y eso sí se muestra.
 * · **No ordena por "más útil" ni destaca ninguna.** De la más nueva a la más
 *   vieja. Cualquier orden con criterio propio es el lugar donde después se
 *   esconde la mala.
 */

import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'

import { View } from 'react-native'

import {
  Box,
  HAIRLINE,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useI18n } from '@/i18n/I18nProvider.tsx'

import { Stars } from './Stars.tsx'
import {
  fetchReviewSummary,
  fetchReviews,
  reviewMediaUrl,
  type Review,
} from './queries.ts'

import { SafetyRow } from '@/features/moderation/SafetyRow.tsx'

export interface ReviewListProps {
  professionalId: string
  /** Quién mira. Sin sesión no se ofrece denunciar: no hay a quién colgarla. */
  userId?: string | null | undefined
}

export function ReviewList({ professionalId, userId }: ReviewListProps) {
  const { t } = useI18n()

  const resumen = useQuery({
    queryKey: ['reviews', 'summary', professionalId],
    queryFn: () => fetchReviewSummary(professionalId),
  })

  const reviews = useQuery({
    queryKey: ['reviews', 'list', professionalId],
    queryFn: () => fetchReviews(professionalId),
  })

  // Mientras carga no se dibuja nada: es una sección más en una pantalla que ya
  // dice bastante, y un esqueleto acá empuja la obra fuera de la vista.
  if (resumen.data == null) return null

  if (resumen.data.count === 0) {
    return (
      <Box gap="xxs" testID="reviews-empty">
        <Text role="label" color="textSecondary">
          {t('reviews.title')}
        </Text>
        <Text role="body" color="textTertiary">
          {t('reviews.empty')}
        </Text>
      </Box>
    )
  }

  return (
    <Box gap="sm" testID="reviews">
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('reviews.title')}
        </Text>
        <Box direction="row" gap="xs" align="center">
          <Stars
            value={Math.round(resumen.data.average ?? 0)}
            testID="reviews-average-stars"
          />
          {/* Una clave por número y no un motor de plurales: son dos casos, y
              "1 reseñas" es de las cosas que hacen que un producto parezca
              hecho a las apuradas. */}
          <Text role="body" testID="reviews-average">
            {t(
              resumen.data.count === 1
                ? 'reviews.summary.one'
                : 'reviews.summary',
              {
                promedio: formatAverage(resumen.data.average),
                n: String(resumen.data.count),
              },
            )}
          </Text>
        </Box>
      </Box>

      <Box gap="sm">
        {(reviews.data ?? []).map((review) => (
          <ReviewRow key={review.id} review={review} userId={userId ?? null} />
        ))}
      </Box>
    </Box>
  )
}

/**
 * El promedio con una coma decimal, como se escribe acá.
 *
 * Postgres devuelve `numeric`, que llega como número o como string según el
 * driver. Se normaliza en un solo lugar.
 */
function formatAverage(average: number | null): string {
  if (average == null) return '—'
  return String(average).replace('.', ',')
}

function ReviewRow({
  review,
  userId,
}: {
  review: Review
  userId: string | null
}) {
  const { t, locale } = useI18n()
  const theme = useTheme()

  return (
    // `View` y no `Box`: hace falta un borde superior, y `Box` no toma estilos
    // crudos a propósito. Los valores igual salen de tokens.
    <View
      testID={`review-${review.id}`}
      style={{
        gap: spacing.xs,
        borderTopWidth: HAIRLINE,
        borderTopColor: theme.borderSubtle,
        paddingTop: spacing.sm,
      }}
    >
      <Box direction="row" gap="xs" align="center">
        <Stars value={review.rating} />
        {/* La fecha del TURNO, no la de la reseña: lo que da garantía es que
            hubo un turno ese día. */}
        <Text role="micro" color="textTertiary">
          {t('reviews.when', {
            fecha: new Date(review.appointmentEndsAt).toLocaleDateString(
              locale,
              { day: 'numeric', month: 'long', year: 'numeric' },
            ),
          })}
        </Text>
      </Box>

      {review.body != null ? <Text role="body">{review.body}</Text> : null}

      {review.mediaPath != null ? (
        <Image
          source={{ uri: reviewMediaUrl(review.mediaPath) }}
          style={{ width: '100%', height: 220, borderRadius: radius.md }}
          contentFit="cover"
          accessibilityLabel={t('reviews.photo')}
        />
      ) : null}

      {/* Editada se dice. Una reseña que se puede reescribir sin que se note es
          peor evidencia que una que no se puede editar. */}
      {review.edited ? (
        <Text role="micro" color="textTertiary">
          {t('reviews.edited')}
        </Text>
      ) : null}

      {/* Una reseña se denuncia pero no se bloquea: quien la escribió es
          anónimo para todos, incluido el artista, así que no hay a quién
          bloquear. Ver ADR-019 y ADR-023. */}
      <SafetyRow
        userId={userId}
        target={{ kind: 'review', reviewId: review.id }}
      />
    </View>
  )
}
