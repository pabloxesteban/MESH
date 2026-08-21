import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { ArtistsScreen } from '@/features/artists/ArtistsScreen.tsx'
import { RequestBand } from '@/features/request/RequestBand.tsx'
import { SearchDeckScreen } from '@/features/demand/SearchDeckScreen.tsx'
import { fetchOwnedProfessional } from '@/features/artist/queries.ts'
import { useOnboardingIntent } from '@/features/account/useIntent.ts'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * Inicio. Cuál, depende de a qué vino la persona.
 *
 * Quien busca ve **su pedido primero** y, abajo, los artistas cerca suyo. Ese
 * orden es el producto: la app abría con una vidriera de desconocidos, la
 * misma para todos, y lo que la persona había escrito no aparecía en ninguna
 * pantalla. Ver `docs/product/por-que-mesh.md`.
 *
 * La grilla no se fue: dejó de ser la puerta de entrada y quedó un
 * desplazamiento abajo, con su búsqueda por nombre y su encabezado de
 * ubicación intactos.
 *
 * Quien ofrece ve búsquedas de gente — un tatuador no quiere mirar el
 * portafolio de otros tatuadores. Ver ADR-014 y MESH-DESIGN-DECISIONS D-010.
 */
export default function HomeScreen() {
  const { userId } = useSession()
  const intent = useOnboardingIntent()

  if (intent === 'offering') return <ArtistHome />

  return (
    <ArtistsScreen
      categorySlug="tattoo"
      userId={userId}
      header={
        <RequestBand
          userId={userId}
          onSearchByPhotos={() => router.push('/buscar')}
          onSearchByWords={() => router.push('/asistente')}
          onOpenArtist={(slug) => router.push(`/artista/${slug}`)}
          onExploreStyle={(styleSlug) =>
            router.push(`/(tabs)/explorar?estilo=${styleSlug}`)
          }
        />
      }
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
  const { userId } = useSession()
  const profile = useQuery({
    queryKey: ['studio', 'professional', userId],
    queryFn: () => (userId == null ? null : fetchOwnedProfessional(userId)),
  })

  return (
    <SearchDeckScreen
      categorySlug="tattoo"
      professionalId={profile.data?.id ?? null}
      onOpenStudio={() => router.push('/(tabs)/estudio')}
    />
  )
}
