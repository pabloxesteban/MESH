/**
 * El almanaque en el perfil, para quien mira.
 *
 * Muestra **cuántos horarios le quedan libres** los próximos días, no cuáles ni
 * con quién está ocupado. Ver el almanaque y ver la agenda son cosas distintas
 * — un hueco tomado no dice de quién es. Ver ADR-018.
 *
 * Y no hay botón de reservar: el turno sale de una charla, y el camino hacia
 * adelante desde acá sigue siendo escribirle. Esto contesta "¿tiene lugar esta
 * semana?" antes de mandar el mensaje, que es la pregunta que hoy se hace por
 * chat y tarda un día en responderse.
 *
 * Si el artista no publicó horarios, se dice — en vez de mostrar una semana
 * vacía que parece una agenda llena.
 */

import { useQuery } from '@tanstack/react-query'
import { ScrollView } from 'react-native'

import { Box, Text, spacing } from '@/design-system/index.ts'
import { useI18n } from '@/i18n/I18nProvider.tsx'

import { freeStartsFor, isoDate } from './day.ts'
import { fetchBusySlots, fetchExceptions, fetchWeeklyRules } from './queries.ts'

/** Una semana. Más adelante no ayuda a decidir si escribir hoy. */
const DIAS = 7

/** La duración con la que se cuenta un hueco. Dos horas es un tatuaje chico. */
const DURACION = 120
const PASO = 60

export interface PublicCalendarProps {
  professionalId: string
}

export function PublicCalendar({ professionalId }: PublicCalendarProps) {
  const { t, locale } = useI18n()
  const hoy = new Date()

  const reglas = useQuery({
    queryKey: ['weekly-rules', professionalId],
    queryFn: () => fetchWeeklyRules(professionalId),
  })

  const excepciones = useQuery({
    queryKey: ['exceptions', professionalId],
    queryFn: () => fetchExceptions(professionalId, isoDate(hoy)),
  })

  const ocupados = useQuery({
    queryKey: ['busy-week', professionalId, isoDate(hoy)],
    queryFn: () => {
      const hasta = new Date(hoy)
      hasta.setDate(hasta.getDate() + DIAS)
      return fetchBusySlots(professionalId, hoy, hasta)
    },
  })

  // Mientras carga no se dibuja: es una sección de más en una pantalla que ya
  // dice bastante, y un esqueleto acá empuja la obra fuera de la vista.
  if (reglas.data == null) return null

  if (reglas.data.length === 0) {
    return (
      <Box gap="xxs" testID="public-calendar-empty">
        <Text role="label" color="textSecondary">
          {t('calendar.title')}
        </Text>
        <Text role="body" color="textTertiary">
          {t('calendar.empty')}
        </Text>
      </Box>
    )
  }

  const dias = Array.from({ length: DIAS }, (_, i) => {
    const dia = new Date(hoy)
    dia.setDate(dia.getDate() + i)
    const libres = freeStartsFor({
      day: dia,
      rules: reglas.data,
      exceptions: excepciones.data ?? [],
      busy: ocupados.data ?? [],
      duration: DURACION,
      step: PASO,
      now: hoy,
    })
    return { dia, libres: libres.length }
  })

  return (
    <Box gap="xs" testID="public-calendar">
      <Text role="label" color="textSecondary">
        {t('calendar.title')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {dias.map(({ dia, libres }) => (
          <Box key={isoDate(dia)} gap="xxs" testID={`calendar-${isoDate(dia)}`}>
            <Text role="label">
              {dia.toLocaleDateString(locale, { weekday: 'short' })}
            </Text>
            <Text role="micro" color="textTertiary">
              {dia.getDate()}
            </Text>
            {/* El número de huecos, no los horarios: cuáles son se acuerdan
                hablando, que es de donde sale el turno. */}
            <Text role="micro" color={libres > 0 ? 'accent' : 'textTertiary'}>
              {libres > 0 ? t('calendar.free', { n: String(libres) }) : '—'}
            </Text>
          </Box>
        ))}
      </ScrollView>
    </Box>
  )
}
