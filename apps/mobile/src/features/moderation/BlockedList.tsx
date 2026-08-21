/**
 * A quién bloqueaste, para poder deshacerlo.
 *
 * **Si no bloqueaste a nadie, esta sección no existe.** No es un estado vacío
 * con una explicación: es una lista de gente con la que decidiste no cruzarte,
 * y ponerla siempre a la vista en Perfil convierte una decisión privada en un
 * recordatorio permanente.
 *
 * Solo profesionales: del otro lado, un artista bloquea personas, y esa lista
 * mostraría identidades de gente que le escribió una vez. Se deshace desde la
 * conversación, donde el bloqueo se hizo.
 *
 * Ver ADR-023.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Box, Button, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { fetchBlockedProfessionals, unblock } from './queries.ts'

export function BlockedList() {
  const t = useT()
  const client = useQueryClient()

  const bloqueados = useQuery({
    queryKey: ['blocked', 'list'],
    queryFn: fetchBlockedProfessionals,
  })

  const desbloquear = useMutation({
    mutationFn: (blockId: string) => unblock(blockId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['blocked'] })
      void client.invalidateQueries({ queryKey: ['artists'] })
      void client.invalidateQueries({ queryKey: ['discovery'] })
    },
  })

  const lista = bloqueados.data ?? []
  if (lista.length === 0) return null

  return (
    <Box gap="xxs" testID="blocked-list">
      <Text role="label" color="textSecondary">
        {t('block.list.title')}
      </Text>
      {lista.map((bloqueo) => (
        <Box
          key={bloqueo.blockId}
          direction="row"
          gap="xs"
          align="center"
          justify="space-between"
          testID={`blocked-${bloqueo.slug}`}
        >
          <Box flex={1}>
            <Text role="body" numberOfLines={1}>
              {bloqueo.displayName}
            </Text>
          </Box>
          <Button
            label={t('block.undo')}
            accessibilityLabel={t('block.list.undo', {
              nombre: bloqueo.displayName,
            })}
            variant="ghost"
            size="sm"
            loading={desbloquear.isPending}
            onPress={() => desbloquear.mutate(bloqueo.blockId)}
            testID={`blocked-undo-${bloqueo.slug}`}
          />
        </Box>
      ))}
    </Box>
  )
}
