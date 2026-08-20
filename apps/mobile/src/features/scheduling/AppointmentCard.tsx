/**
 * El turno, en el chat, para las dos partes.
 *
 * **Lo ven los dos y los dos pueden cancelar.** Que solo el artista pueda dar
 * el turno no significa que solo él pueda deshacerlo: a alguien le puede pasar
 * algo, y obligarlo a pedir por chat que le cancelen convierte un imprevisto en
 * un trámite.
 *
 * Cancelar libera el horario en el mismo instante —la restricción de exclusión
 * ignora los cancelados— pero la fila queda. Ver ADR-018.
 *
 * **Un turno que ya pasó no se cancela**, y por eso el botón desaparece. La
 * base también lo rechaza (ver ADR-019): cancelar el pasado sería la forma de
 * hacer desaparecer una reseña. En su lugar aparece dejarla, si quien mira es
 * quien se tatuó y todavía no la escribió.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { View } from 'react-native'

import {
  Button,
  HAIRLINE,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useI18n } from '@/i18n/I18nProvider.tsx'
import { LeaveReview } from '@/features/reviews/LeaveReview.tsx'

import { cancelAppointment, type Appointment } from './queries.ts'

export interface AppointmentCardProps {
  appointment: Appointment
  /**
   * Si este turno se puede reseñar. Lo dice la base —ver
   * `get_reviewable_appointments`— y no se recalcula acá: el candado de quién
   * puede reseñar vive en la política de `reviews`, y una segunda copia en
   * TypeScript es una copia que se desactualiza.
   */
  reviewable?: boolean
  /** Quién mira. Hace falta para escribir la reseña; `null` para el artista. */
  userId?: string | null
  testID?: string
}

export function AppointmentCard({
  appointment,
  reviewable = false,
  userId = null,
  testID,
}: AppointmentCardProps) {
  const { t, locale } = useI18n()
  const theme = useTheme()
  const client = useQueryClient()
  const [resenando, setResenando] = useState(false)

  const cancelar = useMutation({
    mutationFn: () => cancelAppointment(appointment.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['appointments'] })
      void client.invalidateQueries({ queryKey: ['busy'] })
    },
  })

  const cuando = new Date(appointment.startsAt)
  const hasta = new Date(appointment.endsAt)
  const yaPaso = hasta.getTime() < Date.now()

  /**
   * La hora en reloj de 24, siempre.
   *
   * Sin `hour12: false`, `es-AR` en algunos runtimes sale como "02:30 p. m." —
   * que nadie escribe acá, y que además se lee como las dos y media de la
   * mañana en el peor caso posible: el de un turno.
   */
  const hora = (fecha: Date) =>
    fecha.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

  return (
    <View
      testID={testID}
      style={{
        gap: spacing.xs,
        borderRadius: radius.md,
        borderWidth: HAIRLINE,
        borderColor: theme.borderSubtle,
        padding: spacing.sm,
      }}
    >
      <Text role="label" color="textSecondary">
        {t('appointment.title')}
      </Text>
      <Text role="body">
        {t('appointment.when', {
          fecha: cuando.toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }),
          // Con el hasta, no solo el desde: el artista eligió una duración y
          // quien recibe el turno necesita saber cuánto ocupa su tarde.
          desde: hora(cuando),
          hasta: hora(hasta),
        })}
      </Text>
      {appointment.note != null ? (
        <Text role="body" color="textSecondary">
          {appointment.note}
        </Text>
      ) : null}

      {yaPaso ? null : (
        <Button
          label={t('appointment.cancel')}
          variant="ghost"
          size="sm"
          loading={cancelar.isPending}
          onPress={() => cancelar.mutate()}
          testID="appointment-cancel"
        />
      )}

      {yaPaso && reviewable && userId != null ? (
        resenando ? (
          <LeaveReview
            appointmentId={appointment.id}
            professionalId={appointment.professionalId}
            userId={userId}
            onDone={() => setResenando(false)}
            onCancel={() => setResenando(false)}
          />
        ) : (
          <Button
            label={t('reviews.leave')}
            variant="secondary"
            size="sm"
            onPress={() => setResenando(true)}
            testID="appointment-review"
          />
        )
      ) : null}
    </View>
  )
}
