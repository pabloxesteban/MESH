import { router } from 'expo-router'

import { AvatarPickerScreen } from '@/features/account/AvatarPickerScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * Cambiar la foto de perfil, desde el header de Perfil en edición o desde el
 * aviso "Todavía no subiste una foto de perfil".
 */
export default function PerfilFotoRoute() {
  const { userId } = useSession()

  if (userId == null) {
    // No debería poder llegarse acá sin sesión: el header de Perfil que abre
    // esta ruta ya la requiere. Volver es la salida segura de todas formas.
    router.back()
    return null
  }

  return (
    <AvatarPickerScreen
      userId={userId}
      onBack={() => router.back()}
      onDone={() => router.back()}
    />
  )
}
