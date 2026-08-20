import { router } from 'expo-router'

import { useSession } from '@/features/auth/SessionProvider.tsx'
import { SavedScreen } from '@/features/saved/SavedScreen.tsx'

/**
 * Ruta y no pestaña.
 *
 * Guardados se visita cada tanto, no cada sesión, y la barra es de cuatro y
 * ninguna más — con seis pasa a ser un menú que hay que estudiar. Se llega
 * desde Perfil, igual que el estudio. Ver ADR-016.
 */
export default function GuardadosRoute() {
  const { userId } = useSession()

  return (
    <SavedScreen
      userId={userId}
      onOpenArtist={(slug) => router.push(`/artista/${slug}`)}
      onExplore={() => router.replace('/explorar')}
      onBack={() => router.back()}
    />
  )
}
