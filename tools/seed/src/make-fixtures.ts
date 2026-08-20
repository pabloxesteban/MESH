/**
 * Genera las imágenes de los artistas fixture.
 *
 * Las imágenes fixture son **placeholders abstractos, no tatuajes reales**
 * sacados de ningún lado (content-policy §4.5). Se generan acá en vez de
 * commitearse porque los directorios `media/` del contenido están en
 * .gitignore: los originales quedan con el artista, y un fixture no tiene
 * artista.
 *
 * **Cada estilo se dibuja distinto.** No es capricho: si todas las piezas
 * fueran el mismo garabato, el mazo no diría nada sobre si el producto funciona
 * —no se podría ver si los estilos se distinguen, si el color de familia ayuda,
 * si una grilla de blackwork se lee distinto de una de línea fina—. Un fixture
 * que no se parece a lo que va a haber solo prueba que la app renderiza
 * píxeles.
 *
 * Sigue siendo inconfundiblemente sintético: formas geométricas, sin figuras, y
 * con la palabra FIXTURE impresa.
 *
 * Determinístico: la misma pieza produce siempre la misma imagen, así que
 * regenerar no cambia checksums ni provoca subidas espurias.
 *
 * Uso: npm run fixtures -w @mesh/seed
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import sharp from 'sharp'

/**
 * Dónde vive el contenido.
 *
 * Se resuelve **en cada llamada** y no una vez al cargar el módulo:
 * `MESH_CONTENT_ROOT` existe para que un test pueda escribir en un directorio
 * temporal, y con una constante de módulo eso dependía de que nadie hubiera
 * importado este archivo antes de definirla. Cuando falló, el test escribió un
 * JPEG dentro de `content/artists/` del repositorio de verdad.
 *
 * En una corrida real la variable no está definida y esto es la ruta de
 * siempre.
 */
function contentRoot(): string {
  return (
    process.env['MESH_CONTENT_ROOT'] ??
    resolve(import.meta.dirname, '../../../content/artists')
  )
}

/**
 * Paleta deliberadamente lejos de la de MESH.
 *
 * Un placeholder que usa los colores de marca se confunde con diseño real en
 * una captura de pantalla. Estos grises, sepias y azules apagados se leen como
 * lo que son: tinta sobre piel, sin ser de nadie.
 */
const INKS = ['#141416', '#22201E', '#2B3138', '#3A2E28', '#1B2A2E']
const SKINS = ['#E6D3C1', '#DCC4AE', '#EFDDCB', '#D2B49A', '#C99C7E']

/** Hash chico y estable. No es criptográfico: solo tiene que ser reproducible. */
function seedOf(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function makeRandom(seed: number): () => number {
  let state = seed || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 0xffffffff
  }
}

export type StyleShape =
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

/** Mismo mapa que el del design system, del lado del contenido. */
const SHAPE_BY_STYLE: Readonly<Record<string, StyleShape>> = {
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

interface Canvas {
  readonly width: number
  readonly height: number
  readonly ink: string
  readonly skin: string
  readonly random: () => number
}

/** Curvas finas y continuas. Poca tinta, mucho aire. */
function drawLine({ width, height, ink, random }: Canvas): string {
  const paths: string[] = []
  for (let index = 0; index < 5 + Math.floor(random() * 3); index += 1) {
    const x = width * (0.2 + random() * 0.6)
    const y = height * (0.15 + random() * 0.2)
    let d = `M${x.toFixed(0)} ${y.toFixed(0)}`
    let cx = x
    let cy = y
    for (let step = 0; step < 6; step += 1) {
      const nx = cx + (random() - 0.5) * width * 0.35
      const ny = cy + height * 0.1 + random() * height * 0.08
      d += ` Q${(cx + (random() - 0.5) * 60).toFixed(0)} ${((cy + ny) / 2).toFixed(0)} ${nx.toFixed(0)} ${ny.toFixed(0)}`
      cx = nx
      cy = ny
    }
    paths.push(
      `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${(1.6 + random() * 1.4).toFixed(1)}" stroke-linecap="round" opacity="0.85" />`,
    )
  }
  return paths.join('\n  ')
}

/** Masas negras sólidas con huecos. Mucha tinta. */
function drawShade({ width, height, ink, random }: Canvas): string {
  const shapes: string[] = []
  for (let index = 0; index < 4 + Math.floor(random() * 3); index += 1) {
    const cx = width * (0.15 + random() * 0.7)
    const cy = height * (0.15 + random() * 0.7)
    const r = Math.min(width, height) * (0.12 + random() * 0.2)
    const points: string[] = []
    const sides = 5 + Math.floor(random() * 4)
    for (let point = 0; point < sides; point += 1) {
      const angle = (point / sides) * Math.PI * 2
      const radius = r * (0.6 + random() * 0.6)
      points.push(
        `${(cx + Math.cos(angle) * radius).toFixed(0)},${(cy + Math.sin(angle) * radius).toFixed(0)}`,
      )
    }
    shapes.push(
      `<polygon points="${points.join(' ')}" fill="${ink}" opacity="${(0.75 + random() * 0.25).toFixed(2)}" />`,
    )
  }
  return shapes.join('\n  ')
}

/** Puntillismo: densidad variable, sin líneas. */
function drawDot({ width, height, ink, random }: Canvas): string {
  const dots: string[] = []
  const clusters = 3 + Math.floor(random() * 3)
  for (let cluster = 0; cluster < clusters; cluster += 1) {
    const cx = width * (0.2 + random() * 0.6)
    const cy = height * (0.2 + random() * 0.6)
    const spread = Math.min(width, height) * (0.1 + random() * 0.18)
    const count = 120 + Math.floor(random() * 160)
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2
      const distance = Math.sqrt(random()) * spread
      const r = 1 + random() * 2
      dots.push(
        `<circle cx="${(cx + Math.cos(angle) * distance).toFixed(0)}" cy="${(cy + Math.sin(angle) * distance).toFixed(0)}" r="${r.toFixed(1)}" fill="${ink}" opacity="${(0.4 + random() * 0.5).toFixed(2)}" />`,
      )
    }
  }
  return dots.join('\n  ')
}

