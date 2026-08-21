#!/usr/bin/env node
/**
 * Genera la paleta de color de MESH.
 *
 * **Los hex no se eligen a ojo: se calculan.** Cada tono se define en OKLCH —
 * donde la luminosidad es perceptual, así que dos colores con la misma L se ven
 * igual de claros aunque uno sea amarillo y el otro azul— y después se busca la
 * luminosidad exacta a la que ese tono alcanza el contraste que necesita contra
 * la superficie donde va a vivir.
 *
 * Elegir a ojo produce exactamente el error que ya nos pasó dos veces en este
 * repositorio: un color que se ve bien y mide 2,6:1.
 *
 * Cada familia produce tres valores, y son tres porque son tres trabajos
 * distintos:
 *
 *   · `onDark`  — TEXTO sobre superficie oscura. ≥ 4,5:1 contra ink900. Para
 *     llegar ahí un color tiene que ser claro, y claro le saca saturación. No
 *     hay forma de evitarlo: es física, no gusto.
 *   · `onLight` — TEXTO sobre papel. ≥ 4,5:1 contra paper100.
 *   · `vivid`     — el color de verdad sobre OSCURO, empujado hasta el borde del
 *     gamut. Es para rellenos, barras, puntos y degradados, y lleva tinta
 *     encima.
 *   · `deepVivid`  — el equivalente sobre CLARO. Un relleno claro sobre papel no
 *     se distingue del papel, así que el mismo tono se resuelve hacia abajo
 *     hasta que el papel encima pase AA. Queda oscuro y saturado, y lleva papel
 *     encima.
 *
 * Son dos rellenos y no uno porque un relleno tiene dos requisitos a la vez:
 * distinguirse de la superficie Y sostener texto. Sobre oscuro los cumple un
 * color claro; sobre claro, uno oscuro.
 *
 * Usar `onDark` como relleno es el error que deja la interfaz lavada. Usar
 * `vivid` como texto es el que la deja ilegible.
 *
 * Uso:
 *   node tools/brand/src/build-palette.mjs           escribe palette.ts
 *   node tools/brand/src/build-palette.mjs --check   falla si quedó vieja
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const INK900 = '#0C0C0E'
const PAPER100 = '#F4EFE6'

/**
 * Los fondos contra los que se resuelve cada rol son los MÁS EXIGENTES de cada
 * tema, no los más comunes.
 *
 * Sobre oscuro eso es `ink800`, la superficie elevada: es más clara que
 * `ink900`, así que un texto claro tiene menos contraste contra ella. Resolver
 * contra `ink900` deja colores que pasan en el fondo de la pantalla y fallan
 * dentro de una tarjeta — que es exactamente donde viven los chips.
 *
 * Sobre claro el más exigente es `paper100`: `paper050` es más claro y le da más
 * contraste a un texto oscuro.
 */
const INK800 = '#1A1A1D'

// --- color -------------------------------------------------------------------

function srgbToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(value) {
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055
}

/** OKLCH → sRGB en [0,1]. Devuelve también si quedó fuera de gamut. */
function oklchToSrgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  const channels = [r, g, bl]
  const outOfGamut = channels.some((value) => value < -0.0001 || value > 1.0001)
  return {
    rgb: channels.map((value) => Math.min(1, Math.max(0, linearToSrgb(value)))),
    outOfGamut,
  }
}

/** OKLCH → hex, bajando la croma hasta que entre en gamut. */
function oklchToHex(L, C, h) {
  let chroma = C
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const { rgb, outOfGamut } = oklchToSrgb(L, chroma, h)
    if (!outOfGamut) return toHex(rgb)
    chroma *= 0.96
  }
  return toHex(oklchToSrgb(L, 0, h).rgb)
}

