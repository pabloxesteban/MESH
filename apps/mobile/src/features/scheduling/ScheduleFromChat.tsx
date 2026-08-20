/**
 * Dar un turno desde el chat.
 *
 * Es el flujo que se pidió: primero hablan, y de esa conversación sale el
 * turno. Por eso vive acá adentro y no en una pantalla de reservas — la charla
 * es el contexto, y sacarlo de ahí obligaría al artista a acordarse de con
 * quién estaba hablando.
 *
 * **Solo lo ve el artista.** El cliente ve el turno cuando ya está dado; no
 * tiene un botón para agendarse solo. Ver ADR-018.
 *
 * Los horarios que se ofrecen son los que están libres de verdad: regla del
 * día, menos las excepciones, menos lo que ya está tomado, menos lo que ya
 * pasó si el día es hoy.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView } from 'react-native'

import {
  Box,
  Button,
  FilterChip,
  Text,
  spacing,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { atMinutes, freeStartsFor, isoDate, toHm } from './day.ts'
import {
  fetchBusySlots,
  fetchExceptions,
  fetchWeeklyRules,
  scheduleAppointment,
} from './queries.ts'

/** Cuántos días hacia adelante se ofrecen. Dos semanas alcanzan para acordar. */
const DIAS_ADELANTE = 14

/** Duraciones posibles, en minutos. Las que un tatuaje realmente ocupa. */
const DURACIONES = [60, 120, 180, 240]

/** Cada cuánto se ofrece un comienzo. */
const PASO = 30

export interface ScheduleFromChatProps {
  conversationId: string
  professionalId: string
  onScheduled: () => void
}

export function ScheduleFromChat({
  conversationId,
  professionalId,
  onScheduled,
}: ScheduleFromChatProps) {
  const t = useT()
  const client = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [dia, setDia] = useState(0)
  const [duracion, setDuracion] = useState(120)
  const [error, setError] = useState<TranslationKey | null>(null)

  const hoy = new Date()
  const dias = Array.from({ length: DIAS_ADELANTE }, (_, i) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() + i)
    return d
  })
  const elegido = dias[dia] ?? hoy

  const reglas = useQuery({
    queryKey: ['weekly-rules', professionalId],
    queryFn: () => fetchWeeklyRules(professionalId),
    enabled: abierto,
  })

  const excepciones = useQuery({
    queryKey: ['exceptions', professionalId],
    queryFn: () => fetchExceptions(professionalId, isoDate(hoy)),
    enabled: abierto,
  })

  const ocupados = useQuery({
    queryKey: ['busy', professionalId, isoDate(elegido)],
    queryFn: () => {
      const desde = new Date(elegido)
      desde.setHours(0, 0, 0, 0)
      const hasta = new Date(desde)
      hasta.setDate(hasta.getDate() + 1)
      return fetchBusySlots(professionalId, desde, hasta)
    },
    enabled: abierto,
  })

  const dar = useMutation({
    mutationFn: (start: number) =>
      scheduleAppointment(
        conversationId,
        atMinutes(elegido, start),
        atMinutes(elegido, start + duracion),
        null,
      ),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(`schedule.error.${result.reason}` as TranslationKey)
        // El caso que importa: alguien más tomó ese horario mientras esta
        // pantalla estaba abierta. Se vuelven a pedir los ocupados para que la
        // lista deje de ofrecer un horario que ya no está.
        void client.invalidateQueries({ queryKey: ['busy', professionalId] })
        return
      }
      setError(null)
      setAbierto(false)
      void client.invalidateQueries({ queryKey: ['appointments'] })
      void client.invalidateQueries({ queryKey: ['busy', professionalId] })
      onScheduled()
    },
  })

  if (!abierto) {
    return (
      <Button
        label={t('schedule.title')}
        variant="secondary"
        size="sm"
        onPress={() => setAbierto(true)}
        testID="schedule-open"
      />
    )
  }

  const libres = freeStartsFor({
    day: elegido,
    rules: reglas.data ?? [],
    exceptions: excepciones.data ?? [],
    busy: ocupados.data ?? [],
    duration: duracion,
    step: PASO,
    now: hoy,
  })

  return (
    <Box gap="sm" testID="schedule-sheet">
      <Text role="label" color="textSecondary">
        {t('schedule.pickDay')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xxs }}
      >
        {dias.map((d, i) => (
          <FilterChip
            key={isoDate(d)}
            label={`${d.getDate()}/${d.getMonth() + 1}`}
            selected={dia === i}
            onToggle={() => setDia(i)}
            testID={`schedule-day-${isoDate(d)}`}
          />
        ))}
      </ScrollView>

      <Text role="label" color="textSecondary">
        {t('schedule.duration')}
      </Text>
      <Box direction="row" gap="xxs" wrap>
        {DURACIONES.map((d) => (
          <FilterChip
            key={d}
            label={t('schedule.hours', { n: String(d / 60) })}
            selected={duracion === d}
            onToggle={() => setDuracion(d)}
            testID={`schedule-duration-${d}`}
          />
        ))}
      </Box>

      <Text role="label" color="textSecondary">
        {t('schedule.pickTime')}
      </Text>
      {libres.length === 0 ? (
        <Text role="body" color="textTertiary" testID="schedule-no-slots">
          {t('schedule.noSlots')}
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xxs }}
        >
          {libres.map((start) => (
            <FilterChip
              key={start}
              label={toHm(start)}
              selected={false}
              onToggle={() => dar.mutate(start)}
              testID={`schedule-slot-${toHm(start)}`}
            />
          ))}
        </ScrollView>
      )}

      {error != null ? (
        <Text role="body" color="stateNegative" accessibilityRole="alert">
          {t(error)}
        </Text>
      ) : null}

      <Button
        label={t('common.cancel')}
        variant="ghost"
        size="sm"
        onPress={() => {
          setAbierto(false)
          setError(null)
        }}
        testID="schedule-close"
      />
    </Box>
  )
}
