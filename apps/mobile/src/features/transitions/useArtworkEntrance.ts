/**
 * La entrada del perfil cuando se llegó tocando una obra.
 *
 * Reclama el pasamanos **una sola vez, al montar**, y no en cada render: el
 * pasamanos es de un solo uso, así que reclamarlo en el cuerpo del componente
 * lo consumiría en el primer render y lo perdería en cualquier re-render que
 * llegue antes de pintar.
 *
 * Devuelve además el rectángulo de destino ya calculado, porque quien sabe el
 * ancho de la pantalla y la muesca es el componente, no el módulo de
 * geometría.
 */

import { useCallback, useEffect, useState } from 'react'
import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SCREEN_GUTTER, spacing } from '@/design-system/index.ts'

import type { ArtworkScope } from './artworkRegistry.ts'
import { DEFAULT_RATIO, heroRect, isWorthAnimating, type Rect } from './geometry.ts'
import {
  armReturn,
  claimArtwork,
  releaseReturn,
  type ArtworkHandoff,
} from './sharedArtwork.ts'

export interface ArtworkEntrance {
  /**
   * La obra que viene creciendo, mientras crece. `null` cuando no hubo
   * transición o cuando ya llegó.
   */
  readonly growing: (ArtworkHandoff & { readonly to: Rect }) | null
  /**
   * Qué obra tiene que ser el hero del perfil.
   *
   * La obra que se tocó, no la destacada por el artista: si la obra que crece
   * aterriza y aparece otra, la transición contó una mentira. Es `null` cuando
   * no se llegó tocando una obra, y ahí manda la regla de siempre.
   */
  readonly heroPieceId: string | null
  /** El hero real puede aparecer: la copia terminó su viaje. */
  readonly onArrived: () => void
  /**
   * Deja lista la vuelta con el hero que se está mostrando.
   *
   * Lo llama el perfil cada vez que sabe dónde está su hero — al montarlo y en
   * cada scroll. `null` desarma, que es lo correcto cuando el hero se fue de la
   * pantalla: volver desde una posición que ya no se ve haría que la obra salga
   * volando desde afuera.
   */
  readonly armReturnTo: (hero: ReturnableHero | null) => void
}

/**
 * Lo que el perfil sabe del hero que está mostrando.
 *
 * Sin `width`/`height`: el rectángulo de vuelta ya no depende de la forma
 * real de la obra (`DEFAULT_RATIO` fijo, ver `armReturnTo` más abajo), así
 * que la medida real de la pieza no le hace falta a esta cuenta.
 */
export interface ReturnableHero {
  readonly portfolioItemId: string
  readonly mediaPath: string
  readonly blurhash: string | null
  /** Cuánto scrolleó el perfil: el hero está más arriba de donde se dibujó. */
  readonly scrollY: number
}

export function useArtworkEntrance(professionalSlug: string): ArtworkEntrance {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  // `useState` con inicializador perezoso y no `useEffect`: el reclamo tiene
  // que pasar antes del primer pintado. Con un efecto, el perfil se dibujaría
  // un fotograma sin la obra encima y se vería el hero vacío parpadear.
  const [claimed] = useState<ArtworkHandoff | null>(() =>
    claimArtwork(professionalSlug),
  )
  const [arrived, setArrived] = useState(false)

  const onArrived = useCallback(() => {
    setArrived(true)
  }, [])

  // De qué superficie se vino, y por lo tanto a cuál se vuelve. Sin ida no hay
  // vuelta: llegar por un chat o por un enlace no deja a dónde encoger.
  const scope: ArtworkScope | null = claimed?.scope ?? null

  const armReturnTo = useCallback(
    (hero: ReturnableHero | null) => {
      if (hero == null || scope == null) {
        armReturn(null)
        return
      }

      const dibujado = heroRect({
        screenWidth: width,
        insetTop: insets.top,
        // `DEFAULT_RATIO`, no la forma real de esta obra: el carrusel del
        // perfil dejó de respetar la relación de aspecto real de cada foto —
        // pedido directo, para que las fotos midan lo mismo en todos los
        // perfiles y no cambien de alto según cuál artista se esté mirando.
        // Ver el comentario de `HeroCarousel` en `ProfileScreen.tsx`.
        aspectRatio: DEFAULT_RATIO,
        gutter: SCREEN_GUTTER,
        topSpacing: spacing.md,
      })
      const enPantalla: Rect = { ...dibujado, y: dibujado.y - hero.scrollY }

      // Un hero scrolleado fuera de la ventana no sirve como origen: la obra
      // entraría volando desde arriba, que no explica nada.
      if (enPantalla.y + enPantalla.height <= 0 || enPantalla.y >= height) {
        armReturn(null)
        return
      }

      armReturn({
        portfolioItemId: hero.portfolioItemId,
        mediaPath: hero.mediaPath,
        blurhash: hero.blurhash,
        aspectRatio: DEFAULT_RATIO,
        from: enPantalla,
        scope,
      })
    },
    [scope, width, height, insets.top],
  )

  // Irse de la pantalla es desmontarse, y pasa igual con el botón, con el
  // gesto de borde y con el botón físico de Android. Por eso el desmontaje es
  // la señal: no hay que interceptar ninguno de los tres.
  useEffect(() => releaseReturn, [])

  if (claimed == null) {
    return { growing: null, heroPieceId: null, onArrived, armReturnTo }
  }

  const to = heroRect({
    screenWidth: width,
    insetTop: insets.top,
    // `DEFAULT_RATIO`, no `claimed.aspectRatio` (la forma real de la obra
    // tocada): mismo motivo que en `armReturnTo` — el carrusel del perfil ya
    // no respeta la forma real de cada foto.
    aspectRatio: DEFAULT_RATIO,
    gutter: SCREEN_GUTTER,
    topSpacing: spacing.md,
  })

  // La obra tocada manda como hero aunque no haya animación: llegar al perfil
  // y encontrar arriba otra obra distinta de la que se tocó es lo que la
  // transición existe para evitar, y eso vale también cuando no se anima.
  const heroPieceId = claimed.portfolioItemId

  if (arrived || !isWorthAnimating(claimed.from, to)) {
    return { growing: null, heroPieceId, onArrived, armReturnTo }
  }

  return { growing: { ...claimed, to }, heroPieceId, onArrived, armReturnTo }
}
