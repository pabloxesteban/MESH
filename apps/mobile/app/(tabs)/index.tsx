import { router } from 'expo-router'

import { DeckScreen } from '@/features/discovery/DeckScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * Inicio: el mazo.
 *
 * La app abre en descubrimiento. No hay pantalla de bienvenida ni tour: la
 * primera obra sobre la pantalla explica el producto mejor que cualquier texto
 * que pudiéramos escribir.
 */
export default function HomeScreen() {
  const { userId } = useSession()

  return (
    <DeckScreen
      categorySlug="tattoo"
      userId={userId}
      onOpenProfile={(slug) => router.push(`/artista/${slug}`)}
    />
  )
}
