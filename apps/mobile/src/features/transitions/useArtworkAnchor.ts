/**
 * El ancla de una obra: su referencia, y su anotación en el registro.
 *
 * Toda tarjeta que muestra una obra necesita las dos cosas y siempre juntas: la
 * referencia para medirse al ir, y estar anotada para que la vuelta la
 * encuentre. Separarlas era garantizar que en algún momento alguien agregue una
 * grilla nueva con lo primero y sin lo segundo, y que la vuelta deje de
 * funcionar ahí sin que nada falle.
 */

import { useEffect, useRef } from 'react'
import type { View } from 'react-native'

import { registerArtwork, type ArtworkScope } from './artworkRegistry.ts'
import { measureRect } from './openArtwork.ts'

export function useArtworkAnchor(
  scope: ArtworkScope,
  portfolioItemId: string,
): React.RefObject<View | null> {
  const view = useRef<View | null>(null)

  useEffect(() => {
    // Se registra la función, no la posición: cuando la vuelta pregunte, la
    // grilla puede haberse movido, y lo único que sirve es medir en ese
    // momento.
    return registerArtwork(scope, portfolioItemId, () =>
      measureRect(view.current),
    )
  }, [scope, portfolioItemId])

  return view
}
