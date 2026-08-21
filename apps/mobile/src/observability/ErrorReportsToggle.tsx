/**
 * Interruptor de reportes de error.
 *
 * **Separado del de datos de uso, y encendido por default.** Son dos cosas
 * distintas: aquel mide qué hace la persona, este mide si la app funciona. Un
 * solo interruptor para los dos habría significado que apagar la telemetría de
 * producto nos deja además ciegos ante los cierres inesperados, que es lo
 * último que le conviene a quien apagó el interruptor.
 *
 * La preferencia vive **en este teléfono** y no en `profiles`: se tiene que
 * poder leer antes de que exista la sesión, porque los errores que más importan
 * son los del arranque. Y no es una preferencia sobre los datos de la persona —
 * un reporte no lleva su id— sino sobre este dispositivo.
 *
 * El texto dice lo que viaja, en lenguaje claro y sin mentir por omisión.
 *
 * Ver ADR-026.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Box, Button, Text } from '@/design-system/index.ts'
import { kv, readJson, writeJson } from '@/data/kv.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { setReporterEnabled } from './report.ts'
import { REPORTER_PREF_KEY } from './ObservabilityProvider.tsx'

export function ErrorReportsToggle() {
  const t = useT()
  const client = useQueryClient()

  const preferencia = useQuery({
    queryKey: ['error-reports'],
    queryFn: () => readJson<boolean>(kv, REPORTER_PREF_KEY, true),
  })

  const cambiar = useMutation({
    mutationFn: async (next: boolean) => {
      // Primero el efecto, después la escritura. Si guardar falla, lo
      // importante —que deje de reportar— ya pasó.
      await setReporterEnabled(next)
      await writeJson(kv, REPORTER_PREF_KEY, next)
      return next
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['error-reports'] }),
  })

  const encendido = preferencia.data ?? true

  return (
    <Box gap="xs" testID="settings-errors">
      <Text role="label" color="textSecondary">
        {t('settings.errors.title')}
      </Text>
      <Text role="body" color="textSecondary">
        {t('settings.errors.body')}
      </Text>
      <Text role="label" color="textTertiary">
        {t(encendido ? 'settings.errors.on' : 'settings.errors.off')}
      </Text>
      <Button
        label={t(
          encendido
            ? 'settings.errors.toggle.on'
            : 'settings.errors.toggle.off',
        )}
        variant="secondary"
        onPress={() => cambiar.mutate(!encendido)}
        loading={cambiar.isPending}
        fullWidth
        testID="settings-errors-toggle"
      />
    </Box>
  )
}
