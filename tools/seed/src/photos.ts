/**
 * Baja las fotos de banco de los artistas fixture.
 *
 * `content/artists/<slug>/media/` está en .gitignore a propósito —los originales
 * quedan con el artista, no en el repo— así que las fotos de los fixtures
 * tampoco se versionan. Lo que sí se versiona es `photos.yaml`: qué archivo,
 * de dónde salió, de quién es y con qué licencia. Ese manifiesto es a la vez
 * el registro de procedencia y la receta para volver a bajarlas.
 *
 * **Estas fotos no son la obra de nadie de MESH.** Son fotos de banco elegidas
 * para que la grilla se pueda mirar con algo que se parezca a un tatuaje. Cada
 * `consent.md` lo dice, y el perfil lleva la insignia de ficticio en toda
 * pantalla donde aparece.
 *
 * Si una foto ya no está en el origen, se avisa y se sigue: `content:fixtures`
 * dibuja un placeholder abstracto para la que falte, que es el piso del que
 * este comando nunca puede hacer caer a nadie.
 *
 * Uso:
 *   npm run content:photos            baja lo que falte
 *   npm run content:photos -- --force vuelve a bajar todo
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

import sharp from 'sharp'
import { parse } from 'yaml'

const CONTENT_ROOT = resolve(import.meta.dirname, '../../../content/artists')

/** 4:5, que es la proporción con la que la grilla dibuja cada obra. */
const RECORTE = { width: 1200, height: 1500 } as const

interface Manifiesto {
  readonly source?: string
  readonly license?: string
  readonly files?: Record<string, { url?: string }>
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force')
  const dirs = readdirSync(CONTENT_ROOT).filter((d) =>
    existsSync(join(CONTENT_ROOT, d, 'photos.yaml')),
  )

  let bajadas = 0
  let existentes = 0
  const fallaron: string[] = []

  for (const dir of dirs) {
    const manifiesto = parse(
      readFileSync(join(CONTENT_ROOT, dir, 'photos.yaml'), 'utf8'),
    ) as Manifiesto

    for (const [archivo, origen] of Object.entries(manifiesto.files ?? {})) {
      const destino = join(CONTENT_ROOT, dir, 'media', archivo)
      if (!force && existsSync(destino)) {
        existentes += 1
        continue
      }
      if (origen.url == null) {
        fallaron.push(`${dir}/${archivo}: sin url en photos.yaml`)
        continue
      }
      try {
        const res = await fetch(origen.url, {
          signal: AbortSignal.timeout(30_000),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        mkdirSync(join(CONTENT_ROOT, dir, 'media'), { recursive: true })
        // Se normaliza acá y no después: el recorte decide qué se ve en la
        // grilla, y hacerlo en la bajada es lo que hace que dos corridas den
        // el mismo archivo. `attention` recorta hacia la zona con más
        // detalle, que en una foto de un tatuaje es el tatuaje.
        const bytes = await sharp(Buffer.from(await res.arrayBuffer()))
          .rotate()
          .resize(RECORTE.width, RECORTE.height, {
            fit: 'cover',
            position: 'attention',
          })
          .jpeg({ quality: 84 })
          .toBuffer()
        writeFileSync(destino, bytes)
        bajadas += 1
      } catch (error) {
        fallaron.push(`${dir}/${archivo}: ${(error as Error).message}`)
      }
    }
  }

  for (const linea of fallaron) console.warn(`  · no se pudo bajar ${linea}`)

  console.log(
    `✓ ${bajadas} foto(s) bajada(s)` +
      (existentes > 0 ? `, ${existentes} ya estaban` : '') +
      (fallaron.length > 0
        ? `, ${fallaron.length} sin bajar — \`npm run content:fixtures\` les pone un placeholder.`
        : '.'),
  )
}

if (import.meta.filename === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(`✗ ${(error as Error).message}`)
    process.exit(1)
  })
}
