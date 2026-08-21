import { router } from 'expo-router'

import { NewCollectionScreen } from '@/features/collections/NewCollectionScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

export default function NuevaColeccionRoute() {
  const { userId } = useSession()

  if (userId == null) {
    router.back()
    return null
  }

  return (
    <NewCollectionScreen
      userId={userId}
      onCancel={() => router.back()}
      // Aterriza DENTRO de la colección recién creada, reemplazando esta
      // ruta: volver atrás desde ahí lleva a la grilla, no a este formulario.
      onCreated={(id) => router.replace(`/coleccion/${id}`)}
    />
  )
}
