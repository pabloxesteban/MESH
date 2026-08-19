import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { ArtistsScreen } from '@/features/artists/ArtistsScreen.tsx'
import { SearchDeckScreen } from '@/features/demand/SearchDeckScreen.tsx'
import { fetchOwnedProfessional } from '@/features/artist/queries.ts'
import { useOnboardingIntent } from '@/features/account/useIntent.ts'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * Inicio. Cuál, depende de a qué vino la persona.
 *
 * Quien busca ve **artistas cerca suyo**, con una muestra de su trabajo. Quien
 * ofrece ve búsquedas de gente — un tatuador no quiere mirar el portafolio de
 * otros tatuadores. Ver ADR-014 y MESH-DESIGN-DECISIONS D-010.
 */
export default function HomeScreen() {
  const { userId } = useSession()
  const intent = useOnboardingIntent()

  if (intent === 'offering') return <ArtistHome />

  return (
    <ArtistsScreen
      categorySlug="tattoo"
      userId={userId}
      onOpenArtist={(slug) => router.push(`/artista/${slug}`)}
      onExplore={() => router.push('/(tabs)/explorar')}
      onChangeLocation={() => router.push('/ubicacion')}
    />
  )
}

/**
 * Componente aparte y no un `useQuery` con `enabled` arriba: la grilla de
 * artistas no tiene por qué pedir el perfil de artista, y un hook condicional
 * no existe.
 */
function ArtistHome() {
  const profile = useQuery({
    queryKey: ['studio', 'professional'],
    queryFn: fetchOwnedProfessional,
  })

  return (
    <SearchDeckScreen
      categorySlug="tattoo"
      professionalId={profile.data?.id ?? null}
      onOpenStudio={() => router.push('/(tabs)/estudio')}
    />
  )
}
