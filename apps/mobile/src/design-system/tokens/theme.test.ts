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

import {
  AA_LARGE,
  AA_TEXT,
  blendOverBackground,
  contrastRatio,
} from '../contrast.ts'
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

  it('resuelve el relleno de acento por tema (ADR-031)', () => {
    // Hasta ADR-031, `accentFill` era el mismo valor —`brandVivid`, al borde
    // del gamut— en los dos temas, igual que las diez familias de estilo NO
    // hacían (`style-colors.ts` ya diferenciaba `vivid`/`deepVivid`). Con el
    // lima de marca eso deja de alcanzar: `brandVivid` mide 1,24:1 contra
    // papel, invisible como forma. El oscuro sigue usando el lima real; el
    // claro pasa a `brandDeepVivid`, el verde oscuro que sí se distingue del
    // papel.
    expect(theme.accentFill).toBe(
      theme.name === 'dark' ? palette.brandVivid : palette.brandDeepVivid,
    )
  })

  // `accentAltFill` (violeta, hue 295°) resuelto por tema, igual que
  // `accentFill` desde ADR-031 y que ya hacía cada familia de
  // `style-colors.ts`: oscuro usa `shadeVivid` (lleva tinta encima), claro
  // usa `shadeDeepVivid` (lleva papel encima). Antes usaba `shadeVivid` en
  // los dos temas y pasaba de pura casualidad, porque `accentContrast` era
  // `ink900` en los dos temas — una coincidencia, no un diseño. ADR-031 hizo
  // que `accentContrast` dependiera del tema y destapó la coincidencia rota
  // (`paper100` sobre `shadeVivid` medía 3,51:1); esto la resuelve de raíz.
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

  // `accentFill` dejó de ser invariante por tema desde ADR-031 (resuelve
  // `brandDeepVivid` en claro para distinguirse de PAPEL) — y `SaveHeart.tsx`
  // pinta el corazón lleno sobre `overlayScrim`, que sigue siendo `ink900` en
  // los dos temas y NUNCA es papel. `brandDeepVivid` mide 3,75:1 contra
  // `ink900`: por debajo de AA. Por eso existe `accentOnScrim`, invariante
  // como el propio velo, resuelto en `brandVivid` (13,71:1) en los dos temas.
  it('el corazón lleno también se lee sobre el velo, en los dos temas', () => {
    expect(
      contrastRatio(theme.accentOnScrim, theme.overlayScrim),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('el texto inverso llega a AA sobre la superficie del otro tema', () => {
    const other = theme.name === 'dark' ? lightTheme : darkTheme
    expect(
      contrastRatio(theme.textInverse, other.surface),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

describe('heroGlow (ADR-032)', () => {
  // El fondo real del gradiente es `theme.surface` — es donde vive
  // `IntentScreen.tsx`, el primer consumidor. El pico (location 0) es el
  // punto más intenso, y es el que tiene que convivir con `textPrimary`
  // dibujado encima.
  it.each([
    ['oscuro', darkTheme],
    ['claro', lightTheme],
  ])(
    'el pico deja textPrimary con el doble del mínimo AA — tema %s',
    (_name, theme) => {
      const peak = blendOverBackground(theme.heroGlow.colors[0], theme.surface)
      const ratio = contrastRatio(theme.textPrimary, peak)
      expect(ratio).toBeGreaterThanOrEqual(AA_TEXT * 2)
    },
  )

  it('el segundo stop es transparente, no un hex — no compite con el contenido de abajo', () => {
    for (const theme of [darkTheme, lightTheme]) {
      expect(theme.heroGlow.colors[1]).toBe('transparent')
    }
  })

  it('locations van de 0 a 0,55 — se apaga antes de llegar a las tarjetas de abajo', () => {
    for (const theme of [darkTheme, lightTheme]) {
      expect(theme.heroGlow.locations).toEqual([0, 0.55])
    }
  })

  // El control que explica por qué el techo quedó en 28%/16% y no más alto:
  // reproduce, corriendo, el punto que el ADR describe a mano — al 50% de
  // opacidad el mismo pico en tema oscuro ya no sostiene AA para el texto
  // encima. No es una aserción sobre el token real (el token nunca usa 50%);
  // es la evidencia de por qué no lo hace.
  it('control: al 50% de opacidad en oscuro, el mismo pico ya NO pasa AA', () => {
    const fiftyPercent = `${peakBase(darkTheme)}80`
    const blend = blendOverBackground(fiftyPercent, darkTheme.surface)
    const ratio = contrastRatio(darkTheme.textPrimary, blend)
    expect(ratio).toBeLessThan(AA_TEXT)
  })
})

/** El color base (sin sufijo de alfa) del stop más intenso de `heroGlow`. */
function peakBase(theme: Theme): string {
  return theme.heroGlow.colors[0].slice(0, 7)
}

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
