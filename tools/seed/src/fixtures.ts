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
  // `--force` regenera aunque ya haya un archivo. Sin él, una foto bajada con
  // `content:photos` se respeta: pisarla en silencio dejaría la app en formas
  // geométricas sin que nadie se entere de por qué.
  const force = process.argv.includes('--force')
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
  let kept = 0
  for (const dir of dirs) {
    let artist: { is_fixture?: boolean }
    let portfolio: {
      items?: Array<{
        file?: string
        styles?: Array<{ slug?: string; weight?: number }>
      }>
    }
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
      // Se dibuja con el estilo de MÁS PESO de la pieza: es el que la define, y
      // dibujar una mezcla de cuatro no se parecería a ninguno.
      const dominante = [...(item.styles ?? [])].sort(
        (a, b) => Number(b.weight ?? 0) - Number(a.weight ?? 0),
      )[0]
      const nuevo = await writeFixtureImage(
        dir,
        item.file,
        index,
        dominante?.slug ?? 'fine-line',
        force,
      )
      if (nuevo) written += 1
      else kept += 1
    }
  }

  console.log(
    `✓ ${written} imagen(es) fixture generadas.` +
      (kept > 0
        ? ` ${kept} ya existían y se dejaron como estaban (--force las regenera).`
        : '') +
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
