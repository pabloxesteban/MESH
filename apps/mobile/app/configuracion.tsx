import { router } from 'expo-router'

import { ConfiguracionScreen } from '@/features/account/ConfiguracionScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'
import { signOut } from '@/features/auth/queries.ts'

/**
 * Configuración: cuenta, preferencias, notificaciones, privacidad y legal.
 *
 * Se llega desde Perfil, nunca al revés — Perfil es el hub, esto es una de
 * sus salidas. Ver ADR-030.
 */
export default function ConfiguracionRoute() {
  const { userId, isAnonymous, email } = useSession()

  return (
    <ConfiguracionScreen
      userId={userId}
      isAnonymous={isAnonymous}
      email={email}
      onCreateAccount={() => router.push('/cuenta/crear')}
      onSignIn={() => router.push('/cuenta/entrar')}
      onSignOut={() => void signOut()}
      // Después de borrar, a Inicio: la sesión ya no existe y `SessionProvider`
      // arranca una anónima nueva. Quedarse acá mostraría la cuenta de alguien
      // que acaba de dejar de existir.
      onDeleted={() => router.replace('/(tabs)')}
      onBack={() => router.back()}
    />
  )
}
