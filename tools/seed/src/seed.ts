/**
 * CLI de carga de contenido.
 *
 * Pipeline:
 *   validar todo → redimensionar (sm 400 / md 900 / lg 1600, WebP) → blurhash
 *   → subir a Storage → upsert de filas → escribir audit_event
 *
 * **La validación corre entera antes de la primera escritura.** Un seeder que
 * valida mientras carga deja media base escrita cuando encuentra el error, y
 * "media cargado" es peor que "no cargado": nadie sabe qué falta.
 *
 * Idempotente: volver a correrlo produce el mismo resultado y no duplica media.
 * Ver docs/product/content-policy.md §7 y ADR-006.
 *
 * Uso:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed -w @mesh/seed
 *   … --target production   rechaza fixtures
 *   … --publish             además publica lo cargado
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { assertNoFixturesInProduction, assertNotBundled } from './guard.ts'
import { processImage } from './media.ts'
import {
  createServiceClient,
  loadReferenceIds,
  upsertArtist,
  upsertPiece,
  writeAuditEvent,
  type Client,
} from './upsert.ts'
import { validateAll, type ArtistBundle } from './validate.ts'

const CONTENT_ROOT = resolve(import.meta.dirname, '../../../content/artists')

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

async function seedArtist(
  client: Client,
  bundle: ArtistBundle,
  refs: Awaited<ReturnType<typeof loadReferenceIds>>,
  publish: boolean,
): Promise<number> {
  const professionalId = await upsertArtist(client, bundle.artist, refs)

  let index = 0
  for (const item of bundle.portfolio.items) {
    const filePath = join(CONTENT_ROOT, bundle.slug, 'media', item.file)
    const original = readFileSync(filePath)
    const checksum = createHash('sha256').update(original).digest('hex')

    const image = await processImage(original, checksum)
    await upsertPiece(
      client,
      professionalId,
      bundle.slug,
      { item, image, index },
      refs,
    )
    index += 1
  }

  if (publish) {
    // Publicar es una decisión aparte de cargar, y queda registrada. Un perfil
    // que aparece en el mazo sin que nadie lo haya decidido es exactamente lo
    // que el flujo de consentimiento existe para evitar.
    const { error } = await client
      .from('professionals')
      .update({ is_published: true })
      .eq('id', professionalId)
    if (error != null) {
      throw new Error(`no se pudo publicar ${bundle.slug}: ${error.message}`)
    }
    await writeAuditEvent(
      client,
      'professional.published',
      'professional',
      professionalId,
      {
        slug: bundle.slug,
      },
    )
  }

  await writeAuditEvent(
    client,
    'content.seeded',
    'professional',
    professionalId,
    {
      slug: bundle.slug,
      pieces: index,
      is_fixture: bundle.artist.is_fixture ?? false,
    },
  )

  return index
}

async function main(): Promise<void> {
  assertNotBundled()

  const target = arg('target') ?? 'local'
  const publish = flag('publish')
  const url = process.env['SUPABASE_URL']
  if (url == null || url.length === 0) {
    console.error('Falta SUPABASE_URL.')
    process.exit(1)
  }

  const { bundles, errors, drafts } = validateAll()

  // Un borrador no se carga, ni acá ni con --publish. Que la corrida los nombre
  // en vez de saltearlos en silencio es el punto: si alguien esperaba ver a esa
  // persona en la app, esta línea le dice por qué no está.
  for (const draft of drafts) {
    console.log(`  · ${draft}: BORRADOR — salteado, no se carga.`)
  }

  if (errors.length > 0) {
    console.error(
      `\n✗ La validación falló con ${errors.length} error(es). No se cargó nada.\n`,
    )
    for (const error of errors) console.error(`  · ${error}`)
    process.exit(1)
  }

  if (bundles.length === 0) {
    console.log('No hay artistas en content/artists/. Nada que cargar.')
    return
  }

  assertNoFixturesInProduction(
    target,
    bundles.filter((b) => b.artist.is_fixture === true).map((b) => b.slug),
  )

  const client = createServiceClient(url)
  const refs = await loadReferenceIds(client, 'tattoo')

  let pieces = 0
  for (const bundle of bundles) {
    const count = await seedArtist(client, bundle, refs, publish)
    pieces += count
    console.log(
      `  · ${bundle.slug}: ${count} pieza(s)` +
        `${bundle.artist.is_fixture === true ? ' [fixture]' : ''}` +
        `${publish ? ' · publicado' : ''}`,
    )
  }

  console.log(
    `\n✓ ${bundles.length} artista(s), ${pieces} pieza(s), ${pieces * 3} objeto(s) en storage.` +
      (publish
        ? ''
        : '\n  Nada quedó publicado. Volvé a correr con --publish cuando estén revisados.'),
  )
}

if (import.meta.filename === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(`\n✗ ${(error as Error).message}\n`)
    process.exit(1)
  })
}
