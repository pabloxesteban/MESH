import { router } from 'expo-router'

import { AuthForm } from '@/features/auth/AuthForm.tsx'
import { upgradeToAccount } from '@/features/auth/queries.ts'
import { useGoogle } from '@/features/auth/useGoogle.ts'
import { useApple } from '@/features/auth/useApple.ts'
import { useConfirmAdult } from '@/features/auth/useConfirmAdult.ts'

/**
 * Crear cuenta = convertir la sesión anónima en una cuenta.
 *
 * El `auth.uid()` no cambia, así que no hay nada que migrar: las interacciones,
 * el gusto y los matches ya son de este id. Ver ADR-002.
 *
 * Con Google pasa lo mismo por otro camino: se **vincula** la identidad al
 * usuario que ya existe en vez de abrir uno nuevo. Ver ADR-015.
 *
 * **Y acá se pregunta la edad**, que hasta el 2026-08-21 era la primera
 * pantalla de la app. Ver ADR-030.
 */
export default function SignUpScreen() {
  const google = useGoogle()
  const apple = useApple()
  const declararMayor = useConfirmAdult()

  return (
    <AuthForm
      titleKey="auth.signUp.title"
      bodyKey="auth.signUp.body"
      submitKey="auth.signUp.submit"
      onSubmit={upgradeToAccount}
      onGoogle={google}
      onApple={apple}
      onAdultConfirmed={declararMayor}
      onDone={() => router.back()}
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
