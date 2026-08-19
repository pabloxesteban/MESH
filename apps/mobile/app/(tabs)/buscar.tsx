import { router } from 'expo-router'

import { useSession } from '@/features/auth/SessionProvider.tsx'
import { QuickSearchScreen } from '@/features/quick-search/QuickSearchScreen.tsx'

export default function QuickSearchRoute() {
  const { userId } = useSession()

  // La ruta solo se ofrece con sesión — el botón que lleva acá vive en Matches,
  // que ya requiere sesión para verse. Si de algún modo se llega sin userId,
  // no hay nada que crear: se vuelve.
  if (userId == null) {
    router.back()
    return null
  }

  return (
    <QuickSearchScreen
      userId={userId}
      onCreated={(projectId) =>
        router.replace(`/proyectos/${projectId}/matches`)
      }
      onCancel={() => router.back()}
    />
  )
}
