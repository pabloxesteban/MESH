/**
 * Movimiento.
 *
 * El movimiento comunica dirección, confirmación, conexión y jerarquía. Lo que
 * no comunique alguna de esas cuatro no se publica.
 *
 * **Nada supera los 500ms.** Verificado por un test: una duración que se cuela
 * por encima de eso rompe el build, no la revisión.
 *
 * Las duraciones en línea son un error de lint. Si algo "queda mejor" con otro
 * tiempo, ese tiempo se nombra y se agrega acá.
 *
 * **Datos puros, sin dependencias.** Los easings son los cuatro puntos de
 * control de una curva de Bézier, no objetos `Easing` de Reanimated. Importar
 * Reanimated acá arrastraba su stack nativo a cualquier archivo que tocara un
 * token, incluidos los tests de contraste, que no tienen nada que ver con
 * animaciones. Quien anima construye la curva en el momento de usarla.
 */

/** Techo absoluto. Ver docs/design/visual-language.md §7. */
export const MAX_DURATION = 500

export const duration = {
  /** Cambios de estado, presiones. */
  instant: 120,
  /** Fundidos, cambios de chip. */
  quick: 200,
  /** Transiciones de pantalla, hojas. */
  standard: 280,
  /** Revelación del gusto. El único que llega al techo. */
  reveal: 500,
} as const

export type Duration = keyof typeof duration

/** Puntos de control de Bézier: `Easing.bezier(...easing.out)`. */
export const easing = {
  /** Todo lo que entra o cambia. */
  out: [0.22, 1, 0.36, 1],
  /** Todo lo que sale. */
  in: [0.64, 0, 0.78, 0],
} as const satisfies Record<string, readonly [number, number, number, number]>

/**
 * Resortes.
 *
 * `deck` conserva la velocidad del gesto: la tarjeta se va por donde la
 * empujaron. El arrastre en sí no lleva easing — sigue al dedo exactamente, y
 * la física recién arranca cuando el dedo se levanta.
 */
export const spring = {
  standard: { damping: 22, stiffness: 220, mass: 1 },
  deck: { damping: 18, stiffness: 180, mass: 1 },
} as const

export type Spring = keyof typeof spring

/** Escalonado de la revelación del gusto. */
export const STAGGER = 60

/**
 * Duración cuando el sistema pide movimiento reducido.
 *
 * La reducción de movimiento reemplaza toda transición basada en
 * transformación por un fundido corto. Nada queda inalcanzable — un usuario con
 * movimiento reducido ve las mismas pantallas, no menos.
 */
export const REDUCED_DURATION = duration.instant
