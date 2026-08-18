import { router } from 'expo-router'

import { AuthForm } from '@/features/auth/AuthForm.tsx'
import { signIn } from '@/features/auth/queries.ts'

export default function SignInScreen() {
  return (
    <AuthForm
      titleKey="auth.signIn.title"
      submitKey="auth.signIn.submit"
      onSubmit={signIn}
      onDone={() => router.replace('/cuenta')}
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
