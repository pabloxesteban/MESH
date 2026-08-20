/**
 * El horario semanal del artista, en el Estudio.
 *
 * **Un día a la vez, con tramos.** La alternativa era una grilla de siete
 * columnas por veinticuatro filas, que en 390pt no se puede tocar y que además
 * hace parecer que hay que llenar toda la semana. Acá el artista elige un día,
 * agrega "de 14 a 20", y listo — la mayoría trabaja el mismo horario varios
 * días, así que copiarlo es tocar tres veces.
 *
 * Los horarios salen de una lista y no de un teclado: nadie escribe "14:00"
 * más rápido de lo que lo elige, y un campo libre acepta "25:70". Ver ADR-018.
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

import { toHm, toMinutes } from './day.ts'
import {
  addWeeklyRule,
  fetchWeeklyRules,
  removeWeeklyRule,
  type WeeklyRule,
} from './queries.ts'

/** De lunes a domingo. Se muestra empezando el lunes; se guarda 0 = domingo. */
const DIAS: ReadonlyArray<{ weekday: number; key: TranslationKey }> = [
  { weekday: 1, key: 'day.mon' },
  { weekday: 2, key: 'day.tue' },
  { weekday: 3, key: 'day.wed' },
  { weekday: 4, key: 'day.thu' },
  { weekday: 5, key: 'day.fri' },
  { weekday: 6, key: 'day.sat' },
  { weekday: 0, key: 'day.sun' },
]

/** De 8 a 22, de a media hora. Cubre cualquier estudio sin ser una lista infinita. */
const HORAS = Array.from({ length: 29 }, (_, i) => 8 * 60 + i * 30)

export interface AvailabilityEditorProps {
  professionalId: string
}

export function AvailabilityEditor({
  professionalId,
}: AvailabilityEditorProps) {
  const t = useT()
  const client = useQueryClient()
  const [dia, setDia] = useState(1)
  const [desde, setDesde] = useState<number | null>(null)

  const reglas = useQuery({
    queryKey: ['weekly-rules', professionalId],
    queryFn: () => fetchWeeklyRules(professionalId),
  })

  const refrescar = () =>
    client.invalidateQueries({ queryKey: ['weekly-rules', professionalId] })

  const agregar = useMutation({
    mutationFn: ({ start, end }: { start: number; end: number }) =>
      addWeeklyRule(professionalId, dia, toHm(start), toHm(end)),
    onSuccess: () => {
      setDesde(null)
      void refrescar()
    },
  })

  const borrar = useMutation({
    mutationFn: removeWeeklyRule,
    onSuccess: () => void refrescar(),
  })

  const delDia = (reglas.data ?? []).filter((r) => r.weekday === dia)

  return (
    <Box gap="sm" testID="availability-editor">
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('availability.title')}
        </Text>
        <Text role="label" color="textTertiary">
          {t('availability.hint')}
        </Text>
      </Box>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xxs }}
      >
        {DIAS.map((d) => (
          <FilterChip
            key={d.weekday}
            label={t(d.key)}
            selected={dia === d.weekday}
            onToggle={() => {
              setDia(d.weekday)
              setDesde(null)
            }}
            testID={`availability-day-${d.weekday}`}
          />
        ))}
      </ScrollView>

      {delDia.length === 0 ? (
        <Text role="body" color="textTertiary">
          {t('availability.closed')}
        </Text>
      ) : (
        <Box gap="xxs">
          {delDia.map((regla) => (
            <TramoCargado
              key={regla.id}
              rule={regla}
              onRemove={() => borrar.mutate(regla.id)}
            />
          ))}
        </Box>
      )}

      {/* Dos pasos, no un formulario: primero desde, después hasta. Con dos
          listas a la vez alguien elige un "hasta" anterior al "desde" y hay que
          explicarle por qué está mal. Así no se puede. */}
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t(desde == null ? 'availability.pickStart' : 'availability.pickEnd')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xxs }}
        >
          {HORAS.filter((h) => desde == null || h > desde).map((h) => (
            <FilterChip
              key={h}
              label={toHm(h)}
              selected={false}
              onToggle={() => {
                if (desde == null) setDesde(h)
                else agregar.mutate({ start: desde, end: h })
              }}
              testID={`availability-hour-${toHm(h)}`}
            />
          ))}
        </ScrollView>
        {desde != null ? (
          <Button
            label={t('common.cancel')}
            variant="ghost"
            size="sm"
            onPress={() => setDesde(null)}
            testID="availability-cancel"
          />
        ) : null}
      </Box>
    </Box>
  )
}

function TramoCargado({
  rule,
  onRemove,
}: {
  rule: WeeklyRule
  onRemove: () => void
}) {
  const t = useT()
  const horas = (toMinutes(rule.endsAt) - toMinutes(rule.startsAt)) / 60

  return (
    <Box
      direction="row"
      gap="xs"
      align="center"
      testID={`availability-rule-${rule.id}`}
    >
      <Text role="body">
        {t('availability.span', {
          desde: rule.startsAt,
          hasta: rule.endsAt,
          horas: String(horas),
        })}
      </Text>
      <Button
        label={t('availability.remove')}
        variant="ghost"
        size="sm"
        onPress={onRemove}
        testID={`availability-remove-${rule.id}`}
      />
    </Box>
  )
}