/** Contorno grueso cerrado con relleno plano. La gramática del old school. */
function drawClassic({ width, height, ink, random }: Canvas): string {
  const shapes: string[] = []
  const cx = width / 2
  const cy = height / 2
  for (let index = 0; index < 3; index += 1) {
    const r = Math.min(width, height) * (0.3 - index * 0.08)
    const points: string[] = []
    const sides = 6 + index
    for (let point = 0; point < sides; point += 1) {
      const angle = (point / sides) * Math.PI * 2 - Math.PI / 2
      const radius = r * (0.85 + random() * 0.3)
      points.push(
        `${(cx + Math.cos(angle) * radius).toFixed(0)},${(cy + Math.sin(angle) * radius * 1.15).toFixed(0)}`,
      )
    }
    shapes.push(
      `<polygon points="${points.join(' ')}" fill="${index % 2 === 0 ? 'none' : ink}" stroke="${ink}" stroke-width="${(9 - index * 2).toFixed(0)}" stroke-linejoin="round" opacity="${index % 2 === 0 ? '1' : '0.35'}" />`,
    )
  }
  return shapes.join('\n  ')
}

/** Degradados suaves: volumen, sin contorno. */
function drawReal({ width, height, ink, random }: Canvas): string {
  const shapes: string[] = []
  for (let index = 0; index < 4; index += 1) {
    const cx = width * (0.25 + random() * 0.5)
    const cy = height * (0.25 + random() * 0.5)
    const rx = width * (0.12 + random() * 0.2)
    const ry = ry_(rx, random)
    shapes.push(
      `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="url(#suave${index})" />`,
    )
  }
  const defs = shapes
    .map(
      (_, index) =>
        `<radialGradient id="suave${index}"><stop offset="0%" stop-color="${ink}" stop-opacity="0.75" /><stop offset="100%" stop-color="${ink}" stop-opacity="0" /></radialGradient>`,
    )
    .join('\n    ')
  return `<defs>\n    ${defs}\n  </defs>\n  ${shapes.join('\n  ')}`
}

function ry_(rx: number, random: () => number): number {
  return rx * (0.6 + random() * 0.8)
}

/** Manchas translúcidas que se superponen y mezclan. */
function drawFlow({ width, height, random }: Canvas): string {
  const tintas = ['#8E4B6E', '#3B6E8E', '#8E7A3B', '#4B8E63']
  const shapes: string[] = []
  for (let index = 0; index < 7; index += 1) {
    const cx = width * (0.2 + random() * 0.6)
    const cy = height * (0.2 + random() * 0.6)
    const r = Math.min(width, height) * (0.1 + random() * 0.22)
    const color = tintas[Math.floor(random() * tintas.length)] ?? tintas[0]
    shapes.push(
      `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="${color}" opacity="0.28" />`,
    )
  }
  return shapes.join('\n  ')
}

/** Ondas paralelas y un disco: la gramática del japonés. */
function drawEast({ width, height, ink, random }: Canvas): string {
  const shapes: string[] = []
  for (let index = 0; index < 9; index += 1) {
    const y = height * (0.15 + index * 0.08)
    let d = `M0 ${y.toFixed(0)}`
    for (let x = 0; x <= width; x += width / 6) {
      d += ` Q${(x + width / 12).toFixed(0)} ${(y - 30 - random() * 20).toFixed(0)} ${(x + width / 6).toFixed(0)} ${y.toFixed(0)}`
    }
    shapes.push(
      `<path d="${d}" fill="none" stroke="${ink}" stroke-width="4" opacity="0.7" />`,
    )
  }
  shapes.push(
    `<circle cx="${(width * 0.7).toFixed(0)}" cy="${(height * 0.3).toFixed(0)}" r="${(Math.min(width, height) * 0.16).toFixed(0)}" fill="none" stroke="${ink}" stroke-width="10" />`,
  )
  return shapes.join('\n  ')
}

