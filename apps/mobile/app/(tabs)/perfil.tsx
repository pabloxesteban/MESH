import { router } from 'expo-router'

import { AccountScreen } from '@/features/account/AccountScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

/**
 * Perfil es el hub: identidad, avisos, guardado reciente, y las salidas hacia
 * Guardados, Estudio y Configuración.
 *
 * `app/cuenta/` y `app/configuracion.tsx` son rutas de destino, no pantallas
 * que se visiten solas: se llega desde acá. Cuando `app/cuenta/` no tenía
 * ninguna puerta, crear cuenta era código inalcanzable — los tests pasaban y
 * nadie podía registrarse.
 */
export default function PerfilRoute() {
  const { userId, isAnonymous } = useSession()

  return (
    <AccountScreen
      userId={userId}
      isAnonymous={isAnonymous}
      onOpenStudio={() => router.push('/estudio')}
      onOpenColecciones={() => router.push('/guardados')}
      onOpenConfiguracion={() => router.push('/configuracion')}
      onOpenAvatarPicker={() => router.push('/perfil/foto')}
      onOpenLocationEditor={(currentSlug) =>
        router.push(
          currentSlug != null
            ? `/perfil/ubicacion?slug=${encodeURIComponent(currentSlug)}`
            : '/perfil/ubicacion',
        )
      }
      onOpenArtist={(slug) => router.push(`/artista/${slug}`)}
    />
  )
}
