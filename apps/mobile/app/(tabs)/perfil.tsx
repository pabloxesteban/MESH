import { router } from 'expo-router'

import { AccountScreen } from '@/features/account/AccountScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'
import { signOut } from '@/features/auth/queries.ts'

/**
 * Perfil es la única puerta a la cuenta.
 *
 * `app/cuenta/` son rutas de destino, no una pantalla que se visite: se llega
 * desde acá y se vuelve acá. Cuando no era así, crear cuenta era código
 * inalcanzable — los tests pasaban y nadie podía registrarse.
 */
export default function PerfilRoute() {
  const { userId, isAnonymous, email } = useSession()

  return (
    <AccountScreen
      userId={userId}
      isAnonymous={isAnonymous}
      email={email}
      onOpenStudio={() => router.push('/estudio')}
      onOpenSaved={() => router.push('/guardados')}
      onCreateAccount={() => router.push('/cuenta/crear')}
      onSignIn={() => router.push('/cuenta/entrar')}
      onSignOut={() => void signOut()}
      // Después de borrar, a Inicio: la sesión ya no existe y `SessionProvider`
      // va a arrancar una anónima nueva. Quedarse en Perfil mostraría la cuenta
      // de alguien que acaba de dejar de existir.
      onDeleted={() => router.replace('/(tabs)')}
    />
  )
}