/** Trazos caligráficos: gruesos y finos alternados, todos en diagonal. */
function drawLetter({ width, height, ink, random }: Canvas): string {
  const shapes: string[] = []
  for (let index = 0; index < 14; index += 1) {
    const x = width * (0.1 + random() * 0.75)
    const y = height * (0.2 + random() * 0.5)
    const largo = height * (0.1 + random() * 0.25)
    const grosor = index % 3 === 0 ? 14 : 3
    shapes.push(
      `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + largo * 0.35).toFixed(0)}" y2="${(y + largo).toFixed(0)}" stroke="${ink}" stroke-width="${grosor}" stroke-linecap="round" opacity="0.9" />`,
    )
  }
  return shapes.join('\n  ')
}

/** Filete: simetría, volutas y una banda central. */
function drawGold({ width, height, ink, random }: Canvas): string {
  const cx = width / 2
  const shapes: string[] = [
    `<rect x="${(width * 0.1).toFixed(0)}" y="${(height * 0.42).toFixed(0)}" width="${(width * 0.8).toFixed(0)}" height="${(height * 0.16).toFixed(0)}" fill="none" stroke="${ink}" stroke-width="6" rx="8" />`,
  ]
  for (let index = 0; index < 5; index += 1) {
    const y = height * (0.2 + index * 0.14)
    const r = width * (0.08 + random() * 0.06)
    for (const signo of [-1, 1]) {
      const x = cx + signo * width * (0.18 + random() * 0.14)
      shapes.push(
        `<path d="M${x.toFixed(0)} ${y.toFixed(0)} a${r.toFixed(0)} ${r.toFixed(0)} 0 1 ${signo > 0 ? 1 : 0} ${(signo * r).toFixed(0)} ${r.toFixed(0)}" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round" />`,
      )
    }
  }
  return shapes.join('\n  ')
}

/** Handpoke: puntos gruesos e irregulares formando líneas visibles. */
function drawHand({ width, height, ink, random }: Canvas): string {
  const dots: string[] = []
  for (let trazo = 0; trazo < 6; trazo += 1) {
    let x = width * (0.2 + random() * 0.6)
    let y = height * (0.15 + random() * 0.2)
    const pasos = 18 + Math.floor(random() * 14)
    const dx = (random() - 0.5) * 12
    for (let paso = 0; paso < pasos; paso += 1) {
      x += dx + (random() - 0.5) * 10
      y += height * 0.03 + (random() - 0.5) * 6
      dots.push(
        `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(2.5 + random() * 2.5).toFixed(1)}" fill="${ink}" opacity="${(0.6 + random() * 0.4).toFixed(2)}" />`,
      )
    }
  }
  return dots.join('\n  ')
}

const DRAW: Readonly<Record<StyleShape, (canvas: Canvas) => string>> = {
  line: drawLine,
  shade: drawShade,
  dot: drawDot,
  classic: drawClassic,
  real: drawReal,
  flow: drawFlow,
  east: drawEast,
  letter: drawLetter,
  gold: drawGold,
  hand: drawHand,
}

/**
 * Relaciones de aspecto distintas a propósito.
 *
 * La fotografía real de tatuajes no viene toda en 4:5. Si todos los fixtures
 * fueran del mismo tamaño, el mazo se vería perfecto en desarrollo y saltaría en
 * producción.
 */
const SHAPES: ReadonlyArray<readonly [number, number]> = [
  [1200, 1500],
  [1400, 1400],
  [1000, 1500],
  [1500, 1000],
  [1200, 1600],
]

/**
 * Dibuja un placeholder abstracto para una pieza fixture.
 *
 * **No pisa un archivo que ya existe** salvo que se lo pida con `force`. Desde
 * que los fixtures pueden tener fotos de banco (ver `photos.yaml` y
 * `content:photos`), regenerar a ciegas borraba ochenta y ocho fotos ya
 * bajadas y dejaba la app en formas geométricas otra vez — sin decir nada.
 */
export async function writeFixtureImage(
  artistSlug: string,
  fileName: string,
  index: number,
  styleSlug: string,
  force = false,
): Promise<boolean> {
  const shape = SHAPES[index % SHAPES.length] ?? SHAPES[0]
  const [width, height] = shape as readonly [number, number]

  const random = makeRandom(seedOf(`${artistSlug}/${fileName}`))
  const ink = INKS[Math.floor(random() * INKS.length)] ?? INKS[0]
  const skin = SKINS[Math.floor(random() * SKINS.length)] ?? SKINS[0]
  const draw = DRAW[SHAPE_BY_STYLE[styleSlug] ?? 'line']

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${skin}" />
  ${draw({ width, height, ink: ink as string, skin: skin as string, random })}
  <text x="${width / 2}" y="${height - 34}" text-anchor="middle"
        font-family="monospace" font-size="26" fill="${ink}" opacity="0.55">FIXTURE</text>
</svg>`

  const path = join(contentRoot(), artistSlug, 'media', fileName)
  if (!force && existsSync(path)) return false

  mkdirSync(dirname(path), { recursive: true })

  const bytes = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer()
  writeFileSync(path, bytes)
  return true
}
