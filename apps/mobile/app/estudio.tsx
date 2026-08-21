import { router } from 'expo-router'

import { StudioScreen } from '@/features/artist/StudioScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

export default function StudioRoute() {
  const { userId } = useSession()
  return (
    <StudioScreen
      userId={userId}
      onBack={() => router.back()}
      // Desde un turno de la agenda al chat del que salió: es donde se cancela,
      // donde se reseña y donde están las palabras que lo armaron.
      onOpenChat={(conversationId, quien) =>
        router.push(
          `/chat/${conversationId}?title=${encodeURIComponent(quien ?? '')}`,
        )
      }
    />
  )
}
