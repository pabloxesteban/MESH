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
  // `accentFill` es el color de marca de verdad, empujado al borde del gamut,
  // que solo se usa como relleno con `accentContrast` encima. Usar el mismo
  // valor para las dos cosas deja los botones lavados.
  //
  // A diferencia de las diez familias de `style-colors.ts` (que ya
  // diferenciaban `vivid`/`deepVivid` por tema), `accentFill` compartía el
  // mismo valor en los dos temas hasta ADR-031: con el lima de marca eso mide
  // 1,24:1 contra papel, invisible como forma. Desde ADR-031 `accentFill`
  // también se resuelve por tema — oscuro usa el lima real (`brandVivid`,
  // L=0,87), claro usa el verde oscuro saturado (`brandDeepVivid`) que sí se
  // distingue del papel. `accentContrast` cambia con él: tinta en oscuro,
  // papel en claro.
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
  /**
   * Contenido de MARCA sobre `overlayScrim` — el corazón lleno de
   * `SaveHeart.tsx`, no texto neutro (eso es `overlayContent`).
   *
   * Invariante por tema, como `overlayScrim` mismo: `accentFill` dejó de
   * serlo desde ADR-031 (resuelve `brandDeepVivid` en claro para distinguirse
   * de PAPEL), pero eso no sirve acá porque el fondo nunca es papel — es
   * siempre `overlayScrim` (`ink900`). `brandDeepVivid` mide 3,75:1 contra
   * eso, por debajo de AA; `brandVivid` mide 13,71:1 en los dos temas, porque
   * el fondo con el que tiene que convivir nunca cambia.
   */
  readonly accentOnScrim: string

  // Estados de interacción, como opacidad.
  readonly pressedOpacity: number
  readonly disabledOpacity: number

  /**
   * Degradado de héroe. ADR-032.
   *
   * Puntual y acotado: acento al borde de un área chica, apagándose a
   * transparente antes de tocar el contenido de abajo. Nunca un degradado de
   * marca completo, nunca fondo permanente de pantalla, nunca sobre una
   * tarjeta o una miniatura de obra — eso sigue prohibido sin excepción
   * (visual-language.md §4). `HeroGlow` es el único componente que lo
   * consume.
   *
   * `colors` son strings con sufijo de alfa sobre un token de `palette.ts` ya
   * existente (nunca un hex nuevo escrito a mano) más la palabra reservada de
   * React Native `'transparent'` — no un hex, así que no hace falta vivir en
   * `palette.ts`. `locations` es dónde cae cada stop en el degradado, de 0 a
   * 1. El pico de opacidad está fijado en el doble del mínimo AA que necesita
   * el texto que se dibuja encima, no en el borde de lo que un test acepta —
   * ver theme.test.ts y ADR-032 para los números reales.
   */
  readonly heroGlow: {
    readonly colors: readonly [string, string]
    readonly locations: readonly [number, number]
  }
}

