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

  // Acento de marca.
  //
  // Son dos roles, no uno. `accent` es para texto e íconos sobre la superficie
  // del tema, y para pasar AA tiene que aclararse — lo que le saca saturación.
  // `accentFill` es el color de marca al borde del gamut, que solo se usa como
  // relleno con `accentContrast` encima. Usar el mismo valor para las dos cosas
  // deja los botones lavados.
  readonly accent: string
  readonly accentFill: string
  /**
   * El segundo color de la marca. El acento dice "esto es MESH"; este dice
   * "esto es tuyo": aparece en el gusto, en los guardados y en el degradado de
   * los momentos de revelación.
   */
  readonly accentAlt: string
  readonly accentAltFill: string

  // Feedback del sistema.
  readonly statePositive: string
  readonly stateNegative: string
  readonly stateWarning: string

  // Velo sobre imágenes. Siempre tinta con opacidad, nunca coloreado.
  readonly overlayScrim: string
  /**
   * Contenido sobre `overlayScrim`.
   *
   * Existe porque `textInverse` **no** sirve para esto y el error no se ve a
   * ojo hasta que se mira la pantalla: `overlayScrim` es tinta en los dos
   * temas —un velo sobre una foto siempre es oscuro— y en el tema oscuro
   * `textInverse` también es tinta. El corazón de guardar quedaba negro sobre
   * negro: invisible en el tema por defecto de la app, con la feature entera
   * de ADR-016 detrás.
   *
   * Es papel en los dos temas, y mide 17:1 sobre el velo. Hay un test.
   */
  readonly overlayContent: string

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
  // Tinta sobre el rosa de marca, no papel: `brandVivid` es un color claro y
  // saturado, y el papel encima mide 1,9:1. Tinta mide 4,7:1.
  accentContrast: palette.ink900,
  textInverse: palette.ink900,

  borderSubtle: palette.ink700,
  // ink400 y no ink500: el test de contraste rechazó ink500 con 2,62:1 sobre
  // la superficie oscura, por debajo del 3:1 que necesita un elemento gráfico
  // con significado. Es un error que a ojo no se ve.
  borderStrong: palette.ink400,

  accent: palette.brandOnDark,
  accentFill: palette.brandVivid,
  accentAlt: palette.shadeOnDark,
  accentAltFill: palette.shadeVivid,

  statePositive: palette.positiveRaised,
  stateNegative: palette.negativeRaised,
  stateWarning: palette.warningRaised,

  overlayScrim: palette.ink900,
  overlayContent: palette.paper100,

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
  accentContrast: palette.ink900,
  textInverse: palette.paper100,

  borderSubtle: palette.paper300,
  // Mismo neutro medio que en oscuro: paper400 medía 1,98:1 sobre papel.
  borderStrong: palette.ink400,

  accent: palette.brandOnLight,
  accentFill: palette.brandVivid,
  accentAlt: palette.shadeOnLight,
  accentAltFill: palette.shadeVivid,

  statePositive: palette.positive,
  stateNegative: palette.negative,
  stateWarning: palette.warning,

  overlayScrim: palette.ink900,
  overlayContent: palette.paper100,

  pressedOpacity: 0.62,
  disabledOpacity: 0.38,
}

export const themes = { dark: darkTheme, light: lightTheme } as const

export type ThemeName = keyof typeof themes
export type ColorToken = {
  [K in keyof Theme]: Theme[K] extends string ? K : never
}[keyof Theme]
