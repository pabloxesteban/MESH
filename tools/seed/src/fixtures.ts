/**
 * Regenera las imágenes de todos los artistas fixture.
 *
 * Los directorios `media/` del contenido están en .gitignore, así que después
 * de clonar el repo esas imágenes no existen y la validación falla. Correr esto
 * las devuelve.
 *
 * Solo toca directorios con `is_fixture: true`: los originales de un artista
 * real quedan con el artista y no se generan nunca.
 */

import { validateAll } from './validate.ts'
import { writeFixtureImage } from './make-fixtures.ts'

async function main(): Promise<void> {
  const { bundles } = validateAll()

  // La validación puede fallar justamente porque faltan las imágenes, así que
  // acá se ignoran sus errores y se lee el YAML igual. Después de generar, la
  // validación de verdad corre en `content:validate`.
  const { readdirSync, readFileSync, statSync } = await import('node:fs')
  const { join, resolve } = await import('node:path')
  const { parse } = await import('yaml')

  const root = resolve(import.meta.dirname, '../../../content/artists')
  const dirs = readdirSync(root).filter(
    (entry) =>
      !entry.startsWith('.') &&
      !entry.endsWith('.md') &&
      statSync(join(root, entry)).isDirectory(),
  )

  let written = 0
  for (const dir of dirs) {
    let artist: { is_fixture?: boolean }
    let portfolio: { items?: Array<{ file?: string }> }
    try {
      artist = parse(readFileSync(join(root, dir, 'artist.yaml'), 'utf8'))
      portfolio = parse(readFileSync(join(root, dir, 'portfolio.yaml'), 'utf8'))
    } catch {
      continue
    }

    if (artist.is_fixture !== true) continue

    const items = portfolio.items ?? []
    for (const [index, item] of items.entries()) {
      if (item.file == null) continue
      await writeFixtureImage(dir, item.file, index)
      written += 1
    }
  }

  console.log(
    `✓ ${written} imagen(es) fixture generadas.` +
      (bundles.length > 0
        ? ''
        : ' Corré `npm run content:validate` para verificar.'),
  )
}

if (import.meta.filename === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(`✗ ${(error as Error).message}`)
    process.exit(1)
  })
}
