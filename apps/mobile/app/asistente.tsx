import { router } from 'expo-router'

import { AssistantScreen } from '@/features/assistant/AssistantScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * El asistente que arma el pedido. Ver ADR-021.
 *
 * Termina en Inicio, que desde el 2026-08-21 **es tu pedido**: lo que la
 * persona espera después de cerrarlo es saber si le llegó a alguien, no más
 * obra para mirar. Ver `docs/product/por-que-mesh.md`.
 */
export default function AsistenteRoute() {
  const { userId } = useSession()

  if (userId == null) {
    router.back()
    return null
  }

  return (
    <AssistantScreen
      userId={userId}
      onBack={() => router.back()}
      onPublished={() => router.replace('/')}
    />
  )
}
