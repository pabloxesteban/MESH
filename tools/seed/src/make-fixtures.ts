/**
 * Genera las imágenes de los artistas fixture.
 *
 * Las imágenes fixture son **placeholders abstractos, no tatuajes reales**
 * sacados de ningún lado (content-policy §4.5). Se generan acá en vez de
 * commitearse porque los directorios `media/` del contenido están en
 * .gitignore: los originales quedan con el artista, y un fixture no tiene
 * artista.
 *
 * Determinístico: la misma pieza produce siempre la misma imagen, así que
 * regenerar no cambia checksums ni provoca subidas espurias.
 *
 * Uso: npm run fixtures -w @mesh/seed
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import sharp from 'sharp'

const CONTENT_ROOT = resolve(import.meta.dirname, '../../../content/artists')

/**
 * Paleta deliberadamente lejos de la de MESH.
 *
 * Un placeholder que usa los colores de marca se confunde con diseño real en
 * una captura de pantalla. Estos grises y ocres se leen como lo que son.
 */
const INKS = ['#1B1B1F', '#2E2A26', '#3A3F44', '#4A3B33', '#22303A']
const PAPERS = ['#E8E2D8', '#DED9D2', '#EFE9DE', '#D9D5CE']

/** Hash chico y estable. No es criptográfico: solo tiene que ser reproducible. */
function seedOf(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function* pseudoRandom(seed: number): Generator<number> {
  let state = seed || 1
  while (true) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    yield state / 0xffffffff
  }
}

/**
 * Un damero irregular de trazos. Abstracto a propósito: no imita un tatuaje, y
 * cualquiera que lo vea en la app entiende de inmediato que es un marcador.
 */
function svgFor(key: string, width: number, height: number): string {
  const random = pseudoRandom(seedOf(key))
  const ink = INKS[Math.floor(random.next().value * INKS.length)] ?? INKS[0]
  const paper =
    PAPERS[Math.floor(random.next().value * PAPERS.length)] ?? PAPERS[0]

  const strokes: string[] = []
  const count = 14 + Math.floor(random.next().value * 10)
  for (let index = 0; index < count; index += 1) {
    const x1 = random.next().value * width
    const y1 = random.next().value * height
    const x2 = random.next().value * width
    const y2 = random.next().value * height
    const w = 2 + random.next().value * 10
    const opacity = (0.25 + random.next().value * 0.5).toFixed(2)
    strokes.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" ` +
        `x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ` +
        `stroke="${ink}" stroke-width="${w.toFixed(1)}" ` +
        `stroke-linecap="round" opacity="${opacity}" />`,
    )
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${paper}" />
  ${strokes.join('\n  ')}
  <text x="${width / 2}" y="${height - 40}" text-anchor="middle"
        font-family="monospace" font-size="34" fill="${ink}" opacity="0.85">FIXTURE</text>
</svg>`
}

/**
 * Relaciones de aspecto distintas a propósito.
 *
 * La fotografía real de tatuajes no viene toda en 4:5. Si todos los fixtures
 * fueran del mismo tamaño, el mazo se vería perfecto en desarrollo y saltaría en
 * producción — que es exactamente el motivo por el que el roadmap pide construir
 * descubrimiento contra contenido real.
 */
const SHAPES: ReadonlyArray<readonly [number, number]> = [
  [1200, 1500],
  [1400, 1400],
  [1000, 1500],
  [1500, 1000],
  [1200, 1600],
]

export async function writeFixtureImage(
  artistSlug: string,
  fileName: string,
  index: number,
): Promise<void> {
  const shape = SHAPES[index % SHAPES.length] ?? SHAPES[0]
  const [width, height] = shape as readonly [number, number]
  const svg = svgFor(`${artistSlug}/${fileName}`, width, height)

  const path = join(CONTENT_ROOT, artistSlug, 'media', fileName)
  mkdirSync(dirname(path), { recursive: true })

  const bytes = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer()
  writeFileSync(path, bytes)
}
