/**
 * Hojas de prueba de la marca.
 *
 * Renderizan la marca a sus tamaños reales de uso, en las dos polaridades, y el
 * ícono con las máscaras que efectivamente le aplica cada sistema operativo.
 *
 * Existen para poder MIRAR la marca a 16px y el ícono a 60pt, en lugar de
 * suponer que funcionan. Los criterios de salida de la Fase 2 piden que sea
 * legible a 16px, que funcione tinta-sobre-papel e invertida, y que el ícono se
 * revise a tamaño de pantalla de inicio. Eso se verifica mirándolo.
 *
 *   npm run brand:proof
 *
 * Salida: brand/proof/*.png
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { BRAND, INK, PADDING, PAPER, ROOT } from './render.mjs'

const OUT = resolve(ROOT, 'brand/proof')
mkdirSync(OUT, { recursive: true })

const MONO = 'font-family="monospace" font-size="11"'

function load(file) {
  const source = readFileSync(resolve(BRAND, file), 'utf8')
  const viewBox = source.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  return {
    w: Number(viewBox[1]),
    h: Number(viewBox[2]),
    body: source
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<title>[\s\S]*?<\/title>/, '')
      .replace(/<svg[^>]*>/, '')
      .replace(/<\/svg>/, ''),
  }
}

function write(name, svg) {
  writeFileSync(resolve(OUT, name), new Resvg(svg).render().asPng())
  console.log(`✓ brand/proof/${name}`)
}

function place(art, x, y, size, fg) {
  const scale = Math.min(size / art.w, size / art.h)
  const dx = x + (size - art.w * scale) / 2
  const dy = y + (size - art.h * scale) / 2
  return `<g transform="translate(${dx} ${dy}) scale(${scale})" color="${fg}">${art.body}</g>`
}

// ---------------------------------------------------------------------------
// 1. El símbolo a sus tamaños reales de uso, en las dos polaridades.
// ---------------------------------------------------------------------------

const display = load('mesh-symbol.svg')
const icon = load('mesh-symbol-icon.svg')

const SIZES = [16, 20, 24, 32, 48, 60, 96, 160]
const OPTICAL_SWITCH = 32 // debajo de esto se usa el óptico de ícono

function symbolSheet(fg, bg, label) {
  const gap = 30
  const margin = 32
  const max = Math.max(...SIZES)
  const width = margin * 2 + SIZES.reduce((s, v) => s + v + gap, 0) - gap
  const height = margin * 2 + max + 46

  let x = margin
  let out = `<rect width="${width}" height="${height}" fill="${bg}"/>`
  for (const size of SIZES) {
    out += place(size < OPTICAL_SWITCH ? icon : display, x, margin, size, fg)
    out += `<text x="${x + size / 2}" y="${margin + max + 24}" ${MONO} fill="${fg}" opacity="0.55" text-anchor="middle">${size}</text>`
    x += size + gap
  }
  out += `<text x="${margin}" y="${height - 12}" ${MONO} fill="${fg}" opacity="0.55">${label}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${out}</svg>`
}

const switchNote = `debajo de ${OPTICAL_SWITCH}px se usa el optico de icono`
write(
  'mesh-proof-light.png',
  symbolSheet(INK, PAPER, `tinta sobre papel · ${switchNote}`),
)
write(
  'mesh-proof-dark.png',
  symbolSheet(PAPER, INK, `papel sobre tinta · ${switchNote}`),
)

// ---------------------------------------------------------------------------
// 2. Los lockups, incluido el ancho mínimo.
// ---------------------------------------------------------------------------

function lockupSheet() {
  const rows = [
    ['mesh-wordmark.svg', 'logotipo', 520],
    ['mesh-lockup.svg', 'lockup horizontal', 700],
    ['mesh-lockup.svg', 'lockup a 220px — ancho minimo', 220],
    ['mesh-lockup-stacked.svg', 'lockup apilado', 300],
  ]
  const width = 860
  let y = 44
  let out = ''
  for (const [file, label, target] of rows) {
    const art = load(file)
    const scale = target / art.w
    out += `<text x="40" y="${y - 12}" ${MONO} fill="${INK}" opacity="0.5">${label}</text>`
    out += `<g transform="translate(40 ${y}) scale(${scale})" color="${INK}">${art.body}</g>`
    y += art.h * scale + 60
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}" viewBox="0 0 ${width} ${y}"><rect width="${width}" height="${y}" fill="${PAPER}"/>${out}</svg>`
}

write('mesh-proof-lockups.png', lockupSheet())

// ---------------------------------------------------------------------------
// 3. El ícono con las máscaras reales, a tamaño de pantalla de inicio.
//
// iOS recorta con un squircle; Android adaptativo puede recortar con un
// círculo, y esa es la máscara más agresiva, así que es la que hay que mirar.
// ---------------------------------------------------------------------------

function iconSheet() {
  const cases = [
    { size: 60, mask: 'squircle', label: '60 · iOS home' },
    { size: 120, mask: 'squircle', label: '120 · iOS @2x' },
    { size: 180, mask: 'squircle', label: '180 · iOS @3x' },
    { size: 108, mask: 'circle', label: '108 · Android circulo' },
    { size: 108, mask: 'rounded', label: '108 · Android redondeado' },
    { size: 16, mask: 'square', label: '16 · favicon' },
    { size: 32, mask: 'square', label: '32 · favicon @2x' },
  ]

  const margin = 36
  const gap = 34
  const max = Math.max(...cases.map((c) => c.size))
  const width =
    margin * 2 + cases.reduce((s, c) => s + Math.max(c.size, 80) + gap, 0) - gap
  const height = margin * 2 + max + 46

  let x = margin
  let out = `<rect width="${width}" height="${height}" fill="#8C8A90"/>`
  let defs = ''

  cases.forEach((c, i) => {
    const cell = Math.max(c.size, 80)
    const ix = x + (cell - c.size) / 2
    const iy = margin + (max - c.size) / 2
    const id = `m${i}`

    // El padding se importa de render.mjs: la prueba tiene que dibujar el
    // ícono con el mismo encuadre con el que se genera.
    const padding =
      c.mask === 'square'
        ? PADDING.favicon
        : c.mask === 'circle' || c.mask === 'rounded'
          ? PADDING.adaptive
          : PADDING.ios
    const inner = c.size * (1 - 2 * padding)

    let shape
    if (c.mask === 'circle') {
      shape = `<circle cx="${c.size / 2}" cy="${c.size / 2}" r="${c.size / 2}"/>`
    } else if (c.mask === 'squircle') {
      shape = `<rect width="${c.size}" height="${c.size}" rx="${c.size * 0.2237}"/>`
    } else if (c.mask === 'rounded') {
      shape = `<rect width="${c.size}" height="${c.size}" rx="${c.size * 0.14}"/>`
    } else {
      shape = `<rect width="${c.size}" height="${c.size}"/>`
    }
    defs += `<clipPath id="${id}">${shape}</clipPath>`

    out += `<g transform="translate(${ix} ${iy})" clip-path="url(#${id})">`
    out += `<rect width="${c.size}" height="${c.size}" fill="${INK}"/>`
    out += place(icon, (c.size - inner) / 2, (c.size - inner) / 2, inner, PAPER)
    out += `</g>`
    out += `<text x="${x + cell / 2}" y="${margin + max + 24}" ${MONO} fill="${INK}" opacity="0.75" text-anchor="middle">${c.label}</text>`
    x += cell + gap
  })

  out += `<text x="${margin}" y="${height - 12}" ${MONO} fill="${INK}" opacity="0.75">icono con las mascaras reales de cada sistema, sobre gris neutro</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defs}</defs>${out}</svg>`
}

write('mesh-proof-icons.png', iconSheet())
