import { router } from 'expo-router'

import { AuthForm } from '@/features/auth/AuthForm.tsx'
import { upgradeToAccount } from '@/features/auth/queries.ts'

/**
 * Crear cuenta = convertir la sesión anónima en una cuenta.
 *
 * El `auth.uid()` no cambia, así que no hay nada que migrar: las interacciones,
 * el gusto y los matches ya son de este id. Ver ADR-002.
 */
export default function SignUpScreen() {
  return (
    <AuthForm
      titleKey="auth.signUp.title"
      bodyKey="auth.signUp.body"
      submitKey="auth.signUp.submit"
      onSubmit={upgradeToAccount}
      onDone={() => router.replace('/cuenta')}
      links={[
        {
          key: 'auth.signUp.toSignIn',
          onPress: () => router.replace('/cuenta/entrar'),
        },
      ]}
      testID="screen-sign-up"
    />
  )
}
