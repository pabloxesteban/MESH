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
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

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

import { cancelAppointment, type Appointment } from './queries.ts'

export interface AppointmentCardProps {
  appointment: Appointment
  testID?: string
}

export function AppointmentCard({ appointment, testID }: AppointmentCardProps) {
  const { t, locale } = useI18n()
  const theme = useTheme()
  const client = useQueryClient()

  const cancelar = useMutation({
    mutationFn: () => cancelAppointment(appointment.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['appointments'] })
      void client.invalidateQueries({ queryKey: ['busy'] })
    },
  })

  const cuando = new Date(appointment.startsAt)
  const hasta = new Date(appointment.endsAt)

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
      <Button
        label={t('appointment.cancel')}
        variant="ghost"
        size="sm"
        loading={cancelar.isPending}
        onPress={() => cancelar.mutate()}
        testID="appointment-cancel"
      />
    </View>
  )
}
