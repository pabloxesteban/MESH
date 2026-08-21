/**
 * Valida todo el contenido de artistas.
 *
 * Corre en CI en cada push (estrategia de testing §8, paso 4) y como primer paso
 * de la carga. El contenido malformado aborta ANTES de que se escriba nada — el
 * seeder nunca aplica un lote parcialmente ni saltea en silencio un registro
 * inválido. Ver docs/product/content-policy.md §5.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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
  /**
   * Directorios con un archivo `DRAFT`: no se validan y no se cargan.
   *
   * Existen porque conseguir contenido real lleva días. Un perfil que espera el
   * consentimiento o las fotos tiene que poder vivir en el repo sin romper el
   * build, y sin que nadie tenga que acordarse de dónde lo dejó.
   *
   * El riesgo obvio es que `DRAFT` se vuelva la forma de saltear los chequeos.
   * Contra eso: se listan en cada corrida —no se pueden olvidar en silencio— y
   * el seeder aborta si le piden cargar uno.
   */
  readonly drafts: readonly string[]
}

function listArtistDirs(root: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(root)
  } catch {
    return []
  }
  return entries.filter((entry) => {
    if (entry.startsWith('.') || entry.endsWith('.md')) return false
    return statSync(join(root, entry)).isDirectory()
  })
}

function readYaml(path: string): unknown {
  return parse(readFileSync(path, 'utf8'))
}

/**
 * Revisa UN directorio de artista y devuelve su bundle, o `null` si algo falla.
 *
 * Extraída de `validateAll` para poder correr exactamente los mismos chequeos
 * sobre un borrador sin cargarlo. Si el diagnóstico de borradores usara una
 * copia de estas reglas, terminaría contestando algo distinto de lo que va a
 * decir la validación real el día que se borre el `DRAFT` — que es la única
 * forma en que una herramienta así hace perder tiempo en vez de ahorrarlo.
 */
function checkArtistDir(
  root: string,
  dir: string,
  fail: (message: string) => void,
): ArtistBundle | null {
  const base = join(root, dir)

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
    return null
  }
  if (!/\d{4}-\d{2}-\d{2}/.test(consent)) {
    fail('consent.md no tiene una fecha ISO (AAAA-MM-DD)')
  }

  // Un directorio recién creado por `content:new` viene lleno de TODO. La
  // mayoría los agarra el esquema —un slug de estilo "TODO" no existe en la
  // taxonomía—, pero no todos: `bio: TODO` es un string válido, y un
  // consent.md con los campos sin completar tiene fecha y pasa.
  //
  // Publicar una bio que dice TODO es un error tonto; publicar un registro de
  // consentimiento sin completar es afirmar que hubo una conversación que no
  // hubo. Por eso el marcador es una falla dura y no un aviso.
  for (const archivo of ['consent.md', 'artist.yaml', 'portfolio.yaml']) {
    let contenido: string
    try {
      contenido = readFileSync(join(base, archivo), 'utf8')
    } catch {
      return null
    }
    // Solo lo que queda fuera de un comentario de YAML: las plantillas
    // explican los campos en comentarios, y ahí la palabra es documentación.
    const vivas = contenido
      .split('\n')
      .filter((linea) => !/^\s*#/.test(linea))
      .join('\n')
    if (/\bTODO\b/.test(vivas)) {
      fail(`${archivo} todavía tiene un TODO sin completar`)
    }
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
      return null
    }
    artist = parsed.data
  } catch (error) {
    fail(`no se pudo leer artist.yaml: ${(error as Error).message}`)
    return null
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
      return null
    }
    portfolio = parsed.data
  } catch (error) {
    fail(`no se pudo leer portfolio.yaml: ${(error as Error).message}`)
    return null
  }

  for (const message of validatePortfolioStyles(portfolio, artist.category)) {
    fail(`portfolio.yaml → ${message}`)
  }

  for (const item of portfolio.items) {
    const mediaPath = join(base, 'media', item.file)
    const extension = item.file.slice(item.file.lastIndexOf('.')).toLowerCase()

    if (!ALLOWED_MEDIA.has(extension)) {
      fail(
        `media/${item.file}: extensión "${extension}" no permitida. ` +
          `Permitidas: ${[...ALLOWED_MEDIA].join(', ')} (SVG queda afuera a ` +
          `propósito: es un contenedor de scripts).`,
      )
      return null
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

  return { slug: dir, artist, portfolio }
}

/**
 * Qué le falta a un borrador para poder publicarse.
 *
 * Un borrador no se valida ni se carga —esa es la regla y no cambia—, pero sin
 * esto tampoco recibe ningún feedback: se trabaja a ciegas hasta borrar el
 * `DRAFT`, y ahí aparecen todos los errores juntos. Devuelve la misma lista que
 * daría la validación real, para poder ir tachando de a uno.
 */
export function diagnoseDraft(root: string, dir: string): readonly string[] {
  const findings: string[] = []
  checkArtistDir(root, dir, (message) => findings.push(message))
  return findings
}

export function listDrafts(root: string = CONTENT_ROOT): readonly string[] {
  return listArtistDirs(root).filter((dir) =>
    existsSync(join(root, dir, 'DRAFT')),
  )
}

/**
 * `root` existe solo para los tests: el guard de borradores decide si un
 * directorio se puede publicar, y un guard sin test es una regla que alguien
 * borra sin enterarse.
 */
export function validateAll(root: string = CONTENT_ROOT): ValidationResult {
  const errors: string[] = []
  const bundles: ArtistBundle[] = []
  const drafts: string[] = []

  for (const dir of listArtistDirs(root)) {
    if (existsSync(join(root, dir, 'DRAFT'))) {
      drafts.push(dir)
      continue
    }

    const bundle = checkArtistDir(root, dir, (message) =>
      errors.push(`${dir}: ${message}`),
    )
    if (bundle != null) bundles.push(bundle)
  }

  return { bundles, errors, drafts }
}

function main(): void {
  const { bundles, errors, drafts } = validateAll()

  // Antes de los errores: un borrador no es una falla, pero tampoco puede
  // quedar invisible. Se ve en cada corrida, verde o roja.
  for (const draft of drafts) {
    console.log(`· ${draft}: BORRADOR — no se valida ni se carga.`)
  }
  if (drafts.length > 0) console.log('')

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
    `✓ Validación de contenido: ${bundles.length} artista(s), ${pieces} pieza(s)` +
      `${drafts.length > 0 ? `, ${drafts.length} en borrador` : ''}.`,
  )
}

if (import.meta.filename === process.argv[1]) {
  main()
}
