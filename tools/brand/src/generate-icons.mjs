/**
 * Genera los íconos de app y el favicon desde los SVG de brand/logo.
 *
 * Los SVG son la fuente de verdad. Ningún PNG se exporta a mano: un ícono
 * exportado a mano se desincroniza del logo en cuanto alguien toca la marca, y
 * nadie se entera hasta que ya se publicó.
 *
 *   npm run brand:icons
 *
 * Todos usan el óptico de ícono (mesh-symbol-icon.svg): el ícono de app se ve
 * chico incluso cuando el archivo es de 1024px.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { INK, PADDING, PAPER, ROOT, renderPng } from './render.mjs'

const ASSETS = resolve(ROOT, 'apps/mobile/assets')
const BRAND_ICONS = resolve(ROOT, 'brand/icons')

const SYMBOL = 'mesh-symbol-icon.svg'

const TARGETS = [
  {
    path: resolve(ASSETS, 'icon.png'),
    size: 1024,
    color: PAPER,
    background: INK,
    padding: PADDING.ios,
    note: 'ícono de iOS — papel sobre tinta, opaco',
  },
  {
    path: resolve(ASSETS, 'android-icon-foreground.png'),
    size: 1024,
    color: PAPER,
    background: null,
    padding: PADDING.adaptive,
    note: 'frente adaptativo de Android — transparente, dentro de la zona segura',
  },
  {
    path: resolve(ASSETS, 'android-icon-monochrome.png'),
    size: 1024,
    color: '#000000',
    background: null,
    padding: PADDING.adaptive,
    note: 'monocromo de Android — el sistema lo tiñe según el tema del usuario',
  },
  {
    path: resolve(ASSETS, 'favicon.png'),
    size: 196,
    color: PAPER,
    background: INK,
    padding: PADDING.favicon,
    note: 'favicon — opaco, porque la barra del navegador puede ser clara u oscura',
  },
  {
    path: resolve(ASSETS, 'splash-icon.png'),
    size: 512,
    color: PAPER,
    background: null,
    padding: PADDING.splash,
    note: 'splash — transparente, Expo pinta el fondo',
  },
]

mkdirSync(BRAND_ICONS, { recursive: true })

for (const target of TARGETS) {
  const png = renderPng({
    file: SYMBOL,
    size: target.size,
    color: target.color,
    background: target.background,
    padding: target.padding,
  })
  writeFileSync(target.path, png)
  console.log(
    `✓ ${target.path.replace(ROOT + '/', '').padEnd(44)} ${target.size}px  ${target.note}`,
  )
}

// El fondo adaptativo de Android es un color plano; se genera igual para que
// exista como archivo y app.json no dependa de un PNG editado a mano.
const flat = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="${INK}"/></svg>`

import('@resvg/resvg-js').then(({ Resvg }) => {
  const png = new Resvg(flat, { fitTo: { mode: 'width', value: 1024 } })
    .render()
    .asPng()
  writeFileSync(resolve(ASSETS, 'android-icon-background.png'), png)
  console.log(
    `✓ ${'apps/mobile/assets/android-icon-background.png'.padEnd(44)} 1024px  fondo adaptativo — ${INK} plano`,
  )
})
