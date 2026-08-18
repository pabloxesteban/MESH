#!/usr/bin/env node
/**
 * Reporte de performance de lo que se puede medir sin un dispositivo.
 *
 * De los cinco presupuestos de `docs/testing/test-strategy.md` §7, tres
 * necesitan un teléfono real (arranque en frío, fps del gesto, memoria). Los
 * otros dos —tamaño de lo que viaja y round trips por pantalla— se pueden medir
 * acá, y por eso se miden acá en vez de dejarse para "cuando haya un teléfono".
 *
 * Los round trips los verifica `tests/integration/src/roundtrips.test.ts`.
 * Este script mide el peso.
 *
 * Uso: node scripts/perf-report.mjs [dir-del-export]
 */

import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const exportDir = process.argv[2] ?? null

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else out.push(path)
  }
  return out
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`
}

console.log('# Reporte de performance\n')

// --- lo que viaja en el bundle ----------------------------------------------

if (exportDir != null) {
  const files = walk(resolve(exportDir))
  const bundles = files.filter(
    (file) => file.includes('/_expo/static/js/') && file.endsWith('.js'),
  )
  const fonts = files.filter((file) =>
    ['.ttf', '.otf', '.woff2'].includes(extname(file)),
  )

  const jsBytes = bundles.reduce((sum, file) => sum + statSync(file).size, 0)
  const fontBytes = fonts.reduce((sum, file) => sum + statSync(file).size, 0)

  console.log('## Bundle\n')
  console.log(
    `- JavaScript: **${kb(jsBytes)}** en ${bundles.length} archivo(s)`,
  )
  console.log(
    `- Tipografías: **${kb(fontBytes)}** en ${fonts.length} archivo(s)`,
  )
  console.log(
    '\nLas tipografías viajan en el bundle a propósito: sin eso, el primer\n' +
      'frame se pinta con el tipo del sistema y salta cuando llegan.\n',
  )
} else {
  console.log('## Bundle\n\n_No se pasó un directorio de export._\n')
}

// --- lo que viaja por imagen -------------------------------------------------

const contentRoot = join(ROOT, 'content/artists')
let originals
try {
  originals = walk(contentRoot).filter((file) =>
    ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(file).toLowerCase()),
  )
} catch {
  // Sin contenido cargado no hay nada que medir, y eso no es un error: pasa en
  // un clon recién hecho, antes de generar los fixtures.
  originals = []
}

if (originals.length > 0) {
  const total = originals.reduce((sum, file) => sum + statSync(file).size, 0)
  const average = total / originals.length
  console.log('## Media de origen\n')
  console.log(`- ${originals.length} archivo(s), promedio **${kb(average)}**`)
  console.log(
    '\nEl seeder deriva tres tamaños (sm 400 / md 900 / lg 1600) en WebP. El\n' +
      'mazo pide `md`, la grilla `sm` y el hero `lg`: ninguna superficie baja\n' +
      'una imagen más grande de la que va a mostrar.\n',
  )
}

// --- índices sin consulta ----------------------------------------------------

console.log('## Índices\n')
try {
  const output = execFileSync(
    'grep',
    ['-rc', 'create index', join(ROOT, 'supabase/migrations')],
    { encoding: 'utf8' },
  )
  const count = output
    .split('\n')
    .filter(Boolean)
    .reduce((sum, line) => sum + Number(line.split(':').at(-1) ?? 0), 0)
  console.log(`- ${count} índice(s) declarados.`)
} catch {
  console.log('- (no se pudo contar)')
}
console.log(
  '\nCada uno lleva escrito arriba cuál es la consulta que lo justifica.\n' +
    'Un índice sin consulta es peso de escritura a cambio de nada.\n',
)

// --- lo que no se puede medir acá -------------------------------------------

console.log('## Pendiente de dispositivo\n')
for (const item of [
  'Arranque en frío → primera obra pintada: **< 2,5s** en 4G',
  'Gesto del mazo: 60fps sostenidos, sin frames caídos en 20 deslizadas',
  'Abrir perfil → hero pintado: **< 800ms** con caché caliente',
  'Memoria después de 100 tarjetas: sin crecimiento sin límite',
]) {
  console.log(`- [ ] ${item}`)
}
console.log(
  '\nUn número no registrado no es una medición. Estos cuatro se anotan en el\n' +
    'release check con el nombre del dispositivo, o no cuentan.\n',
)
