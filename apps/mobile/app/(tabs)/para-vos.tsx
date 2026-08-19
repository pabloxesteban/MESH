import { router } from 'expo-router'

import { useSession } from '@/features/auth/SessionProvider.tsx'
import { useOnboardingIntent } from '@/features/account/useIntent.ts'
import { ChatsScreen } from '@/features/chat/ChatsScreen.tsx'

/**
 * La tercera pestaña: los chats, para los dos lados.
 *
 * Antes eran los encajes con los chats arriba. Los encajes se fueron con el
 * motor de recomendación de la app (ver MESH-DESIGN-DECISIONS D-010) y quedó lo
 * único que no se puede esconder: si alguien te escribió, tenés que verlo.
 *
 * El nombre del archivo queda por compatibilidad de rutas; lo que muestra es
 * Chats.
 */
export default function ChatsRoute() {
  const { userId } = useSession()
  const intent = useOnboardingIntent()

  return (
    <ChatsScreen
      intent={intent}
      onOpenChat={
        userId != null
          ? (conversationId: string, title: string) =>
              router.push(
                `/chat/${conversationId}?title=${encodeURIComponent(title)}`,
              )
          : undefined
      }
      // Quién se interesó en tu búsqueda es del lado de quien busca: un artista
      // no tiene búsquedas propias en las que alguien pueda interesarse.
      {...(intent === 'looking'
        ? { onOpenArtist: (slug: string) => router.push(`/artista/${slug}`) }
        : {})}
      onOpenHome={() => router.replace('/')}
    />
  )
}
