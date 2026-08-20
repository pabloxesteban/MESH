/**
 * Elegir una contraseña nueva, con la sesión que dejó el enlace.
 *
 * Un solo campo y ninguna confirmación. Repetir la contraseña es un patrón de
 * formulario web de hace veinte años: en un teléfono se puede ver lo que se
 * escribe, y el costo de equivocarse es pedir otro enlace, no perder nada.
 *
 * No hereda de `AuthForm` porque `AuthForm` siempre pide correo, y acá el
 * correo ya se sabe — volverlo a pedir sería preguntar algo que la app tiene.
 */

import { useState } from 'react'

import { Box, Button, Input, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { MIN_PASSWORD_LENGTH, type AuthResult } from './queries.ts'

export interface NewPasswordScreenProps {
  onSubmit: (password: string) => Promise<AuthResult>
  onDone: () => void
  testID?: string
}

export function NewPasswordScreen({
  onSubmit,
  onDone,
  testID = 'screen-new-password',
}: NewPasswordScreenProps) {
  const t = useT()
  const [password, setPassword] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function save() {
    if (isSaving) return
    setIsSaving(true)
    setErrorKey(null)
    const result = await onSubmit(password)
    setIsSaving(false)
    if (result.ok) {
      onDone()
      return
    }
    setErrorKey(result.messageKey)
  }

  return (
    <Box padding="lg" gap="lg" testID={testID}>
      <Box gap="xs">
        <Text role="titleLg">{t('auth.newPassword.title')}</Text>
        <Text role="body" color="textSecondary">
          {t('auth.newPassword.body')}
        </Text>
      </Box>

      <Box gap="md">
        <Input
          label={t('auth.newPassword.field')}
          hint={t('auth.field.password.hint')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          testID="new-password-field"
        />

        {errorKey != null ? (
          <Text role="body" color="stateNegative" accessibilityRole="alert">
            {t(errorKey)}
          </Text>
        ) : null}
      </Box>

      <Button
        label={t('auth.newPassword.submit')}
        onPress={() => void save()}
        disabled={password.length < MIN_PASSWORD_LENGTH}
        loading={isSaving}
        fullWidth
        testID="new-password-submit"
      />
    </Box>
  )
}
