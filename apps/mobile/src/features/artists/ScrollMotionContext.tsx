/**
 * La posición de scroll de Inicio, compartida.
 *
 * El revelado editorial de cada tarjeta necesita la misma posición de scroll
 * y la misma velocidad que decenas de tarjetas leen en paralelo. Viven en
 * shared values de Reanimated, expuestas por un contexto liviano — nunca por
 * estado de React (un re-render por cada píxel de scroll no es negociable) ni
 * por prop drilling (la lista ya pasa por `Box` → `ArtistCard`, y no hay
 * ninguna razón de producto para que ese camino cargue con esto).
 *
 * Lo que viaja por el contexto es el objeto de shared values en sí,
 * memoizado una sola vez en `ArtistsScreen`: leerlo no dispara un render, solo
 * `.value` cambia, en el hilo de UI.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { SharedValue } from 'react-native-reanimated'

export interface ScrollMotion {
  /** Posición vertical de scroll, en px de contenido. */
  readonly scrollY: SharedValue<number>
  /**
   * Velocidad de scroll, en px/s, siempre positiva. Derivada a mano de
   * deltas de posición/tiempo entre eventos de scroll consecutivos —
   * `event.velocity` no es confiable en Android.
   */
  readonly speed: SharedValue<number>
  /**
   * Offset del contenedor de la lista dentro del contenido scrolleable — lo
   * que le falta al `itemTop` (relativo al contenedor) de cada tarjeta para
   * ser una posición absoluta dentro del scroll.
   */
  readonly listTop: SharedValue<number>
}

const ScrollMotionContext = createContext<ScrollMotion | null>(null)

export function ScrollMotionProvider({
  value,
  children,
}: {
  value: ScrollMotion
  children: ReactNode
}) {
  return (
    <ScrollMotionContext.Provider value={value}>
      {children}
    </ScrollMotionContext.Provider>
  )
}

/**
 * El scroll de Inicio, para quien necesite reaccionar a él.
 *
 * `null` fuera del proveedor, a propósito: una tarjeta que se renderiza sin
 * este contexto (el playground, un test aislado) simplemente no revela por
 * scroll — se queda en su estado resuelto — en vez de tirar.
 */
export function useScrollMotion(): ScrollMotion | null {
  return useContext(ScrollMotionContext)
}
