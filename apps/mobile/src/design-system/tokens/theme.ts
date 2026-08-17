/**
 * Tokens semánticos.
 *
 * Los componentes consumen esto y nada más. Un componente que necesita un
 * literal de `palette.ts` está señalando que a esta capa le falta un token:
 * agregalo acá, con un nombre que diga para qué es.
 *
 * Los dos temas están completos. Un componente que solo funciona en oscuro no
 * está terminado. El oscuro es el predeterminado: es el marco correcto para la
 * fotografía y es lo que hace una galería.
 *
 * Todo par de estos tokens que se use como texto sobre superficie tiene que
 * pasar el test de contraste (theme.test.ts). El acento de la marca no pasa AA
 * sobre superficie oscura, y esa es exactamente la clase de error que una
 * revisión visual no encuentra.
 */

import { palette } from './palette.ts'

export interface Theme {
  readonly name: 'dark' | 'light'

  // Superficies
  readonly surface: string
  readonly surfaceRaised: string
  readonly surfaceSunken: string

  // Texto
  readonly textPrimary: string
  readonly textSecondary: string
  readonly textTertiary: string
  /** Texto sobre un relleno de acento. */
  readonly accentContrast: string
  /** Texto sobre una superficie invertida respecto del tema. */
  readonly textInverse: string

  // Bordes. La elevación se expresa con valor de superficie y bordes de un
  // píxel, no con sombras: sobre una superficie oscura cálida, una sombra
  // parece suciedad.
  readonly borderSubtle: string
  readonly borderStrong: string

  // Acento. Aparece como máximo una vez por pantalla.
  //
  // Son dos roles, no uno. `accent` es para texto e íconos sobre la superficie
  // del tema, y sobre oscuro tiene que aclararse bastante para pasar AA — lo
  // que le saca saturación. `accentFill` es el rojo de marca sin aclarar, que
  // solo se usa como relleno con `accentContrast` encima. Usar el mismo valor
  // para las dos cosas deja los botones rosados y apagados.
  readonly accent: string
  readonly accentFill: string

  // Feedback del sistema.
  readonly statePositive: string
  readonly stateNegative: string
  readonly stateWarning: string

  // Velo sobre imágenes. Siempre tinta con opacidad, nunca coloreado.
  readonly overlayScrim: string

  // Estados de interacción, como opacidad.
  readonly pressedOpacity: number
  readonly disabledOpacity: number
}

export const darkTheme: Theme = {
  name: 'dark',

  surface: palette.ink900,
  surfaceRaised: palette.ink800,
  surfaceSunken: palette.black,

  textPrimary: palette.paper100,
  textSecondary: palette.paper300,
  textTertiary: palette.paper400,
  accentContrast: palette.paper100,
  textInverse: palette.ink900,

  borderSubtle: palette.ink700,
  // ink400 y no ink500: el test de contraste rechazó ink500 con 2,62:1 sobre
  // la superficie oscura, por debajo del 3:1 que necesita un elemento gráfico
  // con significado. Es un error que a ojo no se ve.
  borderStrong: palette.ink400,

  accent: palette.signalRaised,
  accentFill: palette.signal,

  statePositive: palette.positiveRaised,
  stateNegative: palette.negativeRaised,
  stateWarning: palette.warningRaised,

  overlayScrim: palette.ink900,

  pressedOpacity: 0.62,
  disabledOpacity: 0.38,
}

export const lightTheme: Theme = {
  name: 'light',

  surface: palette.paper100,
  surfaceRaised: palette.paper050,
  surfaceSunken: palette.paper200,

  textPrimary: palette.ink900,
  textSecondary: palette.ink600,
  textTertiary: palette.ink500,
  accentContrast: palette.paper100,
  textInverse: palette.paper100,

  borderSubtle: palette.paper300,
  // Mismo neutro medio que en oscuro: paper400 medía 1,98:1 sobre papel.
  borderStrong: palette.ink400,

  accent: palette.signal,
  accentFill: palette.signal,

  statePositive: palette.positive,
  stateNegative: palette.negative,
  stateWarning: palette.warning,

  overlayScrim: palette.ink900,

  pressedOpacity: 0.62,
  disabledOpacity: 0.38,
}

export const themes = { dark: darkTheme, light: lightTheme } as const

export type ThemeName = keyof typeof themes
export type ColorToken = {
  [K in keyof Theme]: Theme[K] extends string ? K : never
}[keyof Theme]
