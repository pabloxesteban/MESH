import { router, useLocalSearchParams } from 'expo-router'

import { ChatScreen } from '@/features/chat/ChatScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'
import { asUuid } from '@/data/route-params.ts'

export default function ChatRoute() {
  const { userId } = useSession()
  const params = useLocalSearchParams()
  const id = asUuid(params['id'])
  // El título es solo para mostrar y no llega a ninguna consulta, así que no
  // se valida contra un formato — pero sí se acota, para que un deep link no
  // pueda empujar un encabezado de mil caracteres.
  const raw = params['title']
  const title = typeof raw === 'string' ? raw.slice(0, 80) : ''
  // El texto pre-armado de "Diseños propios" (ADR-034): editable, nunca
  // enviado solo. Sin acotar, un deep link podría empujar un compositor
  // ilegible — mismo criterio que ya usa `title` en esta misma ruta.
  const rawDraft = params['initialDraft']
  const initialDraft =
    typeof rawDraft === 'string' ? rawDraft.slice(0, 2000) : undefined

  if (id == null || userId == null) return null

  return (
    <ChatScreen
      conversationId={id}
      userId={userId}
      title={title}
      onBack={() => router.back()}
      {...(initialDraft != null ? { initialDraft } : {})}
    />
  )
}
