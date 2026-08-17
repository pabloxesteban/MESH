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

  it('usa el rojo de marca sin aclarar para el relleno', () => {
    // El relleno no se aclara: aclararlo es lo que dejaba los botones rosados.
    // Quien se aclara es el acento de TEXTO, y solo sobre oscuro.
    expect(theme.accentFill).toBe(palette.signal)
  })

  it('el texto inverso llega a AA sobre la superficie del otro tema', () => {
    const other = theme.name === 'dark' ? lightTheme : darkTheme
    expect(
      contrastRatio(theme.textInverse, other.surface),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

describe('disciplina de la paleta', () => {
  it('deja documentado que el acento del brief no pasa AA sobre oscuro', () => {
    // Es la razón por la que existe `signalRaised`. Si esto alguna vez pasara,
    // alguien cambió la paleta y hay que revisar la decisión, no el test.
    expect(contrastRatio(palette.signal, palette.ink900)).toBeLessThan(AA_TEXT)
  })

  it('usa el acento aclarado sobre oscuro y el original sobre claro', () => {
    expect(darkTheme.accent).toBe(palette.signalRaised)
    expect(lightTheme.accent).toBe(palette.signal)
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
