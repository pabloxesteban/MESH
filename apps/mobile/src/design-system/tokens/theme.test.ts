/**
 * El test que hace cumplir la accesibilidad del color.
 *
 * Verifica cada par de tokens que efectivamente se usa como texto o como
 * elemento gráfico significativo, en los DOS temas. Un token nuevo sin su par
 * declarado acá no está terminado.
 *
 * Esto existe porque el acento del brief (`#9C2D40`) mide ≈3,0:1 sobre la
 * superficie oscura y no pasa AA para texto. Es invisible para alguien con
 * buena vista en una buena pantalla, y obvio para un test.
 */

import { AA_LARGE, AA_TEXT, contrastRatio } from '../contrast.ts'
import { palette } from './palette.ts'
import { darkTheme, lightTheme, type Theme } from './theme.ts'

/** Pares texto-sobre-superficie que tienen que llegar a 4,5:1. */
const TEXT_PAIRS: ReadonlyArray<[keyof Theme, keyof Theme]> = [
  ['textPrimary', 'surface'],
  ['textSecondary', 'surface'],
  ['textTertiary', 'surface'],
  ['textPrimary', 'surfaceRaised'],
  ['textSecondary', 'surfaceRaised'],
  ['textTertiary', 'surfaceRaised'],
  ['textPrimary', 'surfaceSunken'],
  ['textSecondary', 'surfaceSunken'],
  ['accent', 'surface'],
  ['accent', 'surfaceRaised'],
  ['statePositive', 'surface'],
  ['stateNegative', 'surface'],
  ['stateWarning', 'surface'],
]

/** Elementos gráficos con significado: 3:1 alcanza. */
const GRAPHIC_PAIRS: ReadonlyArray<[keyof Theme, keyof Theme]> = [
  ['borderStrong', 'surface'],
  ['borderStrong', 'surfaceRaised'],
]

describe.each([
  ['oscuro', darkTheme],
  ['claro', lightTheme],
])('contraste · tema %s', (_name, theme) => {
  // El nombre del test lleva el par, así que cuando falla se lee qué combinación
  // se rompió y con qué relación quedó.
  it.each(TEXT_PAIRS)(`%s sobre %s llega a ${AA_TEXT}:1`, (fg, bg) => {
    const ratio = contrastRatio(theme[fg] as string, theme[bg] as string)
    expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(GRAPHIC_PAIRS)(`%s sobre %s llega a ${AA_LARGE}:1`, (fg, bg) => {
    const ratio = contrastRatio(theme[fg] as string, theme[bg] as string)
    expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(AA_LARGE)
  })

  it('el texto sobre un relleno de acento llega a AA', () => {
    expect(
      contrastRatio(theme.accentContrast, theme.accentFill),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('usa el color de marca al borde del gamut para el relleno', () => {
    // El relleno no se aclara: aclararlo es lo que dejaba los botones lavados.
    // Quien se aclara es el acento de TEXTO, y solo por contraste.
    expect(theme.accentFill).toBe(palette.brandVivid)
  })

  it('el texto sobre el relleno del segundo acento también llega a AA', () => {
    expect(
      contrastRatio(theme.accentContrast, theme.accentAltFill),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })

  // **El test que faltaba.** Un velo sobre una foto es oscuro en los dos temas,
  // así que lo que se dibuja encima no puede depender del tema. Sin esto, el
  // corazón de guardar era tinta sobre tinta en el tema oscuro —invisible, con
  // toda la feature de ADR-016 detrás— y nada lo veía: los tipos pasaban, el
  // lint pasaba, y el barrido de accesibilidad solo mira etiquetas y tamaños.
  it('lo que va sobre el velo se lee, en los dos temas', () => {
    expect(
      contrastRatio(theme.overlayContent, theme.overlayScrim),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('el corazón lleno también se lee sobre el velo, en los dos temas', () => {
    // `accentFill` y no `accent`: el acento del tema claro mide 3,79:1 sobre el
    // velo, por debajo de AA. El relleno es el mismo color en los dos temas,
    // que es justamente lo que pide algo que siempre va sobre lo mismo.
    expect(
      contrastRatio(theme.accentFill, theme.overlayScrim),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('el texto inverso llega a AA sobre la superficie del otro tema', () => {
    const other = theme.name === 'dark' ? lightTheme : darkTheme
    expect(
      contrastRatio(theme.textInverse, other.surface),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

describe('disciplina de la paleta', () => {
  it('todo relleno lleva su texto con AA', () => {
    // Es lo que hace legible a un chip de color. Los rellenos son dos por
    // familia y llevan texto distinto: el claro va sobre oscuro y lleva tinta,
    // el oscuro va sobre papel y lleva papel.
    const claros = Object.entries(palette).filter(
      ([key]) => key.endsWith('Vivid') && !key.endsWith('DeepVivid'),
    )
    const oscuros = Object.entries(palette).filter(([key]) =>
      key.endsWith('DeepVivid'),
    )
    expect(claros.length).toBeGreaterThan(5)
    expect(oscuros.length).toBe(claros.length)

    const flojos = [
      ...claros.filter(
        ([, value]) => contrastRatio(palette.ink900, value) < AA_TEXT,
      ),
      ...oscuros.filter(
        ([, value]) => contrastRatio(palette.paper100, value) < AA_TEXT,
      ),
    ].map(([key]) => key)
    expect(flojos).toEqual([])
  })

  it('el acento de texto está resuelto contra la superficie ELEVADA', () => {
    // El fondo más exigente del tema oscuro es `ink800`, no `ink900`: es más
    // claro, así que un texto claro tiene menos contraste contra él. Resolver
    // contra `ink900` deja colores que pasan en el fondo de la pantalla y
    // fallan dentro de una tarjeta, que es donde viven los chips.
    expect(
      contrastRatio(darkTheme.accent, palette.ink800),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('usa el acento resuelto para cada tema, no el mismo en los dos', () => {
    expect(darkTheme.accent).toBe(palette.brandOnDark)
    expect(lightTheme.accent).toBe(palette.brandOnLight)
    expect(darkTheme.accent).not.toBe(lightTheme.accent)
  })

  it('no usa verde ni rojo como tokens de superficie o de texto', () => {
    // Me gusta / paso nunca se colorean: es una UI de juicio y pertenece a las
    // apps de citas. Los tokens de estado son solo para feedback del sistema.
    for (const theme of [darkTheme, lightTheme]) {
      for (const key of ['surface', 'surfaceRaised', 'textPrimary'] as const) {
        expect([
          palette.positive,
          palette.positiveRaised,
          palette.negative,
          palette.negativeRaised,
        ]).not.toContain(theme[key])
      }
    }
  })
})
