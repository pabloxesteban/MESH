/**
 * El formulario que comparten entrar, crear cuenta y recuperar.
 *
 * Los tres son el mismo formulario con distinta cantidad de campos y distinto
 * botón. Escribirlos tres veces garantiza que dentro de un mes uno de ellos no
 * deshabilite el botón mientras envía.
 */

import { useState } from 'react'

import {
  Box,
  Button,
  Input,
  Text,
  SCREEN_GUTTER,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { MIN_PASSWORD_LENGTH, type AuthResult } from './queries.ts'

export interface AuthFormProps {
  titleKey: TranslationKey
  bodyKey?: TranslationKey
  submitKey: TranslationKey
  withPassword?: boolean
  onSubmit: (email: string, password: string) => Promise<AuthResult>
  onDone: () => void
  /** Enlaces al pie: "ya tengo cuenta", "olvidé mi contraseña". */
  links?: ReadonlyArray<{ key: TranslationKey; onPress: () => void }>
  testID?: string
}

export function AuthForm({
  titleKey,
  bodyKey,
  submitKey,
  withPassword = true,
  onSubmit,
  onDone,
  links = [],
  testID,
}: AuthFormProps) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit =
    email.trim().length > 0 &&
    (!withPassword || password.length >= MIN_PASSWORD_LENGTH)

  async function submit() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setErrorKey(null)
    const result = await onSubmit(email, password)
    setIsSubmitting(false)
    if (result.ok) {
      onDone()
      return
    }
    setErrorKey(result.messageKey)
  }

  return (
    <Box padding="lg" gap="lg" testID={testID}>
      <Box gap="xs">
        <Text role="titleLg">{t(titleKey)}</Text>
        {bodyKey != null ? (
          <Text role="body" color="textSecondary">
            {t(bodyKey)}
          </Text>
        ) : null}
      </Box>

      <Box gap="md">
        <Input
          label={t('auth.field.email')}
          placeholder={t('auth.field.email.placeholder')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          testID="auth-email"
        />

        {withPassword ? (
          <Input
            label={t('auth.field.password')}
            hint={t('auth.field.password.hint')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            // `newPassword` le dice al llavero del sistema que ofrezca generar
            // una. Es la única defensa real contra la reutilización.
            textContentType="newPassword"
            testID="auth-password"
          />
        ) : null}

        {errorKey != null ? (
          // El error del formulario se anuncia como alerta: alguien que usa
          // lector de pantalla no ve que apareció texto rojo arriba del botón.
          <Text role="body" color="stateNegative" accessibilityRole="alert">
            {t(errorKey)}
          </Text>
        ) : null}
      </Box>

      <Button
        label={t(submitKey)}
        onPress={() => void submit()}
        disabled={!canSubmit}
        loading={isSubmitting}
        fullWidth
        testID="auth-submit"
      />

      {links.length > 0 ? (
        <Box gap="xxs" align="center">
          {links.map((link) => (
            <Button
              key={link.key}
              label={t(link.key)}
              onPress={link.onPress}
              variant="ghost"
            />
          ))}
        </Box>
      ) : null}
    </Box>
  )
}

export { SCREEN_GUTTER }
