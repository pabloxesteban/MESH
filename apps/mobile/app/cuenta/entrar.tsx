import { router } from 'expo-router'

import { AuthForm } from '@/features/auth/AuthForm.tsx'
import { signIn } from '@/features/auth/queries.ts'
import { useGoogle } from '@/features/auth/useGoogle.ts'

/**
 * Entrar y crear cuenta comparten el botón de Google a propósito: con Google no
 * hay dos actos distintos, hay uno solo que funciona en las dos direcciones. Y
 * qué hace por debajo lo decide la sesión, no la pantalla — llegar acá con
 * sesión anónima sigue vinculando. Ver `useGoogle.ts`.
 */
export default function SignInScreen() {
  const google = useGoogle()

  return (
    <AuthForm
      titleKey="auth.signIn.title"
      submitKey="auth.signIn.submit"
      onSubmit={signIn}
      onGoogle={google}
      onDone={() => router.back()}
      links={[
        {
          key: 'auth.signIn.toSignUp',
          onPress: () => router.replace('/cuenta/crear'),
        },
        {
          key: 'auth.signIn.forgot',
          onPress: () => router.push('/cuenta/recuperar'),
        },
      ]}
      testID="screen-sign-in"
    />
  )
}
