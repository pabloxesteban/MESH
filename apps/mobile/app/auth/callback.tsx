import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'

import { Box, EmptyState, Skeleton, Text } from '@/design-system/index.ts'
import { NewPasswordScreen } from '@/features/auth/NewPasswordScreen.tsx'
import { setNewPassword } from '@/features/auth/queries.ts'
import {
  completeCallback,
  type CallbackOutcome,
} from '@/features/auth/recovery.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

/**
 * Donde aterriza el enlace del correo.
 *
 * Esta ruta no existía y `resetPasswordForEmail` mandaba acá igual: el enlace
 * abría la app y caía en "Unmatched Route". Quien se registró con correo y se
 * olvidó la contraseña quedaba afuera de su cuenta para siempre.
 *
 * La URL no dice de qué era el enlace —solo trae `?code=`—, así que quién
 * decide es `completeCallback()`, que escucha el evento `PASSWORD_RECOVERY`
 * alrededor del canje. Ver `features/auth/recovery.ts`.
 *
 * La app se reconstruye desde `expo-router`, no desde `Linking`: el esquema
 * está declarado en app.json y el router entrega los parámetros. Un listener
 * propio se perdería el arranque en frío, que es justo cuando llega este
 * enlace — la app estaba cerrada.
 */
export default function AuthCallbackScreen() {
  const t = useT()
  const params = useLocalSearchParams<{ code?: string; error?: string }>()
  const [outcome, setOutcome] = useState<CallbackOutcome | null>(null)

  // Se reconstruye la URL en vez de leerla cruda porque el router ya la parseó.
  const query = new URLSearchParams()
  if (params.code != null) query.set('code', params.code)
  if (params.error != null) query.set('error', params.error)
  const url = `mesh://auth/callback?${query.toString()}`

  useEffect(() => {
    let cancelled = false
    void completeCallback(url).then((result) => {
      if (cancelled) return
      setOutcome(result)
      // Sin recuperación no hay nada que preguntar: ya está adentro.
      if (result.kind === 'signedIn') router.replace('/perfil')
    })
    return () => {
      cancelled = true
    }
  }, [url])

  if (outcome == null || outcome.kind === 'signedIn') {
    return (
      <Box padding="lg" gap="md" testID="auth-callback-loading">
        <Text role="titleLg">{t('auth.callback.working')}</Text>
        <Skeleton height={120} radius="md" />
      </Box>
    )
  }

  if (outcome.kind === 'error') {
    // Con dos salidas y no una: pedir otro enlace es lo que resuelve el caso,
    // pero alguien que llegó acá por error tiene que poder irse a la app.
    return (
      <Box padding="lg" testID="auth-callback-error">
        <EmptyState
          title={t(outcome.messageKey)}
          action={{
            label: t('auth.signIn.forgot'),
            onPress: () => router.replace('/cuenta/recuperar'),
          }}
          secondaryAction={{
            label: t('common.back'),
            onPress: () => router.replace('/perfil'),
          }}
          testID="auth-callback-empty"
        />
      </Box>
    )
  }

  return (
    <NewPasswordScreen
      onSubmit={setNewPassword}
      onDone={() => router.replace('/perfil')}
    />
  )
}
