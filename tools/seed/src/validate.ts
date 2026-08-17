/**
 * Valida todo el contenido de artistas.
 *
 * Corre en CI en cada push (estrategia de testing §8, paso 4) y como primer paso
 * de la carga. El contenido malformado aborta ANTES de que se escriba nada — el
 * seeder nunca aplica un lote parcialmente ni saltea en silencio un registro
 * inválido. Ver docs/product/content-policy.md §5.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'
import {
  artistSchema,
  portfolioSchema,
  validatePortfolioStyles,
  type ArtistContent,
  type PortfolioContent,
} from '@mesh/domain'

const CONTENT_ROOT = resolve(import.meta.dirname, '../../../content/artists')

/** Extensiones aceptadas. Sin SVG: es un contenedor de scripts, no una imagen. */
const ALLOWED_MEDIA = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic'])
const MAX_MEDIA_BYTES = 12 * 1024 * 1024

export interface ArtistBundle {
  readonly slug: string
  readonly artist: ArtistContent
  readonly portfolio: PortfolioContent
}

export interface ValidationResult {
  readonly bundles: readonly ArtistBundle[]
  readonly errors: readonly string[]
}

function listArtistDirs(): string[] {
  let entries: string[]
  try {
    entries = readdirSync(CONTENT_ROOT)
  } catch {
    return []
  }
  return entries.filter((entry) => {
    if (entry.startsWith('.') || entry.endsWith('.md')) return false
    return statSync(join(CONTENT_ROOT, entry)).isDirectory()
  })
}

function readYaml(path: string): unknown {
  return parse(readFileSync(path, 'utf8'))
}

export function validateAll(): ValidationResult {
  const errors: string[] = []
  const bundles: ArtistBundle[] = []

  for (const dir of listArtistDirs()) {
    const base = join(CONTENT_ROOT, dir)
    const fail = (message: string) => errors.push(`${dir}: ${message}`)

    // El consentimiento es requisito de inclusión, no un chequeo blando.
    // Ver docs/product/content-policy.md §2.
    let consent: string
    try {
      consent = readFileSync(join(base, 'consent.md'), 'utf8')
    } catch {
      fail(
        'falta consent.md. Ningún artista se carga sin un registro de ' +
          'consentimiento fechado.',
      )
      continue
    }
    if (!/\d{4}-\d{2}-\d{2}/.test(consent)) {
      fail('consent.md no tiene una fecha ISO (AAAA-MM-DD)')
    }

    let artist: ArtistContent
    try {
      const parsed = artistSchema.safeParse(readYaml(join(base, 'artist.yaml')))
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          fail(
            `artist.yaml → ${issue.path.join('.') || '(raíz)'}: ${issue.message}`,
          )
        }
        continue
      }
      artist = parsed.data
    } catch (error) {
      fail(`no se pudo leer artist.yaml: ${(error as Error).message}`)
      continue
    }

    if (artist.slug !== dir) {
      fail(`el slug "${artist.slug}" no coincide con el directorio "${dir}"`)
    }

    let portfolio: PortfolioContent
    try {
      const parsed = portfolioSchema.safeParse(
        readYaml(join(base, 'portfolio.yaml')),
      )
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          fail(`portfolio.yaml → ${issue.path.join('.')}: ${issue.message}`)
        }
        continue
      }
      portfolio = parsed.data
    } catch (error) {
      fail(`no se pudo leer portfolio.yaml: ${(error as Error).message}`)
      continue
    }

    for (const message of validatePortfolioStyles(portfolio, artist.category)) {
      fail(`portfolio.yaml → ${message}`)
    }

    for (const item of portfolio.items) {
      const mediaPath = join(base, 'media', item.file)
      const extension = item.file
        .slice(item.file.lastIndexOf('.'))
        .toLowerCase()

      if (!ALLOWED_MEDIA.has(extension)) {
        fail(
          `media/${item.file}: extensión "${extension}" no permitida. ` +
            `Permitidas: ${[...ALLOWED_MEDIA].join(', ')} (SVG queda afuera a ` +
            `propósito: es un contenedor de scripts).`,
        )
        continue
      }

      try {
        const { size } = statSync(mediaPath)
        if (size > MAX_MEDIA_BYTES) {
          fail(
            `media/${item.file}: ${(size / 1024 / 1024).toFixed(1)} MB supera el ` +
              `tope de 12 MB`,
          )
        }
      } catch {
        fail(`media/${item.file}: el archivo no existe`)
      }
    }

    bundles.push({ slug: dir, artist, portfolio })
  }

  return { bundles, errors }
}

function main(): void {
  const { bundles, errors } = validateAll()

  if (errors.length > 0) {
    console.error(
      `\n✗ La validación de contenido falló con ${errors.length} error(es):\n`,
    )
    for (const error of errors) console.error(`  · ${error}`)
    console.error(
      '\nNo se cargó nada. El contenido malformado aborta antes de la primera ' +
        'inserción — nunca se aplica un lote a medias.\n',
    )
    process.exit(1)
  }

  if (bundles.length === 0) {
    console.log(
      '✓ Validación de contenido: todavía no hay artistas en content/artists/.',
    )
    return
  }

  const pieces = bundles.reduce((sum, b) => sum + b.portfolio.items.length, 0)
  console.log(
    `✓ Validación de contenido: ${bundles.length} artista(s), ${pieces} pieza(s).`,
  )
}

if (import.meta.filename === process.argv[1]) {
  main()
}
