/**
 * Explorador de variantes del óptico de ícono. Herramienta de trabajo, no un
 * entregable: se usa para elegir la corrección óptica mirándola a tamaño real
 * en vez de suponerla, y queda porque la próxima vez que la marca cambie va a
 * hacer falta de nuevo.
 *
 * Salida: /tmp/mesh-explore.png
 */

import { writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import { INK, PAPER } from './render.mjs'

/**
 * @param {object} v
 * @param {number} v.w      ancho del viewBox
 * @param {number} v.s      grosor de trazo
 * @param {number} v.dx     dónde termina la diagonal (desde el borde opuesto)
 */
function variant({ w, s, dx }) {
  const h = 94
  const half = s / 2
  const left = half
  const right = w - half
  const top = half
  const bottom = h - half
  // La diagonal de A termina en `dx` medido desde la izquierda.
  const aEnd = w - dx
  const bEnd = dx
  return {
    w,
    h,
    s,
    body: `<g fill="none" stroke="currentColor" stroke-width="${s}" stroke-linecap="round" stroke-linejoin="round">
<path d="M${left} ${bottom}V${top}L${aEnd} ${bottom}"/>
<path d="M${right} ${bottom}V${top}L${bEnd} ${bottom}"/>
</g>`,
  }
}

const VARIANTS = [
  {
    label: 'display actual w96 s12 dx26',
    ...variant({ w: 96, s: 12, dx: 26 }),
  },
  { label: 'P  w104 s12 dx32', ...variant({ w: 104, s: 12, dx: 32 }) },
  { label: 'Q  w104 s12 dx36', ...variant({ w: 104, s: 12, dx: 36 }) },
  { label: 'R  w112 s12 dx38', ...variant({ w: 112, s: 12, dx: 38 }) },
  { label: 'S  w112 s12 dx42', ...variant({ w: 112, s: 12, dx: 42 }) },
  {
    label: 'icono elegido w112 s14 dx45',
    ...variant({ w: 112, s: 14, dx: 45 }),
  },
]

const SIZES = [32, 48, 64, 96, 140]
const ROW = 152
const COL = 158
const LABEL_W = 210

const width = LABEL_W + SIZES.length * COL + 40
const height = 40 + VARIANTS.length * ROW

function sheet(fg, bg) {
  let out = `<rect width="${width}" height="${height}" fill="${bg}"/>`
  out += `<text x="20" y="24" font-family="monospace" font-size="12" fill="${fg}" opacity="0.6">variantes del optico de icono</text>`
  SIZES.forEach((size, i) => {
    out += `<text x="${LABEL_W + i * COL + COL / 2}" y="24" font-family="monospace" font-size="11" fill="${fg}" opacity="0.6" text-anchor="middle">${size}</text>`
  })

  VARIANTS.forEach((v, r) => {
    const yTop = 40 + r * ROW
    out += `<text x="20" y="${yTop + ROW / 2 + 4}" font-family="monospace" font-size="11" fill="${fg}" opacity="0.75">${v.label}</text>`
    SIZES.forEach((size, i) => {
      const scale = Math.min(size / v.w, size / v.h)
      const dw = v.w * scale
      const dh = v.h * scale
      const x = LABEL_W + i * COL + (COL - dw) / 2
      const y = yTop + (ROW - dh) / 2
      out += `<g transform="translate(${x} ${y}) scale(${scale})" color="${fg}">${v.body}</g>`
    })
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${out}</svg>`
}

const light = new Resvg(sheet(INK, PAPER)).render().asPng()
writeFileSync('/tmp/mesh-explore.png', light)
console.log('✓ /tmp/mesh-explore.png')
