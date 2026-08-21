/**
 * El formulario que comparten entrar, crear cuenta y recuperar.
 *
 * Los tres son el mismo formulario con distinta cantidad de campos y distinto
 * botón. Escribirlos tres veces garantiza que dentro de un mes uno de ellos no
 * deshabilite el botón mientras envía.
 *
 * **Google va arriba del correo, no abajo.** Es el camino que la mayoría va a
 * elegir, y ponerlo después del formulario obliga a leer dos campos para
 * descubrir que no hacían falta. El separador dice "o" y no "o registrate con
 * tu correo": las dos son la misma puerta.
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
  /**
   * Entrar con Google. Ausente en recuperar contraseña, donde no aplica.
   *
   * Devuelve `null` cuando la persona canceló: cerrar la pestaña del navegador
   * es una decisión, no una falla, y un cartel rojo ahí convierte "me
   * arrepentí" en "algo se rompió".
   */
  onGoogle?: () => Promise<TranslationKey | null | 'ok'>
  /**
   * Pedir que declare tener 18 años. Solo al **crear cuenta**.
   *
   * Es donde vive la pregunta desde el 2026-08-21. Antes era la primera
   * pantalla de la app, antes de que nadie supiera qué era MESH — que no es lo
   * que hace ninguna app y además no hacía falta: lo que impone la regla es
   * `schedule_appointment()` del lado de la base. Ver ADR-030.
   *
   * Se llama después de un alta exitosa, por cualquiera de los dos caminos
   * (correo o Google). Si el alta falla no se declara nada.
   */
  onAdultConfirmed?: () => void
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
  onGoogle,
  onAdultConfirmed,
  testID,
}: AuthFormProps) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogling, setIsGoogling] = useState(false)
  const [esMayor, setEsMayor] = useState(false)

  const pideEdad = onAdultConfirmed != null

  const canSubmit =
    email.trim().length > 0 &&
    (!withPassword || password.length >= MIN_PASSWORD_LENGTH) &&
    (!pideEdad || esMayor)

  async function submit() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setErrorKey(null)
    const result = await onSubmit(email, password)
    setIsSubmitting(false)
    if (result.ok) {
      // Solo después de que el alta salió bien: declarar la edad de una cuenta
      // que no llegó a existir no le sirve a nadie.
      if (pideEdad && esMayor) onAdultConfirmed()
      onDone()
      return
    }
    setErrorKey(result.messageKey)
  }

  async function google() {
    if (onGoogle == null || isGoogling) return
    setIsGoogling(true)
    setErrorKey(null)
    const outcome = await onGoogle()
    setIsGoogling(false)

    if (outcome === 'ok') {
      if (pideEdad && esMayor) onAdultConfirmed()
      onDone()
      return
    }
    // `null` es cancelar: no se muestra nada.
    if (outcome != null) setErrorKey(outcome)
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

      {pideEdad ? (
        <Box gap="xxs" testID="auth-adult">
          {/* Arriba de los dos caminos y no abajo del botón: es una condición
              para crear la cuenta, no una aclaración al pie.

              Es un botón que se marca y no un interruptor: un interruptor
              sugiere una preferencia que se puede dejar en cualquiera de los
              dos lados, y esto es un requisito. La etiqueta accesible lleva el
              estado porque el tilde no se lee en voz alta. */}
          <Button
            label={`${esMayor ? '☑' : '☐'}  ${t('auth.adult.label')}`}
            accessibilityLabel={t(
              esMayor ? 'auth.adult.checked' : 'auth.adult.unchecked',
            )}
            variant="secondary"
            onPress={() => setEsMayor((antes) => !antes)}
            fullWidth
            testID="auth-adult-toggle"
          />
          <Text role="label" color="textTertiary">
            {t('auth.adult.hint')}
          </Text>
        </Box>
      ) : null}

      {onGoogle != null ? (
        <Box gap="md">
          <Box gap="xs">
            <Button
              label={t('auth.google')}
              variant="secondary"
              onPress={() => void google()}
              loading={isGoogling}
              // También espera la declaración: si no, entrar con Google sería
              // la puerta de atrás de la única pregunta que la app hace.
              disabled={isSubmitting || (pideEdad && !esMayor)}
              fullWidth
              testID="auth-google"
            />
            {/* Lo que más se pregunta al ver un botón de Google en una app donde
                ya venías usando algo: si se pierde lo hecho. No se pierde. */}
            <Text role="label" color="textTertiary">
              {t('auth.google.hint')}
            </Text>
          </Box>

          {/* Centrado y en su propia caja.

              Alineado a la izquierda y pegado a la aclaración, una "o" sola se
              lee como un error de tipeo y parece separar el texto de arriba del
              de abajo en vez de separar los dos caminos. */}
          <Box align="center">
            <Text role="label" color="textTertiary" accessibilityRole="none">
              {t('auth.or')}
            </Text>
          </Box>
        </Box>
      ) : null}

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
        disabled={!canSubmit || isGoogling}
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
