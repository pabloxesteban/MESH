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

import { useCallback, useState } from 'react'
import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SCREEN_GUTTER, spacing } from '@/design-system/index.ts'

import { heroRect, isWorthAnimating, type Rect } from './geometry.ts'
import { claimArtwork, type ArtworkHandoff } from './sharedArtwork.ts'

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
}

export function useArtworkEntrance(professionalSlug: string): ArtworkEntrance {
  const { width } = useWindowDimensions()
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

  if (claimed == null) {
    return { growing: null, heroPieceId: null, onArrived }
  }

  const to = heroRect({
    screenWidth: width,
    insetTop: insets.top,
    aspectRatio: claimed.aspectRatio,
    gutter: SCREEN_GUTTER,
    topSpacing: spacing.md,
  })

  // La obra tocada manda como hero aunque no haya animación: llegar al perfil
  // y encontrar arriba otra obra distinta de la que se tocó es lo que la
  // transición existe para evitar, y eso vale también cuando no se anima.
  const heroPieceId = claimed.portfolioItemId

  if (arrived || !isWorthAnimating(claimed.from, to)) {
    return { growing: null, heroPieceId, onArrived }
  }

  return { growing: { ...claimed, to }, heroPieceId, onArrived }
}
