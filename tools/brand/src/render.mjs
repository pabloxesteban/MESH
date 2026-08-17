/**
 * Rasterizado compartido de los SVG de marca.
 *
 * Los SVG de `brand/` son la fuente de verdad. Todo PNG del repositorio se
 * genera desde ellos: un ícono exportado a mano se desincroniza del logo en
 * cuanto alguien toca la marca, y nadie se entera hasta que ya se publicó.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

export const ROOT = resolve(import.meta.dirname, '../../..')
export const BRAND = resolve(ROOT, 'brand/logo')

/** Paleta de marca. Espejo de docs/design/visual-language.md §4. */
export const INK = '#0C0C0E'
export const PAPER = '#F4EFE6'

/**
 * Padding por destino, como fracción del lado del cuadro.
 *
 * Vive acá y no en generate-icons.mjs porque la hoja de prueba tiene que
 * dibujar el ícono con exactamente el mismo encuadre con el que se genera. Si
 * los dos tuvieran su propia copia, la prueba dejaría de probar el ícono real
 * en cuanto uno de los dos cambiara.
 *
 * `adaptive` es el más grande porque Android recorta el ícono adaptativo con
 * la máscara que elija el fabricante: solo el 66% central está garantizado.
 */
export const PADDING = {
  ios: 0.2,
  adaptive: 0.3,
  favicon: 0.1,
  splash: 0.24,
}

/**
 * Rasteriza un SVG a PNG.
 *
 * @param {object} options
 * @param {string} options.file        SVG en brand/logo
 * @param {number} options.size        lado del PNG cuadrado, en px
 * @param {string} options.color       color del trazo (currentColor del SVG)
 * @param {string|null} options.background  fondo, o null para transparente
 * @param {number} options.padding     fracción del lado libre en cada borde
 * @returns {Buffer}
 */
export function renderPng({
  file,
  size,
  color,
  background = null,
  padding = 0,
}) {
  const source = readFileSync(resolve(BRAND, file), 'utf8')

  // El SVG usa currentColor para servir a las dos polaridades desde un solo
  // archivo; resvg no resuelve currentColor, así que se fija acá.
  const colored = source.replace(/currentColor/g, color)

  const inner = Math.round(size * (1 - 2 * padding))
  const offset = Math.round((size - inner) / 2)

  const viewBox = source.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  if (viewBox == null) throw new Error(`${file}: no se pudo leer el viewBox`)
  const [, vw, vh] = viewBox

  // El símbolo no es cuadrado; se centra dentro del cuadro manteniendo la
  // proporción.
  const scale = Math.min(inner / Number(vw), inner / Number(vh))
  const w = Number(vw) * scale
  const h = Number(vh) * scale

  const wrapper = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${background != null ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
<g transform="translate(${offset + (inner - w) / 2} ${offset + (inner - h) / 2}) scale(${scale})">
${colored
  .replace(/<\?xml[^>]*\?>/, '')
  .replace(/<svg[^>]*>/, '')
  .replace(/<\/svg>/, '')}
</g>
</svg>`

  return new Resvg(wrapper, {
    fitTo: { mode: 'width', value: size },
  })
    .render()
    .asPng()
}
