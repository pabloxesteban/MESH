/**
 * La vuelta, del lado de la grilla.
 *
 * Cuando el perfil se desmonta suelta la obra, y la superficie de la que salió
 * la recibe acá: la busca entre sus tarjetas visibles, esconde la que
 * corresponde y anima la copia desde donde estaba el hero hasta el hueco que
 * dejó.
 *
 * **Tres motivos para no animar, y los tres terminan igual de bien.** La
 * tarjeta ya no está montada porque la grilla scrolleó lejos; está montada pero
 * fuera de la ventana; o está prácticamente donde estaba el hero. En los tres
 * casos la pantalla simplemente se cierra, que es lo que pasaba antes de que
 * esta transición existiera. Una obra que encoge hacia un punto que no se ve es
 * peor que ninguna animación: el ojo la sigue hasta la nada.
 */

import { useCallback, useEffect, useState } from 'react'
import { useWindowDimensions } from 'react-native'

import { measureArtwork, type ArtworkScope } from './artworkRegistry.ts'
import { isWorthAnimating, type Rect } from './geometry.ts'
import {
  claimReturn,
  subscribeReturn,
  type ReturnHandoff,
} from './sharedArtwork.ts'

export interface ArtworkReturn {
  /** La obra volviendo, mientras vuelve. `null` el resto del tiempo. */
  readonly shrinking: (ReturnHandoff & { readonly to: Rect }) | null
  /**
   * La tarjeta que hay que esconder mientras la copia viaja.
   *
   * Si no se escondiera, la obra se vería dos veces —quieta en su lugar y
   * viajando hacia él— y la transición mostraría el truco justo al final.
   */
  readonly hiddenPieceId: string | null
  /** La copia llegó: la tarjeta real vuelve a mostrarse. */
  readonly onArrived: () => void
}

export function useArtworkReturn(scope: ArtworkScope): ArtworkReturn {
  const window = useWindowDimensions()
  const [shrinking, setShrinking] = useState<
    (ReturnHandoff & { to: Rect }) | null
  >(null)

  useEffect(() => {
    const intentar = () => {
      const handoff = claimReturn(scope)
      if (handoff == null) return

      // La posición se pregunta ahora, no se recuerda: la de cuando se abrió el
      // perfil no vale nada si la grilla se movió mientras tanto.
      const to = measureArtwork(scope, handoff.portfolioItemId, {
        width: window.width,
        height: window.height,
      })
      if (to == null || !isWorthAnimating(handoff.from, to)) return

      setShrinking({ ...handoff, to })
    }

    const unsubscribe = subscribeReturn(intentar)

    // Y una vez al montar, en el fotograma siguiente.
    //
    // La suscripción sola no alcanza: si esta pantalla estaba desmontada
    // mientras el perfil estaba abierto —pasa cuando el navegador descarta lo
    // que hay debajo— el aviso se emitió antes de que existiera este efecto, y
    // la vuelta quedaría esperando para siempre. El valor sigue disponible, así
    // que se pregunta también acá.
    //
    // En el fotograma siguiente y no ahora mismo: recién montadas, las tarjetas
    // todavía no tienen posición, y medirlas devolvería ceros.
    const frame = requestAnimationFrame(intentar)

    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
    }
  }, [scope, window.width, window.height])

  const onArrived = useCallback(() => {
    setShrinking(null)
  }, [])

  return {
    shrinking,
    hiddenPieceId: shrinking?.portfolioItemId ?? null,
    onArrived,
  }
}
