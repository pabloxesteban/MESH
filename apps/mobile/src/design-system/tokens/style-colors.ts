/**
 * Color por estilo.
 *
 * **El color significa algo.** Un chip violeta siempre es blackwork, en toda la
 * app; uno turquesa siempre es línea fina. Eso convierte al color en
 * información en vez de en decoración, y es lo que le permite a MESH tener
 * color sin competirle a la obra: la interfaz se colorea con el vocabulario del
 * oficio, no con una paleta inventada por encima.
 *
 * Los estilos se agrupan en familias porque quince tonos distinguibles no
 * existen. Los que comparten familia son los que comparten aire: `fine-line` y
 * `minimalist` son la misma idea con distinto nombre, `old-school`,
 * `traditional` y `neo-traditional` son un linaje.
 *
 * Agregar un estilo a la taxonomía obliga a asignarle familia acá — el tipo lo
 * exige. Es a propósito: un estilo sin color quedaría gris entre chips de
 * colores y se leería como deshabilitado.
 */

import { palette } from './palette.ts'
import type { Theme } from './theme.ts'

export type StyleFamily =
  | 'line'
  | 'shade'
  | 'dot'
  | 'classic'
  | 'real'
  | 'flow'
  | 'east'
  | 'letter'
  | 'gold'
  | 'hand'

/**
 * Familia de cada estilo de la taxonomía de tatuaje.
 *
 * El tipo es `Record<string, StyleFamily>` y no un mapa exhaustivo sobre los
 * slugs porque `packages/domain` no puede importarse desde acá sin arrastrar el
 * dominio al design system. Un test verifica que la cobertura sea completa en
 * las dos direcciones.
 */
export const STYLE_FAMILY: Readonly<Record<string, StyleFamily>> = {
  'fine-line': 'line',
  minimalist: 'line',

  blackwork: 'shade',
  'black-and-grey': 'shade',

  dotwork: 'dot',
  ornamental: 'dot',

  'old-school': 'classic',
  traditional: 'classic',
  'neo-traditional': 'classic',

  realism: 'real',
  watercolor: 'flow',
  japanese: 'east',
  lettering: 'letter',
  'fileteado-porteno': 'gold',
  handpoke: 'hand',
}

export interface StyleColor {
  /** Para TEXTO del color de la familia sobre la superficie del tema. */
  readonly text: string
  /**
   * Para RELLENOS, barras y puntos. Saturado, y **distinto en cada tema**.
   *
   * Un relleno tiene dos requisitos a la vez: distinguirse de la superficie y
   * sostener texto. Sobre oscuro los cumple un color claro; sobre claro, uno
   * oscuro. Usar el mismo en los dos deja los chips invisibles en uno de ellos.
   */
  readonly vivid: string
  /** El texto que se puede escribir sobre `vivid`. También cambia por tema. */
  readonly onVivid: string
}

const ON_DARK: Readonly<Record<StyleFamily, string>> = {
  line: palette.lineOnDark,
  shade: palette.shadeOnDark,
  dot: palette.dotOnDark,
  classic: palette.classicOnDark,
  real: palette.realOnDark,
  flow: palette.flowOnDark,
  east: palette.eastOnDark,
  letter: palette.letterOnDark,
  gold: palette.goldOnDark,
  hand: palette.handOnDark,
}

const ON_LIGHT: Readonly<Record<StyleFamily, string>> = {
  line: palette.lineOnLight,
  shade: palette.shadeOnLight,
  dot: palette.dotOnLight,
  classic: palette.classicOnLight,
  real: palette.realOnLight,
  flow: palette.flowOnLight,
  east: palette.eastOnLight,
  letter: palette.letterOnLight,
  gold: palette.goldOnLight,
  hand: palette.handOnLight,
}

/** Relleno sobre oscuro: claro y saturado, lleva tinta encima. */
const VIVID_ON_DARK: Readonly<Record<StyleFamily, string>> = {
  line: palette.lineVivid,
  shade: palette.shadeVivid,
  dot: palette.dotVivid,
  classic: palette.classicVivid,
  real: palette.realVivid,
  flow: palette.flowVivid,
  east: palette.eastVivid,
  letter: palette.letterVivid,
  gold: palette.goldVivid,
  hand: palette.handVivid,
}

/** Relleno sobre papel: oscuro y saturado, lleva papel encima. */
const VIVID_ON_LIGHT: Readonly<Record<StyleFamily, string>> = {
  line: palette.lineDeepVivid,
  shade: palette.shadeDeepVivid,
  dot: palette.dotDeepVivid,
  classic: palette.classicDeepVivid,
  real: palette.realDeepVivid,
  flow: palette.flowDeepVivid,
  east: palette.eastDeepVivid,
  letter: palette.letterDeepVivid,
  gold: palette.goldDeepVivid,
  hand: palette.handDeepVivid,
}

/**
 * Color de un estilo, resuelto para el tema actual.
 *
 * Un slug desconocido cae en el acento de marca en vez de romper. Pasa cuando
 * el catálogo tiene un estilo más nuevo que el bundle instalado, y un chip del
 * color de la marca es raro pero legible; uno transparente no se ve.
 */
export function styleColor(styleSlug: string, theme: Theme): StyleColor {
  const family = STYLE_FAMILY[styleSlug]
  if (family == null) {
    return {
      text: theme.accent,
      vivid: theme.accentFill,
      onVivid: theme.accentContrast,
    }
  }

  const dark = theme.name === 'dark'
  return {
    text: dark ? ON_DARK[family] : ON_LIGHT[family],
    vivid: dark ? VIVID_ON_DARK[family] : VIVID_ON_LIGHT[family],
    // Los rellenos están calculados para llevar exactamente este texto. Si
    // alguna familia dejara de pasar, el generador de la paleta falla antes.
    onVivid: dark ? palette.ink900 : palette.paper100,
  }
}

export const STYLE_FAMILIES: readonly StyleFamily[] = [
  'line',
  'shade',
  'dot',
  'classic',
  'real',
  'flow',
  'east',
  'letter',
  'gold',
  'hand',
]
