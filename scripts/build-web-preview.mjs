#!/usr/bin/env node
/**
 * Empaqueta el export web de la app en un solo HTML autocontenido.
 *
 * Sirve para poder abrir la app desde un teléfono sin instalar nada: se publica
 * el HTML resultante y se comparte el enlace. No reemplaza probar en un
 * dispositivo con Expo Go — react-native-web es una traducción, no la app
 * nativa: los hápticos no existen, los gestos son de mouse/touch del navegador,
 * y el rendimiento no dice nada del real.
 *
 * Para lo que SÍ sirve, que es la verificación pendiente de las Fases 2 y 3:
 * mirar color, contraste, tipografía, espaciado y los dos temas en una pantalla
 * de teléfono real.
 *
 * El export se hace con `apps/mobile/preview-entry.tsx` como entrada en lugar
 * de `expo-router/entry`: el router resuelve la ruta desde
 * `window.location.pathname`, y un preview publicado no se sirve en `/`, así
 * que con el router puesto toda URL cae en "Unmatched Route". El script
 * intercambia el `main` del package.json mientras dura el export y lo restaura
 * después, incluso si el export falla.
 *
 * Uso:
 *   node scripts/build-web-preview.mjs
 *
 * Salida: /tmp/mesh-web/preview.html
 */

import { execFileSync } from 'node:child_process'
import {
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { extname, join, resolve } from 'node:path'

const INK = '#0C0C0E'
const PAPER = '#F4EFE6'

const ROOT = resolve(import.meta.dirname, '..')
const APP = join(ROOT, 'apps/mobile')
const exportDir = resolve(process.argv[2] ?? '/tmp/mesh-web')

// --- export con el entry de preview -----------------------------------------

const pkgPath = join(APP, 'package.json')
const originalPkg = readFileSync(pkgPath, 'utf8')

try {
  const pkg = JSON.parse(originalPkg)
  pkg.main = './preview-entry.tsx'
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  rmSync(exportDir, { recursive: true, force: true })
  console.log('· exportando con preview-entry.tsx…')
  execFileSync(
    'npx',
    ['expo', 'export', '--platform', 'web', '--output-dir', exportDir],
    { cwd: APP, stdio: 'pipe' },
  )
} finally {
  // Se restaura siempre: dejar el package.json apuntando al entry de preview
  // rompería la app real sin que nadie se entere hasta el próximo arranque.
  writeFileSync(pkgPath, originalPkg)
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else out.push(path)
  }
  return out
}

const files = walk(exportDir)

const bundlePath = files.find(
  (f) => f.includes('/_expo/static/js/web/') && f.endsWith('.js'),
)
if (bundlePath == null) {
  console.error(
    `✗ No se encontró el bundle en ${exportDir}. ¿Corriste expo export?`,
  )
  process.exit(1)
}

let bundle = readFileSync(bundlePath, 'utf8')

// Las fuentes se referencian como strings de ruta absoluta dentro del bundle.
// El artifact publicado es un solo archivo, así que no hay nada del otro lado
// de esas rutas: se reemplazan por data URIs.
const MIME = { '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2' }
let inlined = 0

for (const file of files) {
  const mime = MIME[extname(file)]
  if (mime == null) continue

  const urlPath = '/' + file.slice(exportDir.length + 1)
  if (!bundle.includes(urlPath)) continue

  const dataUri = `data:${mime};base64,${readFileSync(file).toString('base64')}`
  bundle = bundle.split(urlPath).join(dataUri)
  inlined += 1
}

// Un `</script>` dentro del bundle cerraría la etiqueta antes de tiempo. No
// debería haber ninguno, pero es barato asegurarlo.
const scriptEscapes = (bundle.match(/<\/script/gi) ?? []).length
bundle = bundle.replace(/<\/script/gi, '<\\/script')

const html = `<title>Galería MESH</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

<style>
  /*
    Envoltorio mínimo a propósito.

    El sistema de diseño de la página es el de la app: los colores, la
    tipografía y el espaciado salen de apps/mobile/src/design-system y se
    aplican desde adentro. Acá solo se pinta el fondo del documento para que no
    se vea el del host mientras carga el bundle, y se sigue el mismo
    predeterminado que la app (oscuro).
  */
  :root { color-scheme: dark; background: ${INK}; }
  @media (prefers-color-scheme: light) {
    :root:not([data-theme='dark']) { color-scheme: light; background: ${PAPER}; }
  }
  :root[data-theme='light'] { color-scheme: light; background: ${PAPER}; }

  html, body { height: 100%; margin: 0; background: inherit; }
  body { overflow: hidden; }
  #root { display: flex; height: 100%; flex: 1; }
</style>

<div id="root"></div>

<script>
${bundle}
</script>
`

const outPath = join(exportDir, 'preview.html')
writeFileSync(outPath, html)

const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2)
console.log(`✓ ${outPath}`)
console.log(
  `  ${mb} MB · ${inlined} fuente(s) embebida(s) · ${scriptEscapes} escape(s) de </script>`,
)
