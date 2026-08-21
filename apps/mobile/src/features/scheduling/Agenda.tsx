/**
 * Tu semana.
 *
 * Lo que faltaba de ADR-018: hasta acá cada turno vivía adentro de la
 * conversación de la que salió, así que alguien con cinco tenía que abrir cinco
 * chats para saber cómo venía su semana. Un artista que usa MESH para
 * *conseguir* turnos y otra cosa para *manejarlos* es un artista que en algún
 * momento deja de abrir MESH.
 *
 * Cuatro decisiones:
 *
 * · **Agrupados por día, no una lista plana.** Lo que un artista mira no es
 *   "los próximos siete turnos" sino "cómo viene el jueves".
 * · **Sin turnos, no se dibuja nada.** Ni un calendario vacío ni un "todavía no
 *   tenés": el Estudio ya tiene bastante, y un hueco permanente arriba enseña a
 *   ignorar esa parte de la pantalla.
 * · **El nombre de la otra parte se muestra, y si no hay se dice.** Un turno con
 *   un identificador anónimo del otro lado no sirve para nada, y uno con un
 *   nombre inventado es peor.
 * · **Se entra al chat desde cada turno.** Es donde se cancela, donde se
 *   reseña, y donde están las palabras que lo armaron.
 */

import { useQuery } from '@tanstack/react-query'

import { Box, Button, Skeleton, Text } from '@/design-system/index.ts'
import { useI18n } from '@/i18n/I18nProvider.tsx'

import { fetchAgenda, type AgendaEntry } from './queries.ts'

export interface AgendaProps {
  /**
   * Abrir el chat del que salió el turno. Sin esto, cada fila no lleva a nada.
   *
   * Lleva también el nombre de la otra parte porque el chat lo necesita para su
   * encabezado, y acá ya lo tenemos: pedirlo de nuevo sería una consulta más
   * para un dato que está a la vista.
   */
  onOpenChat?:
    | ((conversationId: string, counterpartName: string | null) => void)
    | undefined
  /** Cuántos mostrar. Sin tope, todos los que vienen. */
  limit?: number | undefined
}

export function Agenda({ onOpenChat, limit }: AgendaProps) {
  const { t, locale } = useI18n()

  const agenda = useQuery({
    queryKey: ['agenda'],
    queryFn: fetchAgenda,
  })

  if (agenda.isPending) {
    return (
      <Box gap="xxs" testID="agenda-loading">
        <Skeleton height={20} radius="sm" />
        <Skeleton height={44} radius="md" />
      </Box>
    )
  }

  const turnos = (agenda.data ?? []).slice(0, limit ?? undefined)
  // Sin turnos no se dibuja nada: ver el comentario de arriba.
  if (turnos.length === 0) return null

  const porDia = agrupar(turnos, locale)

  return (
    <Box gap="sm" testID="agenda">
      <Text role="label" color="textSecondary">
        {t('agenda.title')}
      </Text>

      {porDia.map(({ dia, entradas }) => (
        <Box key={dia} gap="xxs" testID={`agenda-day-${dia}`}>
          <Text role="label">{dia}</Text>
          {entradas.map((turno) => (
            <Box
              key={turno.id}
              direction="row"
              gap="xs"
              align="center"
              testID={`agenda-entry-${turno.id}`}
            >
              <Box flex={1} gap="xxs">
                <Text role="body">
                  {`${hora(turno.startsAt, locale)} – ${hora(turno.endsAt, locale)}`}
                </Text>
                <Text role="label" color="textSecondary">
                  {turno.counterpartName ?? t('agenda.noName')}
                </Text>
                {turno.note != null ? (
                  <Text role="label" color="textTertiary" numberOfLines={2}>
                    {turno.note}
                  </Text>
                ) : null}
              </Box>
              {onOpenChat != null && turno.conversationId != null ? (
                <Button
                  label={t('agenda.open')}
                  accessibilityLabel={t('agenda.open.one', {
                    quien: turno.counterpartName ?? t('agenda.noName'),
                  })}
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    onOpenChat(
                      turno.conversationId as string,
                      turno.counterpartName,
                    )
                  }
                  testID={`agenda-open-${turno.id}`}
                />
              ) : null}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
}

/**
 * Agrupa por día calendario, conservando el orden que ya trae la base.
 *
 * La clave es la fecha escrita, no un ISO recortado: recortar el ISO agrupa por
 * día UTC, y a las 22 de Buenos Aires eso pone el turno de esta noche en el día
 * de mañana.
 */
function agrupar(
  turnos: readonly AgendaEntry[],
  locale: string,
): readonly { dia: string; entradas: readonly AgendaEntry[] }[] {
  const salida: { dia: string; entradas: AgendaEntry[] }[] = []

  for (const turno of turnos) {
    const dia = new Date(turno.startsAt).toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const ultimo = salida[salida.length - 1]
    if (ultimo != null && ultimo.dia === dia) ultimo.entradas.push(turno)
    else salida.push({ dia, entradas: [turno] })
  }

  return salida
}

/** Reloj de 24 horas: "02:30 p. m." no es como se lee una hora acá. */
function hora(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
