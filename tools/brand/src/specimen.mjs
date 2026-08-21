/**
 * Specimen tipográfico.
 *
 * Renderiza la escala completa con las tipografías que efectivamente se
 * empaquetan, en las dos polaridades. Existe por la misma razón que las hojas
 * de prueba de la marca: una escala tipográfica se decide mirándola, no
 * leyendo una tabla de números.
 *
 *   npm run brand:specimen
 *
 * Salida: brand/proof/mesh-specimen-{light,dark}.png
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { INK, PAPER, ROOT } from './render.mjs'

const FONTS = resolve(ROOT, 'apps/mobile/assets/fonts')
const OUT = resolve(ROOT, 'brand/proof')
mkdirSync(OUT, { recursive: true })

const SERIF = 'Fraunces'
const SANS = 'Instrument Sans'

/**
 * Espejo de docs/design/visual-language.md §5 y
 * apps/mobile/src/design-system/tokens/typography.ts.
 *
 * `tracking` es una FRACCIÓN del tamaño (se multiplica por `size` más abajo),
 * no los píxeles absolutos de `letterSpacing` en `typography.ts` — convertir
 * al tocar un valor: `tracking = letterSpacing / size`.
 */
const SCALE = [
  {
    // ADR-032: 40/44 → 48/52, tracking -0,4 → -0,8 (-0,8/48 ≈ -0,0167).
    // Peso 600 (Fraunces-SemiBold, ADR-031) — no 400: el corte que
    // `display` usa de verdad en la app.
    token: 'display',
    family: SERIF,
    weight: 600,
    size: 48,
    leading: 52,
    tracking: -0.8 / 48,
    sample: 'Tu gusto',
  },
  {
    // ADR-032: tracking -0,2 → -0,35 (-0,35/30 ≈ -0,0117). Tamaño y peso sin
    // cambios.
    token: 'title-lg',
    family: SERIF,
    weight: 400,
    size: 30,
    leading: 36,
    tracking: -0.35 / 30,
    sample: 'Encontrá a tu gente',
  },
  {
    token: 'title (400)',
    family: SERIF,
    weight: 400,
    size: 24,
    leading: 30,
    sample: '¿Quién hizo esto?',
  },
  {
    token: 'title (500)',
    family: SERIF,
    weight: 500,
    size: 24,
    leading: 30,
    sample: '¿Quién hizo esto?',
  },
  {
    token: 'body-lg',
    family: SANS,
    weight: 400,
    size: 17,
    leading: 26,
    sample:
      'Trabajo fine line y botánico, en negro, con foco en composiciones chicas.',
  },
  {
    token: 'body',
    family: SANS,
    weight: 400,
    size: 15,
    leading: 22,
    sample: 'Esto es lo que estamos leyendo de tus elecciones.',
  },
  {
    token: 'label',
    family: SANS,
    weight: 500,
    size: 13,
    leading: 18,
    sample: 'Marcaste varios trabajos de Fine Line',
  },
  {
    token: 'micro',
    family: SANS,
    weight: 500,
    size: 11,
    leading: 14,
    tracking: 0.08,
    upper: true,
    sample: 'Fine line · Botanical · CABA',
  },
]

function sheet(fg, bg, label) {
  const width = 900
  const margin = 40
  const gutter = 130

  let y = margin + 24
  let out = `<rect width="${width}" height="100%" fill="${bg}"/>`

  for (const row of SCALE) {
    const text = row.upper ? row.sample.toUpperCase() : row.sample
    y += row.leading
    out += `<text x="${margin}" y="${y - row.size * 0.25}" font-family="monospace" font-size="10" fill="${fg}" opacity="0.45">${row.token}</text>`
    out +=
      `<text x="${margin + gutter}" y="${y}" font-family="${row.family}" font-size="${row.size}"` +
      ` font-weight="${row.weight}" fill="${fg}"` +
      (row.tracking ? ` letter-spacing="${row.tracking * row.size}"` : '') +
      `>${text}</text>`
    y += 34
  }

  const height = y + margin
  out += `<text x="${margin}" y="${height - 14}" font-family="monospace" font-size="10" fill="${fg}" opacity="0.45">${label}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${out}</svg>`
}

const options = { font: { fontDirs: [FONTS], defaultFontFamily: SANS } }

for (const [name, fg, bg, label] of [
  [
    'light',
    INK,
    PAPER,
    'tinta sobre papel · serif Fraunces · sans Instrument Sans',
  ],
  [
    'dark',
    PAPER,
    INK,
    'papel sobre tinta · serif Fraunces · sans Instrument Sans',
  ],
]) {
  const png = new Resvg(sheet(fg, bg, label), options).render().asPng()
  writeFileSync(resolve(OUT, `mesh-specimen-${name}.png`), png)
  console.log(`✓ brand/proof/mesh-specimen-${name}.png`)
}
