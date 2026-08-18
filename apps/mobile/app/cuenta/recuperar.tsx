import { router } from 'expo-router'
import { useState } from 'react'

import { Box, Text } from '@/design-system/index.ts'
import { AuthForm } from '@/features/auth/AuthForm.tsx'
import { requestPasswordReset } from '@/features/auth/queries.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

export default function ResetPasswordScreen() {
  const t = useT()
  const [sent, setSent] = useState(false)

  if (sent) {
    // El texto es condicional a propósito ("si ese correo tiene una cuenta").
    // Confirmar que existe convertiría esta pantalla en un verificador de quién
    // está registrado en MESH.
    return (
      <Box padding="lg" gap="md">
        <Text role="titleLg">{t('auth.reset.title')}</Text>
        <Text role="body" color="textSecondary" accessibilityRole="alert">
          {t('auth.reset.sent')}
        </Text>
      </Box>
    )
  }

  return (
    <AuthForm
      titleKey="auth.reset.title"
      bodyKey="auth.reset.body"
      submitKey="auth.reset.submit"
      withPassword={false}
      onSubmit={(email) => requestPasswordReset(email)}
      onDone={() => setSent(true)}
      links={[{ key: 'common.back', onPress: () => router.back() }]}
      testID="screen-reset"
    />
  )
}
