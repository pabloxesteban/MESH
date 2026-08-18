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
 * **El archivo no se da por bueno hasta abrirlo.** Al final, el script lo carga
 * en un Chromium headless y verifica que renderice texto y que no haya tirado
 * ningún error. Sin ese paso, el preview salió una vez completamente negro
 * —montaba `app/index.tsx`, que había dejado de ser la galería para pasar a ser
 * el mazo, y el mazo necesita una sesión que en un HTML suelto no existe— y el
 * archivo se entregó igual porque pesaba lo esperado. El tamaño no dice nada
 * sobre si se ve algo.
 *
 * Uso:
 *   node scripts/build-web-preview.mjs
 *
 * Salida: /tmp/mesh-web/preview.html
 */

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
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
console.log(
  `· ${mb} MB · ${inlined} fuente(s) embebida(s) · ${scriptEscapes} escape(s) de </script>`,
)

// --- verificación: abrirlo -----------------------------------------------

/**
 * Texto que tiene que aparecer sí o sí.
 *
 * Sale del encabezado de la galería. Si la galería cambia de título, este canario
 * hay que cambiarlo — y que haya que tocarlo es preferible a un canario tan laxo
 * que pase con la pantalla equivocada renderizada.
 */
const CANARIO = 'DESIGN SYSTEM'

/** Mínimo de texto visible. Un render a medias produce muy poco. */
const MINIMO_CARACTERES = 400

let chromium
try {
  chromium = createRequire(import.meta.url)('playwright').chromium
} catch {
  console.error(
    '✗ Falta playwright. El preview NO se verificó, así que no se entrega.\n' +
      '  npm i -D playwright',
  )
  process.exit(1)
}

const browser = await chromium.launch({
  // Chromium ya viene instalado en el entorno; sin esto intenta descargarlo.
  ...(process.env.PLAYWRIGHT_BROWSERS_PATH != null
    ? { executablePath: '/opt/pw-browsers/chromium' }
    : {}),
})

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto(`file://${outPath}`)
  await page.waitForTimeout(3000)

  // El cuerpo de `evaluate` corre en el navegador, no en Node, así que `document`
  // existe allá aunque el lint de este archivo no lo conozca.
  const text = (
    await page.evaluate(
      // eslint-disable-next-line no-undef
      () => document.body.innerText,
    )
  ).trim()

  // Los errores de supabase-js sobre SecureStore son esperados: el adaptador
  // habla con un módulo nativo que en un navegador no existe. No impiden que la
  // galería renderice, y la galería es lo único que este preview muestra.
  const reales = errors.filter(
    (error) => !/getValueWithKeyAsync|Auto refresh tick/.test(error),
  )

  if (text.length === 0) {
    console.error('✗ La página no renderizó NADA. Errores:')
    for (const error of errors.slice(0, 5)) console.error(`  · ${error}`)
    process.exit(1)
  }

  if (text.length < MINIMO_CARACTERES) {
    console.error(
      `✗ Renderizó solo ${text.length} caracteres, menos de ${MINIMO_CARACTERES}.`,
    )
    console.error(`  ${JSON.stringify(text.slice(0, 200))}`)
    process.exit(1)
  }

  if (!text.includes(CANARIO)) {
    console.error(`✗ Renderizó algo pero falta "${CANARIO}". Puede estar rota.`)
    console.error(
      `  Primeros 200 caracteres: ${JSON.stringify(text.slice(0, 200))}`,
    )
    process.exit(1)
  }

  if (reales.length > 0) {
    console.error('✗ Renderizó, pero tiró errores:')
    for (const error of reales.slice(0, 5)) console.error(`  · ${error}`)
    process.exit(1)
  }

  console.log(`✓ ${outPath}`)
  console.log(`  Verificado en Chromium: ${text.length} caracteres visibles.`)
} finally {
  await browser.close()
}
