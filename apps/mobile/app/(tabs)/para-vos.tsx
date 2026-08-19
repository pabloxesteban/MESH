import { router } from 'expo-router'

import { ChatsScreen } from '@/features/chat/ChatsScreen.tsx'
import { useOnboardingIntent } from '@/features/account/useIntent.ts'
import { useSession } from '@/features/auth/SessionProvider.tsx'
import { MatchesScreen } from '@/features/matches/MatchesScreen.tsx'
import { todayIso } from '@/data/today.ts'

/**
 * La tercera pestaña. Para quien busca son sus encajes, con los chats arriba.
 * Para quien ofrece son los chats y nada más: un tatuador no tiene "matches"
 * con otros tatuadores, y mostrarle una lista vacía de gente que no le sirve
 * sería peor que no tener la pantalla. Ver ADR-014.
 */
export default function ThirdTabRoute() {
  const { userId } = useSession()
  const intent = useOnboardingIntent()

  function openChat(conversationId: string, title: string) {
    router.push(`/chat/${conversationId}?title=${encodeURIComponent(title)}`)
  }

  if (intent === 'offering') {
    return (
      <ChatsScreen
        onOpenChat={userId != null ? openChat : undefined}
        onOpenDeck={() => router.replace('/')}
      />
    )
  }

  return (
    <MatchesScreen
      userId={userId}
      today={todayIso()}
      onExplore={() => router.replace('/')}
      onOpenProfile={(slug) => router.push(`/artista/${slug}`)}
      {...(userId != null
        ? {
            onSearchByPhotos: () => router.push('/buscar'),
            onOpenChat: openChat,
          }
        : {})}
    />
  )
}
