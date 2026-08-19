import { router } from 'expo-router'

import { useSession } from '@/features/auth/SessionProvider.tsx'
import { QuickSearchScreen } from '@/features/quick-search/QuickSearchScreen.tsx'

export default function QuickSearchRoute() {
  const { userId } = useSession()

  // La ruta solo se ofrece con sesión — el botón que lleva acá vive en
  // Explorar, que ya requiere sesión para verse. Si de algún modo se llega sin
  // userId, no hay nada que crear: se vuelve.
  if (userId == null) {
    router.back()
    return null
  }

  return (
    <QuickSearchScreen
      userId={userId}
      // Termina en Explorar filtrado por el estilo que detectó la IA. Antes
      // terminaba en una lista de encajes; ahora termina en obra, que es lo que
      // la persona fue a ver. Ver MESH-DESIGN-DECISIONS D-010.
      onCreated={(_projectId, styleSlug) =>
        router.replace(`/(tabs)/explorar?estilo=${styleSlug}`)
      }
      onCancel={() => router.back()}
    />
  )
}
