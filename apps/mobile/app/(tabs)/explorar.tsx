import { router, useLocalSearchParams } from 'expo-router'

import { ExploreScreen } from '@/features/discovery/ExploreScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * Explorar: toda la obra, esté cerca o lejos. La superficie de ideas.
 *
 * Solo para quien busca. Un tatuador no viene a MESH a mirar el portafolio de
 * otros tatuadores — ver ADR-014.
 */
export default function ExplorarRoute() {
  const { userId } = useSession()
  // Llega desde "buscar con una foto": la IA ya clasificó la referencia y
  // Explorar abre filtrado por ese estilo.
  const { estilo } = useLocalSearchParams<{ estilo?: string }>()
  return (
    <ExploreScreen
      categorySlug="tattoo"
      userId={userId}
      onOpenArtist={(slug) => router.push(`/artista/${slug}`)}
      {...(typeof estilo === 'string' ? { initialStyle: estilo } : {})}
      {...(userId != null
        ? {
            onSearchByPhotos: () => router.push('/buscar'),
            onSearchByWords: () => router.push('/asistente'),
          }
        : {})}
    />
  )
}
