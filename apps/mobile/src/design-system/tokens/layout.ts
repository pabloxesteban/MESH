/**
 * Espaciado, radios y áreas táctiles.
 *
 * Escala de 8pt. Un valor numérico crudo de espaciado o de radio dentro de una
 * pantalla es un error de lint; si hace falta uno que no está acá, se le pone
 * nombre y se agrega. Ver ADR-008.
 */

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const

export type Spacing = keyof typeof spacing

export const radius = {
  /** Chips y etiquetas. */
  sm: 4,
  /**
   * Obra de portafolio mostrada como protagonista — el showcase spread de
   * Inicio, no una grilla de descubrimiento. Un corte, no un contenedor: la
   * mitad de `md` a propósito, para que la pieza se lea como objeto fotográfico
   * y no como una ficha de UI más. `radius.lg` no sirve acá — ese es el radio
   * del mazo, tarado para el gesto de swipe, y esta superficie ni se arrastra
   * ni se suelta.
   */
  art: 8,
  /** Tarjetas, hojas, campos. */
  md: 12,
  /** Tarjetas del mazo. Suavizadas, no redondeadas. */
  lg: 20,
  /** Píldoras. */
  full: 999,
} as const

export type Radius = keyof typeof radius

/** Margen lateral de pantalla. Generoso antes que denso. */
export const SCREEN_GUTTER = spacing.lg - spacing.xxs // 20

/**
 * Área táctil mínima.
 *
 * No es negociable y no es una recomendación: todo control interactivo llega a
 * esto, expandiendo con `hitSlop` cuando el elemento visual es más chico. El
 * camino por botones es el camino accesible principal del mazo, no un plan B.
 */
export const MIN_TOUCH_TARGET = 44

/** Grosor de los bordes de un píxel. La elevación no usa sombras. */
export const HAIRLINE = 1
