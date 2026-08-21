import { router } from 'expo-router'

import { CollectionsScreen } from '@/features/collections/CollectionsScreen.tsx'

/**
 * Guardados → Colecciones.
 *
 * Ruta y no pestaña, igual que antes de ADR-030: se visita cada tanto, no
 * cada sesión, y se llega desde Perfil.
 */
export default function GuardadosRoute() {
  return (
    <CollectionsScreen
      onBack={() => router.back()}
      onOpenCollection={(id) => router.push(`/coleccion/${id}`)}
      onNewCollection={() => router.push('/coleccion/nueva')}
      onExplore={() => router.replace('/explorar')}
    />
  )
}
