/**
 * Tocar una obra: medir dónde estaba y abrir el perfil.
 *
 * El orden es al revés del intuitivo: se mide **antes** de navegar, porque
 * después la vista ya no está. Pero hay una regla que está por encima de la
 * transición y que el primer intento de este archivo rompía:
 *
 * > **Abrir el perfil no puede depender de que la medición salga bien.**
 *
 * La primera versión navegaba adentro del callback de `measureInWindow`. En el
 * renderer de los tests ese callback no se llama nunca, y el resultado fue un
 * toque muerto: la grilla dejaba de llevar a ninguna parte. Lo encontró un test
 * que ya existía, y podría haber sido cualquier plataforma donde la medición
 * asincrónica se comporte distinto.
 *
 * Así que se mide **sincrónicamente** o no se mide. `getBoundingClientRect`
 * existe en la arquitectura nueva de React Native y en react-native-web, que
 * son las dos plataformas donde la app corre. Donde no exista, no hay
 * transición y el perfil se abre igual — sin animación, que es una pérdida
 * chica, y no sin navegación, que sería un defecto.
 */

import type { View } from 'react-native'

import { isUsableRect, type Rect } from './geometry.ts'
import { offerArtwork, type ArtworkHandoff } from './sharedArtwork.ts'

/** Lo que la pantalla de origen sabe de la obra, sin el rectángulo ni la hora. */
export type ArtworkIdentity = Omit<ArtworkHandoff, 'from' | 'at'>

/**
 * Lo mínimo que se le pide a una vista para poder medirla.
 *
 * Se describe estructuralmente en vez de importar el tipo de la plataforma:
 * `getBoundingClientRect` está en las vistas de la arquitectura nueva y en los
 * nodos del DOM, y los tipos de `react-native` todavía no lo declaran en
 * `View`.
 */
interface Measurable {
  getBoundingClientRect: () => {
    x: number
    y: number
    width: number
    height: number
  }
}

function canMeasure(view: unknown): view is Measurable {
  return (
    view != null &&
    typeof (view as Partial<Measurable>).getBoundingClientRect === 'function'
  )
}

/** El rectángulo de la vista en coordenadas de ventana, o `null`. */
export function measureRect(view: View | null): Rect | null {
  if (!canMeasure(view)) return null

  try {
    const { x, y, width, height } = view.getBoundingClientRect()
    const rect: Rect = { x, y, width, height }
    return isUsableRect(rect) ? rect : null
  } catch {
    // Una vista a medio desmontar puede tirar. No es motivo para no abrir el
    // perfil.
    return null
  }
}

export function openArtwork({
  view,
  artwork,
  open,
  now = Date.now,
}: {
  /** La vista que muestra la obra. `null` si ya no está montada. */
  view: View | null
  artwork: ArtworkIdentity
  /** Navegar al perfil. Se llama siempre, con o sin animación. */
  open: () => void
  now?: () => number
}): void {
  const from = measureRect(view)
  if (from != null) {
    offerArtwork({ ...artwork, from, at: now() })
  }
  open()
}
