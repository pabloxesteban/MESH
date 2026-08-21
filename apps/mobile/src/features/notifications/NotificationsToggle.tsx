/**
 * Interruptor de avisos.
 *
 * Existe porque el innegociable 3 lo exige: *"tiene que poder apagarse"*. Y
 * apagarlo **corta antes de escribir**, no antes de mostrar — guardar avisos
 * sobre alguien que dijo que no los quiere sería quedarse con lo que pidió que
 * no nos quedáramos. Eso vive en `push_notification()`, del lado de la base.
 *
 * El texto dice qué se pierde al apagarlo, que es lo honesto: quien lo apaga
 * deja de enterarse de qué pasó con sus denuncias.
 *
 * Ver ADR-027.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Box, Button, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import {
  fetchNotificationsOptIn,
  updateNotificationsOptIn,
} from '../account/queries.ts'

export function NotificationsToggle({ userId }: { userId: string | null }) {
  const t = useT()
  const client = useQueryClient()

  const preferencia = useQuery({
    queryKey: ['notifications-opt-in', userId],
    enabled: userId != null,
    queryFn: () => fetchNotificationsOptIn(userId as string),
  })

  const cambiar = useMutation({
    mutationFn: (next: boolean) =>
      updateNotificationsOptIn(userId as string, next),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notifications-opt-in'] })
      void client.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  if (userId == null) return null

  const encendido = preferencia.data ?? true

  return (
    <Box gap="xs" testID="settings-notifications">
      <Text role="label" color="textSecondary">
        {t('settings.notifications.title')}
      </Text>
      <Text role="body" color="textSecondary">
        {t('settings.notifications.body')}
      </Text>
      <Text role="label" color="textTertiary">
        {t(
          encendido
            ? 'settings.notifications.on'
            : 'settings.notifications.off',
        )}
      </Text>
      <Button
        label={t(
          encendido
            ? 'settings.notifications.toggle.on'
            : 'settings.notifications.toggle.off',
        )}
        variant="secondary"
        onPress={() => cambiar.mutate(!encendido)}
        loading={cambiar.isPending}
        fullWidth
        testID="settings-notifications-toggle"
      />
    </Box>
  )
}
