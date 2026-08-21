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
      // Termina en Inicio, que desde el 2026-08-21 es tu pedido. Antes
      // terminaba en Explorar filtrado por el estilo detectado (D-010): eso
      // dejaba a la persona mirando obra y sin ninguna pantalla que le dijera
      // qué pasó con lo que acababa de publicar. El estilo no se pierde — la
      // tarjeta del pedido lleva a Explorar filtrado con un toque.
      onCreated={() => router.replace('/')}
      onCancel={() => router.back()}
    />
  )
}
