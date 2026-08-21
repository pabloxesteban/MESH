import { router, useLocalSearchParams } from 'expo-router'

import { CollectionDetailScreen } from '@/features/collections/CollectionDetailScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * Adentro de "Todo" (`id` = `todo`) o de una colección real.
 *
 * `addTo` es el modo agregar: "Todo" abierto para sumar obra a la colección
 * que diga ese id, desde "Agregar de lo que guardaste" en una colección
 * vacía. Ver `CollectionDetailScreen`.
 */
export default function ColeccionRoute() {
  const { userId } = useSession()
  const params = useLocalSearchParams<{ id: string; addTo?: string }>()

  return (
    <CollectionDetailScreen
      userId={userId}
      collectionId={params.id}
      addToCollectionId={params.addTo ?? null}
      onBack={() => router.back()}
      onOpenArtist={(slug) => router.push(`/artista/${slug}`)}
      onExplore={() => router.replace('/explorar')}
      onAddFromSaved={() => router.push(`/coleccion/todo?addTo=${params.id}`)}
      onDeleted={() => router.replace('/guardados')}
    />
  )
}
