#!/usr/bin/env node
/**
 * Genera `packages/domain/src/db/database.types.ts` desde el esquema local.
 *
 * El archivo vive en `packages/domain` y no en `apps/mobile` porque el seeder
 * también lo necesita, y porque son tipos puros: no importan `@supabase/*` ni
 * nada de React Native, así que no violan la regla de lint del paquete.
 *
 * Uso:
 *   node scripts/generate-db-types.mjs           regenera el archivo
 *   node scripts/generate-db-types.mjs --check   falla si quedó desactualizado
 *
 * `--check` es lo que corre en CI, después de aplicar las migraciones sobre una
 * base limpia: si alguien cambió el esquema y no regeneró los tipos, el build
 * falla ahí y no seis pantallas después con un error de runtime.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'packages/domain/src/db/database.types.ts')

const HEADER = `/**
 * GENERADO — no editar a mano.
 *
 * Fuente: el esquema de supabase/migrations/. Regenerar con:
 *   npm run db:types
 *
 * Estos tipos son el contrato con Postgres. Los tipos de dominio escritos a
 * mano viven en ../types/core.ts, y database.types.test.ts verifica que los dos
 * coincidan — una discrepancia es un bug en alguno de los dos, y se resuelve en
 * el momento. Ver .claude/workflows/database-change.md §5.
 */

`

const cli = resolve(ROOT, 'node_modules/.bin/supabase')
const generated =
  HEADER +
  execFileSync(cli, ['gen', 'types', 'typescript', '--local'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })

if (process.argv.includes('--check')) {
  let current = ''
  try {
    current = readFileSync(OUT, 'utf8')
  } catch {
    console.error(`✗ Falta ${OUT}. Corré: npm run db:types`)
    process.exit(1)
  }

  if (current !== generated) {
    console.error(
      '✗ database.types.ts no coincide con el esquema.\n' +
        '  Cambió una migración y no se regeneraron los tipos.\n' +
        '  Corré: npm run db:types',
    )
    process.exit(1)
  }

  console.log('✓ database.types.ts al día con el esquema')
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, generated)
  console.log(`✓ ${OUT}`)
}
