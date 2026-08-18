import { router } from 'expo-router'

import { Box, Button, Text } from '@/design-system/index.ts'
import { AnalyticsToggle } from '@/features/settings/AnalyticsToggle.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'
import { signOut } from '@/features/auth/queries.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

/**
 * Cuenta.
 *
 * Dos estados, no tres: con cuenta y sin cuenta. "Sin sesión" no existe — MESH
 * abre una sesión anónima en el arranque, así que siempre hay `auth.uid()`.
 *
 * La invitación a crear cuenta dice qué se gana (llevarlo a otro teléfono) y no
 * bloquea nada. No hay ninguna función detrás de un muro de registro: si algo
 * requiriera cuenta para funcionar, sería un peaje, no una razón.
 */
export default function AccountScreen() {
  const t = useT()
  const { isAnonymous, email, userId } = useSession()

  if (isAnonymous) {
    return (
      <Box padding="lg" gap="lg" testID="screen-account-anonymous">
        <Box gap="xs">
          <Text role="titleLg">{t('auth.account.anonymous.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('auth.account.anonymous.body')}
          </Text>
        </Box>
        <Box gap="xs">
          <Button
            label={t('auth.signUp.submit')}
            onPress={() => router.push('/cuenta/crear')}
            fullWidth
          />
          <Button
            label={t('auth.signIn.submit')}
            onPress={() => router.push('/cuenta/entrar')}
            variant="secondary"
            fullWidth
          />
        </Box>

        <AnalyticsToggle userId={userId} />
      </Box>
    )
  }

  return (
    <Box padding="lg" gap="lg" testID="screen-account">
      <Text role="titleLg">{t('auth.account.title')}</Text>
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('auth.account.email')}
        </Text>
        <Text role="body">{email ?? ''}</Text>
      </Box>
      {/* La puerta al modo artista.

          Está en Cuenta y no en una pestaña propia a propósito: de cada mil
          personas que usan MESH, quince son artistas. Una pestaña permanente
          para el 1,5 % le saca lugar a lo que hace el otro 98,5 %, y a un
          artista no le cuesta nada encontrarla una vez. */}
      <Box gap="xs">
        <Text role="label" color="textSecondary">
          {t('studio.entry.label')}
        </Text>
        <Text role="micro" color="textTertiary">
          {t('studio.entry.hint')}
        </Text>
        <Button
          label={t('studio.entry.action')}
          onPress={() => router.push('/estudio')}
          variant="secondary"
          fullWidth
          testID="account-studio"
        />
      </Box>

      <Box gap="xs">
        <Text role="body" color="textSecondary">
          {t('auth.account.signOut.confirm')}
        </Text>
        <Button
          label={t('auth.account.signOut')}
          onPress={() => void signOut()}
          variant="destructive"
          fullWidth
        />
      </Box>

      <AnalyticsToggle userId={userId} />
    </Box>
  )
}
