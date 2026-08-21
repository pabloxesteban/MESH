import { router } from 'expo-router'

import { AssistantScreen } from '@/features/assistant/AssistantScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * El asistente que arma el pedido. Ver ADR-021.
 *
 * Termina en la lista de propuestas y no en Explorar —a diferencia de "buscar
 * con una foto"— porque acá el resultado es un pedido publicado: lo que la
 * persona espera después de cerrarlo es quién le contesta, no más obra para
 * mirar.
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
      onPublished={() => router.replace('/(tabs)/para-vos')}
    />
  )
}
