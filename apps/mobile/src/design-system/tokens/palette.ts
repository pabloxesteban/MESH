/**
 * GENERADO — no editar a mano.
 *
 * Regenerar con: npm run brand:palette
 * Fuente: tools/brand/src/build-palette.mjs
 *
 * **Este es el único archivo del repositorio con un valor hex.** En cualquier
 * otro lado es un error de lint. Ver ADR-008.
 *
 * Nada fuera de `theme.ts` importa esto: los componentes consumen tokens
 * semánticos (`textSecondary`), nunca literales (`ink500`). Si un componente
 * necesita un literal, a la capa semántica le falta un token.
 *
 * ## Por qué está generado
 *
 * Los colores no se eligen a ojo: se **calculan**. Cada familia se define por su
 * tono en OKLCH, y de ahí se busca la luminosidad exacta a la que ese tono
 * alcanza el contraste que necesita contra la superficie donde va a vivir.
 *
 * Elegir a ojo produce el error que ya nos pasó dos veces acá: un color que se
 * ve bien y mide 2,6:1.
 *
 * ## Los tres roles, y por qué son tres
 *
 * · `onDark`  — TEXTO sobre superficie oscura, ≥ 4,5:1. Para llegar ahí un
 *   color tiene que ser claro, y claro le saca saturación. Es física.
 * · `onLight` — TEXTO sobre papel, ≥ 4,5:1.
 * · `vivid`   — el color de verdad, empujado al borde del gamut. Es para
 *   RELLENOS, barras, puntos y degradados: un objeto gráfico necesita 3:1, no
 *   4,5:1, y esos 1,5 puntos son toda la diferencia entre un teal apagado y uno
 *   que se ve.
 *
 * Usar `onDark` como relleno deja la interfaz lavada. Usar `vivid` como texto
 * la deja ilegible.
 */

export const palette = {
  // Tinta → papel. Son mezclas de tinta y papel, no gris: el sistema se
  // mantiene cálido, y sobre un neutro cálido la fotografía de piel se ve como
  // piel. Ver docs/design/visual-language.md §4.
  //
  // ADR-032: ink950 es la superficie del tema oscuro. Sigue la misma
  // proporción de canal que ink900 (R=G, B levemente mayor) escalada hacia
  // black sin llegar a acromático — el mismo negro-cálido de la escala, un
  // escalón más cerca de negro real. No sale del solver OKLCH: como el resto
  // de esta escala, es un neutro fijado a mano por la misma razón que ink900 y
  // ink800 ya lo eran (un neutro cálido no es un tono a resolver por contraste
  // contra sí mismo, es la base de la que el resto se resuelve).
  ink950: '#040406',
  ink900: '#0C0C0E',
  ink800: '#1A1A1D',
  ink700: '#2C2B2E',
  ink600: '#3E3C41',
  ink500: '#56545A',
  ink400: '#6F6D74',
  ink300: '#8C8A90',
  paper400: '#B3ABA0',
  paper300: '#C9C2B6',
  paper200: '#E2DCD1',
  paper100: '#F4EFE6',
  paper050: '#FAF7F1',

  black: '#000000',
  white: '#FFFFFF',

  // brand
  brandOnDark: '#718C01',
  brandOnLight: '#5F7500',
  brandVivid: '#BEE800',
  brandDeepVivid: '#5F7500',

  // line
  lineOnDark: '#0A9191',
  lineOnLight: '#077A7A',
  lineVivid: '#009A9A',
  lineDeepVivid: '#007A7B',

  // shade
  shadeOnDark: '#8E71D6',
  shadeOnLight: '#795BBF',
  shadeVivid: '#955BFF',
  shadeDeepVivid: '#8A37FF',

  // dot
  dotOnDark: '#AF7706',
  dotOnLight: '#946304',
  dotVivid: '#B37900',
  dotDeepVivid: '#956300',

  // classic
  classicOnDark: '#D15F4A',
  classicOnLight: '#B94935',
  classicVivid: '#F32B00',
  classicDeepVivid: '#D42400',

  // real
  realOnDark: '#3C83DA',
  realOnLight: '#256DC2',
  realVivid: '#0083FD',
  realDeepVivid: '#006CD1',

  // flow
  flowOnDark: '#C25FA4',
  flowOnLight: '#A94A8E',
  flowVivid: '#E400B7',
  flowDeepVivid: '#CB00A3',

  // east
  eastOnDark: '#D25C61',
  eastOnLight: '#BA464D',
  eastVivid: '#F80042',
  eastDeepVivid: '#DB0039',

  // letter
  letterOnDark: '#3A943D',
  letterOnLight: '#207D27',
  letterVivid: '#00A320',
  letterDeepVivid: '#007F17',

  // gold
  goldOnDark: '#998007',
  goldOnLight: '#816B05',
  goldVivid: '#9E8400',
  goldDeepVivid: '#816B00',

  // hand
  handOnDark: '#049561',
  handOnLight: '#037D51',
  handVivid: '#009F68',
  handDeepVivid: '#007D51',

  // Feedback del sistema. Nunca se usan para me gusta / paso: eso es una UI de
  // juicio y pertenece a las apps de citas. Ver visual-language.md §4.
  positive: '#2F5D3F',
  positiveRaised: '#7FB894',
  negative: '#993122',
  negativeRaised: '#E08C7C',
  warning: '#7A5A12',
  warningRaised: '#D9AE55',
} as const

export type PaletteToken = keyof typeof palette

/** Con qué color de texto se puede escribir sobre cada `vivid`. */
export const vividTextOn = {
  brand: 'ink900',
  line: 'ink900',
  shade: 'ink900',
  dot: 'ink900',
  classic: 'ink900',
  real: 'ink900',
  flow: 'ink900',
  east: 'ink900',
  letter: 'ink900',
  gold: 'ink900',
  hand: 'ink900',
} as const
