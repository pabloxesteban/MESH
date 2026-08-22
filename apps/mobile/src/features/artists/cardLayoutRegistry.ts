/**
 * Dónde está cada tarjeta de Inicio, para el snap del revelado editorial.
 *
 * El snap corre una sola vez por gesto, al terminar el momentum — no en cada
 * frame — así que no necesita las posiciones en el hilo de UI: solo necesita
 * poder preguntarlas en ese instante, desde el hilo de JS. Leer `.value` de un
 * shared value ahí es seguro; es una fotografía, no una suscripción.
 *
 * El patrón es el mismo que `features/transitions/artworkRegistry.ts`: quién
 * está montado y sabe medirse, no un caché de posiciones viejas.
 */

import type { SharedValue } from 'react-native-reanimated'

interface CardLayout {
  readonly top: SharedValue<number>
}

const registry = new Map<string, CardLayout>()

/**
 * Anota una tarjeta visible. Devuelve la función para borrarla.
 *
 * Pensado para usarse desde un efecto: `useEffect(() => registerCardLayout(...))`.
 */
export function registerCardLayout(id: string, layout: CardLayout): () => void {
  registry.set(id, layout)

  return () => {
    // Solo si sigue siendo la misma: si la tarjeta se remontó, la entrada
    // nueva es la buena y borrarla dejaría a esa tarjeta sin registrar.
    if (registry.get(id) === layout) registry.delete(id)
  }
}

/**
 * El borde superior de cada tarjeta montada, en coordenadas absolutas del
 * contenido scrolleable (`listTop` ya sumado).
 */
export function cardTopEdges(listTop: number): readonly number[] {
  return [...registry.values()].map((layout) => listTop + layout.top.value)
}

/** Solo para tests: deja el módulo como recién importado. */
export function __resetCardLayoutRegistry(): void {
  registry.clear()
}
