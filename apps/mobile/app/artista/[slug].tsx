import { router, useLocalSearchParams } from 'expo-router'

import { ErrorView } from '@/components/ErrorView.tsx'
import { ProfileScreen } from '@/features/profile/ProfileScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'
import { useOpenChat } from '@/features/chat/useOpenChat.ts'
import { asSlug } from '@/data/route-params.ts'
import { todayIso } from '@/data/today.ts'

export default function ProfileRoute() {
  const raw = useLocalSearchParams<{ slug: string }>()
  const slug = asSlug(raw.slug)
  const { userId } = useSession()
  const chat = useOpenChat(userId, (conversationId, title, initialDraft) =>
    router.push(
      `/chat/${conversationId}?title=${encodeURIComponent(title)}` +
        (initialDraft != null
          ? `&initialDraft=${encodeURIComponent(initialDraft)}`
          : ''),
    ),
  )

  // Un enlace malformado se ve como "no encontramos esto", que es la verdad, y
  // no como un error de servidor.
  if (slug == null) {
    return <ErrorView cause="notFound" onBack={() => router.back()} />
  }

  return (
    <ProfileScreen
      slug={slug}
      today={todayIso()}
      onBack={() => router.back()}
      onContact={(artistSlug) => router.push(`/contacto/${artistSlug}`)}
      userId={userId}
      {...(userId != null ? { onChat: chat.open } : {})}
    />
  )
}
