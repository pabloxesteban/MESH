import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { DeckScreen } from '@/features/discovery/DeckScreen.tsx'
import { SearchDeckScreen } from '@/features/demand/SearchDeckScreen.tsx'
import { fetchOwnedProfessional } from '@/features/artist/queries.ts'
import { useOnboardingIntent } from '@/features/account/useIntent.ts'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * Inicio: el mazo. Cuál de los dos, depende de a qué vino la persona.
 *
 * Quien busca ve obra. Quien ofrece ve búsquedas de gente — un tatuador no
 * quiere deslizar el portafolio de otros tatuadores. Ver ADR-014.
 *
 * En los dos casos la app abre en descubrimiento y no hay pantalla de
 * bienvenida ni tour: la primera tarjeta explica el producto mejor que
 * cualquier texto que pudiéramos escribir.
 */
export default function HomeScreen() {
  const { userId } = useSession()
  const intent = useOnboardingIntent()

  if (intent === 'offering') return <ArtistHome />

  return (
    <DeckScreen
      categorySlug="tattoo"
      userId={userId}
      onOpenProfile={(slug) => router.push(`/artista/${slug}`)}
    />
  )
}

/**
 * Componente aparte y no un `useQuery` con `enabled` arriba: el mazo de obra no
 * tiene por qué pedir el perfil de artista, y un hook condicional no existe.
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
