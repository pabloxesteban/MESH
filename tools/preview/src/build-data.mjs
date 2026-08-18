#!/usr/bin/env node
/**
 * Hornea el catálogo fixture adentro de un módulo TypeScript.
 *
 * El preview web se publica como UN archivo, sin backend y sin permiso para
 * pedirle nada a ningún host: las imágenes tienen que viajar adentro. Este
 * script lee `content/artists/` —la misma fuente que carga el seeder— y escribe
 * `apps/mobile/preview/data.generated.ts` con las piezas y sus imágenes como
 * data URI.
 *
 * Es el mismo contenido que ve la app de verdad, no una maqueta aparte. Si
 * mañana los fixtures cambian, el preview cambia con ellos corriendo esto de
 * nuevo.
 *
 * Uso: npm run preview:data
 */

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require('sharp')
const YAML = require('yaml')

const ROOT = resolve(import.meta.dirname, '../../..')
const ARTISTS = join(ROOT, 'content/artists')
const OUT = join(ROOT, 'apps/mobile/preview/data.generated.ts')

/**
 * Ancho de la imagen horneada.
 *
 * 560 px es el ancho de una tarjeta del mazo en un teléfono con densidad 2x,
 * con algo de margen. Más grande no se ve mejor y el archivo crece rápido: son
 * 58 imágenes y todas entran en el mismo HTML.
 */
const WIDTH = 560
const QUALITY = 72

const artists = []

for (const slug of readdirSync(ARTISTS).sort()) {
  const dir = join(ARTISTS, slug)

  // Los borradores no entran, igual que no entran en la validación ni en la
  // carga. Son los TRES consumidores de content/artists/, y los tres tienen que
  // saltear lo mismo — este fue el que se olvidó, y el síntoma fue el preview
  // reventando contra una foto que todavía no existe.
  if (existsSync(join(dir, 'DRAFT'))) {
    console.log(`· ${slug}: BORRADOR — no entra en el preview.`)
    continue
  }

  let artist
  try {
    artist = YAML.parse(readFileSync(join(dir, 'artist.yaml'), 'utf8'))
  } catch {
    continue
  }
  const portfolio = YAML.parse(
    readFileSync(join(dir, 'portfolio.yaml'), 'utf8'),
  )

  const pieces = []
  for (const [index, item] of portfolio.items.entries()) {
    const source = join(dir, 'media', item.file)
    const webp = await sharp(source)
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer()
    const meta = await sharp(webp).metadata()

    pieces.push({
      id: `${slug}-${String(index + 1).padStart(2, '0')}`,
      featured: item.featured === true,
      year: item.year ?? null,
      caption: item.caption ?? null,
      styles: item.styles.map((s) => ({ slug: s.slug, weight: s.weight })),
      width: meta.width ?? WIDTH,
      height: meta.height ?? WIDTH,
      dataUri: `data:image/webp;base64,${webp.toString('base64')}`,
    })
  }

  artists.push({
    slug: artist.slug,
    displayName: artist.display_name,
    isFixture: artist.is_fixture === true,
    bio: artist.bio ?? null,
    location: artist.location ?? null,
    travels: artist.travels === true,
    styles: artist.styles.map((s) => ({
      styleSlug: s.slug,
      proficiency: s.proficiency,
      isPrimary: s.primary === true,
    })),
    price: artist.price
      ? {
          minCents: artist.price.min_cents ?? null,
          maxCents: artist.price.max_cents ?? null,
          currency: artist.price.currency,
          pricedAt: artist.price.priced_at,
        }
      : null,
    availability: artist.availability
      ? {
          status: artist.availability.status,
          updatedAt: artist.availability.updated_at,
        }
      : null,
    instagramHandle: artist.contact?.instagram ?? null,
    whatsappE164: artist.contact?.whatsapp ?? null,
    pieces,
  })
}

const total = artists.reduce((sum, a) => sum + a.pieces.length, 0)

const header = `/**
 * GENERADO — no editar a mano.
 *
 * Regenerar con: npm run preview:data
 * Fuente: tools/preview/src/build-data.mjs, sobre content/artists/
 *
 * El catálogo fixture con las imágenes adentro, para que el preview web sea un
 * solo archivo que no le pide nada a ningún servidor. Ver preview-entry.tsx.
 *
 * Este archivo NO entra en el bundle de la app: solo lo importan los módulos
 * \`*.preview.ts\`, y esos solo se resuelven con MESH_PREVIEW=1.
 */

export interface PreviewStyle {
  readonly slug: string
  readonly weight: number
}

export interface PreviewPiece {
  readonly id: string
  readonly featured: boolean
  readonly year: number | null
  readonly caption: string | null
  readonly styles: readonly PreviewStyle[]
  readonly width: number
  readonly height: number
  readonly dataUri: string
}

export interface PreviewArtist {
  readonly slug: string
  readonly displayName: string
  readonly isFixture: boolean
  readonly bio: string | null
  readonly location: string | null
  readonly travels: boolean
  readonly styles: readonly {
    readonly styleSlug: string
    readonly proficiency: number
    readonly isPrimary: boolean
  }[]
  readonly price: {
    readonly minCents: number | null
    readonly maxCents: number | null
    readonly currency: string
    readonly pricedAt: string
  } | null
  readonly availability: {
    readonly status: string
    readonly updatedAt: string
  } | null
  readonly instagramHandle: string | null
  readonly whatsappE164: string | null
  readonly pieces: readonly PreviewPiece[]
}

export const PREVIEW_ARTISTS: readonly PreviewArtist[] = `

mkdirSync(join(ROOT, 'apps/mobile/preview'), { recursive: true })
writeFileSync(OUT, header + JSON.stringify(artists, null, 2) + ' as const\n')

execFileSync('npx', ['prettier', '--write', OUT], { cwd: ROOT, stdio: 'pipe' })

const mb = (readFileSync(OUT).length / 1024 / 1024).toFixed(2)
console.log(
  `✓ ${artists.length} artista(s), ${total} pieza(s), ${mb} MB en ${OUT.slice(ROOT.length + 1)}`,
)
