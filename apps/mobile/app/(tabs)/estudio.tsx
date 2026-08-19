import { router } from 'expo-router'

import { StudioScreen } from '@/features/artist/StudioScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * El estudio, como pestaña. Solo se ve si la persona eligió "ofrezco".
 *
 * Convive con la ruta suelta `/estudio`, y no es duplicación por descuido:
 * quien eligió "busco" y además tatúa llega ahí desde Perfil sin que le sobre
 * una pestaña que casi nunca toca. Las dos rutas montan la misma pantalla.
 */
export default function StudioTab() {
  const { userId } = useSession()
  return <StudioScreen userId={userId} onBack={() => router.replace('/')} />
}
