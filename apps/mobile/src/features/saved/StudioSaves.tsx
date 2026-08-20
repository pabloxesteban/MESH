/**
 * "Guardaron tu obra", en el Estudio.
 *
 * Es lo que se decidió el 2026-08-20: el artista se entera de cada guardado.
 * Ver ADR-017, que enmienda ADR-016.
 *
 * Dos cosas que esta pantalla sostiene y no son negociables acá:
 *
 * 1. **Nunca dice quién.** La RPC no devuelve identidad —hay un test de pgTAP
 *    que falla si alguien se la agrega— y esta pantalla tampoco tendría dónde
 *    ponerla. Que guardaron es una señal de demanda; quién guardó es decirle a
 *    un artista quién lo está mirando.
 * 2. **Se marca como visto al entrar**, no al salir ni con un botón. Lo nuevo
 *    deja de ser nuevo porque lo miró, que es lo que "nuevo" significa.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { Box, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import {
  fetchOwnSaveCounts,
  fetchSavesSeenAt,
  markSavesSeen,
} from './ranking.ts'

export interface StudioSavesProps {
  userId: string
}

export function StudioSaves({ userId }: StudioSavesProps) {
  const t = useT()
  const client = useQueryClient()

  const vistoAl = useQuery({
    queryKey: ['saves-seen', userId],
    queryFn: () => fetchSavesSeenAt(userId),
  })

  const conteos = useQuery({
    queryKey: ['own-saves', userId, vistoAl.data ?? null],
    queryFn: () => fetchOwnSaveCounts(vistoAl.data ?? null),
    enabled: !vistoAl.isPending,
  })

  const nuevos = (conteos.data ?? []).reduce(
    (suma, c) => suma + c.savesSince,
    0,
  )

  useEffect(() => {
    // Se marca después de haberlo mostrado, no antes: si se marcara al pedir,
    // un error de red dejaría al artista sin enterarse nunca de esos guardados.
    if (nuevos === 0) return
    void markSavesSeen()
      .then(() =>
        client.invalidateQueries({ queryKey: ['saves-seen', userId] }),
      )
      .catch(() => undefined)
  }, [nuevos, client, userId])

  // Mientras carga no se dibuja nada: es una sección de más en una pantalla que
  // ya tiene trabajo, y un esqueleto acá es ruido.
  if (conteos.data == null) return null

  const total = conteos.data.reduce((suma, c) => suma + c.saves, 0)

  return (
    <Box gap="xs" testID="studio-saves">
      <Text role="label" color="textSecondary">
        {t('studio.saves.title')}
      </Text>

      {total === 0 ? (
        <Text role="body" color="textTertiary">
          {t('studio.saves.none')}
        </Text>
      ) : (
        <Box gap="xxs">
          <Text role="body">
            {t('studio.saves.total', { n: String(total) })}
          </Text>
          {nuevos > 0 ? (
            // El único lugar donde el acento aparece en esta sección: es la
            // parte que el artista vino a ver.
            <Text role="body" color="accent" testID="studio-saves-new">
              {t('studio.saves.new', { n: String(nuevos) })}
            </Text>
          ) : null}
        </Box>
      )}
    </Box>
  )
}