function toHex(rgb) {
  return (
    '#' +
    rgb
      .map((value) =>
        Math.round(value * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  )
}

function relativeLuminance(hex) {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((offset) =>
    srgbToLinear(Number.parseInt(value.slice(offset, offset + 2), 16) / 255),
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (p, q) => q - p,
  )
  return (x + 0.05) / (y + 0.05)
}

/** La croma máxima que entra en gamut para un tono y una luminosidad dados. */
function maxChroma(L, hue) {
  let low = 0
  let high = 0.4
  for (let step = 0; step < 30; step += 1) {
    const mid = (low + high) / 2
    if (oklchToSrgb(L, mid, hue).outOfGamut) high = mid
    else low = mid
  }
  return low
}

/**
 * Igual que `solveForContrast`, pero con la croma al borde del gamut en CADA
 * candidato de luminosidad.
 *
 * Hace falta porque la croma afecta la luminancia: resolver la luminosidad con
 * croma baja y después empujar la croma mueve el contraste, y lo mueve hacia
 * abajo. Empujarla primero y medir después es lo único que da un color que de
 * verdad cumple.
 */
function solveVivid(hue, background, target) {
  let low = 0.15
  let high = 0.75

  for (let step = 0; step < 40; step += 1) {
    const mid = (low + high) / 2
    const hex = oklchToHex(mid, maxChroma(mid, hue), hue)
    if (contrast(hex, background) >= target) low = mid
    else high = mid
  }

  return oklchToHex(low, maxChroma(low, hue), hue)
}

/**
 * Busca la luminosidad OKLCH mínima (o máxima) a la que un tono alcanza el
 * contraste pedido contra un fondo. Búsqueda binaria sobre L, que es monótona
 * respecto del contraste dentro de cada dirección.
 */
function solveForContrast(hue, chroma, background, target, direction) {
  let low = direction === 'lighter' ? 0.5 : 0.15
  let high = direction === 'lighter' ? 0.99 : 0.62

  for (let step = 0; step < 40; step += 1) {
    const mid = (low + high) / 2
    const hex = oklchToHex(mid, chroma, hue)
    const ratio = contrast(hex, background)

    if (direction === 'lighter') {
      if (ratio >= target) high = mid
      else low = mid
    } else {
      if (ratio >= target) low = mid
      else high = mid
    }
  }

  const L = direction === 'lighter' ? high : low
  return { hex: oklchToHex(L, chroma, hue), L }
}

// --- familias ----------------------------------------------------------------
//
// El tono de cada familia no es decorativo: **el color significa qué estilo es.**
// Un chip violeta siempre es blackwork, en toda la app. Eso convierte al color
// en información en vez de en adorno, y es lo que permite que la interfaz tenga
// color sin competirle a la obra.
//
// La croma es la misma en todas (0,15) justamente para que ninguna familia grite
// más fuerte que otra por accidente.

const CHROMA = 0.15

const FAMILIES = [
  // ADR-031: hue 12 (rosa) → 122 (lima ácido). `vividL` es la excepción de
  // familia: el acento de marca tiene permiso de ser lo más audaz de la
  // pantalla, una vez, así que su `vivid` no comparte la L=0,62 que mantiene
  // parejas a las diez familias de estilo.
  { name: 'brand', hue: 122, chroma: 0.2, vividL: 0.87 },
  { name: 'line', hue: 195 },
  { name: 'shade', hue: 295 },
  { name: 'dot', hue: 75 },
  { name: 'classic', hue: 32 },
  { name: 'real', hue: 255 },
  { name: 'flow', hue: 340 },
  { name: 'east', hue: 20 },
  // ADR-031: 130 → 144. A 130° quedaba a solo 8° del acento nuevo (122°); el
  // generador reverifica el contraste solo.
  { name: 'letter', hue: 144 },
  { name: 'gold', hue: 95 },
  { name: 'hand', hue: 160 },
]

const AA_TEXT = 4.5

/**
 * Luminosidad del color vívido.
 *
 * 0,62 es donde casi todos los tonos alcanzan su croma máxima sin salirse del
 * gamut: más claro y el azul se lava, más oscuro y el amarillo se ensucia.
 */
const VIVID_L = 0.62

console.log(
  '| familia | onDark | vs ink800 | onLight | vs paper100 | vivid | texto | deepVivid | texto |',
)
console.log('|---|---|---|---|---|---|---|---|---|')

const output = {}

for (const family of FAMILIES) {
  const chroma = family.chroma ?? CHROMA

  const onDark = solveForContrast(
    family.hue,
    chroma,
    INK800,
    AA_TEXT,
    'lighter',
  )
  const onLight = solveForContrast(
    family.hue,
    chroma,
    PAPER100,
    AA_TEXT,
    'darker',
  )

  // El vívido va al borde del gamut. Es el que se ve.
  //
  // `vividL` es la excepción de familia (ver ADR-031): por defecto todas
  // comparten VIVID_L para que ninguna familia grite más fuerte que otra, pero
  // el acento de marca no es un chip entre iguales.
  const vividL = family.vividL ?? VIVID_L
  const vividChroma = maxChroma(vividL, family.hue)
  const vivid = oklchToHex(vividL, vividChroma, family.hue)

  // Y su equivalente sobre papel: mismo tono, resuelto hacia abajo hasta que el
  // papel encima pase AA, con la croma al borde del gamut en cada candidato.
  const deepVivid = solveVivid(family.hue, PAPER100, AA_TEXT)
  const ratioDeep = contrast(deepVivid, PAPER100)

  if (ratioDeep < AA_TEXT) {
    console.error(
      `✗ ${family.name}: el papel sobre ${deepVivid} mide ${ratioDeep.toFixed(2)}`,
    )
    process.exitCode = 1
  }

  // Con qué texto se puede escribir encima. Se elige el que más contraste dé, y
  // se verifica que llegue a AA — un relleno sobre el que no se puede escribir
  // no sirve como chip.
  const conPaper = contrast(vivid, PAPER100)
  const conInk = contrast(vivid, INK900)
  const sobreVivid = conInk >= conPaper ? 'ink900' : 'paper100'
  const ratioVivid = Math.max(conInk, conPaper)

  if (ratioVivid < AA_TEXT) {
    console.error(
      `✗ ${family.name}: ningún texto pasa AA sobre ${vivid} (mejor ${ratioVivid.toFixed(2)})`,
    )
    process.exitCode = 1
  }

  output[family.name] = {
    onDark: onDark.hex,
    onLight: onLight.hex,
    vivid,
    deepVivid,
    vividText: sobreVivid,
  }

  console.log(
    `| ${family.name} | \`${onDark.hex}\` | ${contrast(onDark.hex, INK900).toFixed(2)} | ` +
      `\`${onLight.hex}\` | ${contrast(onLight.hex, PAPER100).toFixed(2)} | ` +
      `\`${vivid}\` | ${sobreVivid} ${ratioVivid.toFixed(2)} | ` +
      `\`${deepVivid}\` | paper100 ${ratioDeep.toFixed(2)} |`,
  )
}

// --- salida ------------------------------------------------------------------

const NEUTROS = `  // Tinta → papel. Son mezclas de tinta y papel, no gris: el sistema se
  // mantiene cálido, y sobre un neutro cálido la fotografía de piel se ve como
  // piel. Ver docs/design/visual-language.md §4.
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
  white: '#FFFFFF',`

const encabezado = `/**
 * GENERADO — no editar a mano.
 *
 * Regenerar con: npm run brand:palette
 * Fuente: tools/brand/src/build-palette.mjs
 *
 * **Este es el único archivo del repositorio con un valor hex.** En cualquier
 * otro lado es un error de lint. Ver ADR-008.
 *
 * Nada fuera de \`theme.ts\` importa esto: los componentes consumen tokens
 * semánticos (\`textSecondary\`), nunca literales (\`ink500\`). Si un componente
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
 * · \`onDark\`  — TEXTO sobre superficie oscura, ≥ 4,5:1. Para llegar ahí un
 *   color tiene que ser claro, y claro le saca saturación. Es física.
 * · \`onLight\` — TEXTO sobre papel, ≥ 4,5:1.
 * · \`vivid\`   — el color de verdad, empujado al borde del gamut. Es para
 *   RELLENOS, barras, puntos y degradados: un objeto gráfico necesita 3:1, no
 *   4,5:1, y esos 1,5 puntos son toda la diferencia entre un teal apagado y uno
 *   que se ve.
 *
 * Usar \`onDark\` como relleno deja la interfaz lavada. Usar \`vivid\` como texto
 * la deja ilegible.
 */

export const palette = {
${NEUTROS}

`

let cuerpo = ''
for (const [nombre, valores] of Object.entries(output)) {
  cuerpo += `  // ${nombre}\n`
  cuerpo += `  ${nombre}OnDark: '${valores.onDark}',\n`
  cuerpo += `  ${nombre}OnLight: '${valores.onLight}',\n`
  cuerpo += `  ${nombre}Vivid: '${valores.vivid}',\n`
  cuerpo += `  ${nombre}DeepVivid: '${valores.deepVivid}',\n\n`
}

// Feedback del sistema. No salen del solver porque su tono está fijado por
// convención —verde es bien, rojo es mal— y no por la marca.
const ESTADOS = `  // Feedback del sistema. Nunca se usan para me gusta / paso: eso es una UI de
  // juicio y pertenece a las apps de citas. Ver visual-language.md §4.
  positive: '#2F5D3F',
  positiveRaised: '#7FB894',
  negative: '#993122',
  negativeRaised: '#E08C7C',
  warning: '#7A5A12',
  warningRaised: '#D9AE55',
} as const

export type PaletteToken = keyof typeof palette

/** Con qué color de texto se puede escribir sobre cada \`vivid\`. */
export const vividTextOn = {
${Object.entries(output)
  .map(([nombre, valores]) => `  ${nombre}: '${valores.vividText}',`)
  .join('\n')}
} as const
`

const archivo = encabezado + cuerpo + ESTADOS

const destino = resolve(
  import.meta.dirname,
  '../../../apps/mobile/src/design-system/tokens/palette.ts',
)

if (process.argv.includes('--check')) {
  let actual = ''
  try {
    actual = readFileSync(destino, 'utf8')
  } catch {
    console.error(`✗ Falta ${destino}. Corré: npm run brand:palette`)
    process.exit(1)
  }
  if (actual !== archivo) {
    console.error(
      '✗ palette.ts no coincide con el generador.\n' +
        '  Alguien editó los hex a mano, o cambió un tono sin regenerar.\n' +
        '  Corré: npm run brand:palette',
    )
    process.exit(1)
  }
  console.log('✓ palette.ts al día con el generador')
} else {
  writeFileSync(destino, archivo)
  console.log(`\n✓ ${destino}`)
}
