/**
 * Interruptor de datos de uso.
 *
 * Arranca encendido y con una explicación en lenguaje claro de qué se guarda y
 * qué no. Apagarlo **borra el buffer local** y deja de encolar: no es una pausa.
 *
 * La preferencia vive en `profiles.analytics_opt_in`, así que sobrevive a
 * reinstalar la app y viaja con la cuenta.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Box, Button, Text } from '@/design-system/index.ts'
import { setAnalyticsOptIn } from '@/analytics/track.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { fetchAnalyticsOptIn, updateAnalyticsOptIn } from './queries.ts'

export function AnalyticsToggle({ userId }: { userId: string | null }) {
  const t = useT()
  const queryClient = useQueryClient()

  const preference = useQuery({
    queryKey: ['analytics-opt-in', userId],
    enabled: userId != null,
    queryFn: () => fetchAnalyticsOptIn(userId as string),
  })

  const update = useMutation({
    mutationFn: async (next: boolean) => {
      // Primero el efecto local, después la escritura. Si la red falla, lo
      // importante —que deje de recolectar— ya pasó.
      await setAnalyticsOptIn(next)
      await updateAnalyticsOptIn(userId as string, next)
      return next
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['analytics-opt-in', userId] }),
  })

  const enabled = preference.data ?? true

  return (
    <Box gap="xs" testID="settings-analytics">
      <Text role="label" color="textSecondary">
        {t('settings.analytics.title')}
      </Text>
      {/* La explicación va antes del control, no escondida en un enlace: un
          interruptor sin contexto le pide a la persona que adivine qué apaga. */}
      <Text role="body" color="textSecondary">
        {t('settings.analytics.body')}
      </Text>
      <Text role="micro" color="textTertiary">
        {t(enabled ? 'settings.analytics.on' : 'settings.analytics.off')}
      </Text>
      <Button
        label={t(
          enabled
            ? 'settings.analytics.toggle.on'
            : 'settings.analytics.toggle.off',
        )}
        variant="secondary"
        onPress={() => update.mutate(!enabled)}
        loading={update.isPending}
        fullWidth
        testID="settings-analytics-toggle"
      />
    </Box>
  )
}