export const darkTheme: Theme = {
  name: 'dark',

  // ADR-032: ink950, no ink900. Un negro-cálido casi real (1,03:1 contra
  // `black`, invisible a ojo) en vez del gris-tinta que compartía con el tema
  // anterior — el fondo pasa a ser negro de verdad sin cruzar a negro puro
  // acromático. `surfaceRaised` se queda en `ink800`: la tarjeta salta más
  // que antes, así que la elevación se nota más, no menos.
  surface: palette.ink950,
  surfaceRaised: palette.ink800,
  surfaceSunken: palette.black,

  textPrimary: palette.paper100,
  textSecondary: palette.paper300,
  textTertiary: palette.paper400,
  // Tinta sobre el lima de marca, no papel: `brandVivid` es un color claro y
  // saturado (L=0,87), y el papel encima mide 1,9:1. Tinta mide 13,71:1. Ver
  // ADR-031.
  accentContrast: palette.ink900,
  textInverse: palette.ink900,

  borderSubtle: palette.ink700,
  // ink400 y no ink500: el test de contraste rechazó ink500 con 2,62:1 sobre
  // la superficie oscura, por debajo del 3:1 que necesita un elemento gráfico
  // con significado. Es un error que a ojo no se ve.
  borderStrong: palette.ink400,

  accent: palette.brandOnDark,
  // El lima real (L=0,87). Ver ADR-031: a diferencia de las diez familias de
  // estilo, `accentFill` YA NO es el mismo valor en los dos temas.
  accentFill: palette.brandVivid,
  accentAlt: palette.shadeOnDark,
  accentAltFill: palette.shadeVivid,

  statePositive: palette.positiveRaised,
  stateNegative: palette.negativeRaised,
  stateWarning: palette.warningRaised,

  overlayScrim: palette.ink900,
  overlayContent: palette.paper100,
  accentOnScrim: palette.brandVivid,

  pressedOpacity: 0.62,
  disabledOpacity: 0.38,

  // 28% del pico (`brandVivid47`) → transparente. Verificado con
  // contrastRatio(): `textPrimary` encima del pico mide 9,18:1, el doble del
  // mínimo AA — a 50% ya cae a 4,47:1 y no pasa (theme.test.ts). Ver ADR-032.
  heroGlow: {
    colors: [`${palette.brandVivid}47`, 'transparent'],
    locations: [0, 0.55],
  },
}

export const lightTheme: Theme = {
  name: 'light',

  surface: palette.paper100,
  surfaceRaised: palette.paper050,
  surfaceSunken: palette.paper200,

  textPrimary: palette.ink900,
  textSecondary: palette.ink600,
  textTertiary: palette.ink500,
  // Papel sobre el verde oscuro, no tinta: acá `accentFill` es
  // `brandDeepVivid`, que ya lleva papel encima (mide 4,55:1). Ver ADR-031.
  accentContrast: palette.paper100,
  textInverse: palette.paper100,

  borderSubtle: palette.paper300,
  // Mismo neutro medio que en oscuro: paper400 medía 1,98:1 sobre papel.
  borderStrong: palette.ink400,

  accent: palette.brandOnLight,
  // `brandDeepVivid`, no `brandVivid`: el lima real (L=0,87) mide 1,24:1 sobre
  // `paper100` — no se distingue del papel. El tema claro usa el verde oscuro
  // saturado que sí lleva papel encima. Ver ADR-031.
  accentFill: palette.brandDeepVivid,
  accentAlt: palette.shadeOnLight,
  // shadeDeepVivid, no shadeVivid: mismo motivo que accentFill arriba, y el
  // mismo patrón que ya usan las diez familias de `style-colors.ts`.
  // shadeVivid está pensado para llevar TINTA encima (accentContrast en
  // oscuro); en claro accentContrast es papel, y papel sobre shadeVivid mide
  // 3,51:1. shadeDeepVivid sí lleva papel encima.
  accentAltFill: palette.shadeDeepVivid,

  statePositive: palette.positive,
  stateNegative: palette.negative,
  stateWarning: palette.warning,

  overlayScrim: palette.ink900,
  overlayContent: palette.paper100,
  accentOnScrim: palette.brandVivid,

  pressedOpacity: 0.62,
  disabledOpacity: 0.38,

  // 16% del pico (`brandDeepVivid29`) → transparente. Un lima oscuro sobre
  // papel se ve más apagado por naturaleza —no hay negro de fondo contra el
  // que "prender"—, así que el techo seguro es más bajo que en oscuro:
  // `textPrimary` encima mide 13,91:1. Ver ADR-032.
  heroGlow: {
    colors: [`${palette.brandDeepVivid}29`, 'transparent'],
    locations: [0, 0.55],
  },
}

export const themes = { dark: darkTheme, light: lightTheme } as const

export type ThemeName = keyof typeof themes
export type ColorToken = {
  [K in keyof Theme]: Theme[K] extends string ? K : never
}[keyof Theme]
