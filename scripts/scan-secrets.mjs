#!/usr/bin/env node
/**
 * Escaneo de secretos.
 *
 * Falla si algo que parece una service-role key llegó al código de la app o al
 * bundle compilado. Corre en CI en cada push (estrategia de testing §8, paso 7).
 *
 * Esto no reemplaza a RLS ni al .gitignore — es la última red antes de que un
 * secreto que saltea RLS se publique. Ver threat-model §T5.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

/**
 * Se escanean: el código del cliente y cualquier bundle compilado.
 *
 * Se pueden pasar directorios extra por argumento — así es como CI escanea el
 * bundle exportado, que es donde de verdad importa: el código fuente puede
 * estar limpio y aun así el bundler puede haber inlineado una variable de
 * entorno mal prefijada.
 */
const EXTRA_ROOTS = process.argv.slice(2)
const SCAN_ROOTS = ['apps/mobile', 'packages', ...EXTRA_ROOTS]

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.expo',
  'assets',
  'coverage',
])

const SCAN_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.map',
])

const PATTERNS = [
  {
    name: 'service-role key de Supabase (JWT)',
    // JWT cuyo payload declara el rol service_role.
    regex:
      /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*(?:c2VydmljZV9yb2xl|InNlcnZpY2Vfcm9sZSI)/,
  },
  {
    name: 'clave secreta de Supabase (sb_secret_)',
    regex: /\bsb_secret_[A-Za-z0-9_-]{8,}/,
  },
  {
    name: 'referencia a service_role',
    regex: /\bservice[_-]?role[_-]?key\b/i,
  },
  {
    name: 'clave privada PEM',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
]

/** Este archivo define los patrones, así que se excluye a sí mismo. */
const ALLOWLIST = new Set(['scripts/scan-secrets.mjs'])

function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const path = join(dir, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      yield* walk(path)
    } else if (SCAN_EXTENSIONS.has(extname(entry))) {
      yield path
    }
  }
}

const findings = []

for (const scanRoot of SCAN_ROOTS) {
  for (const path of walk(resolve(ROOT, scanRoot))) {
    const relativePath = relative(ROOT, path)
    if (ALLOWLIST.has(relativePath)) continue

    const contents = readFileSync(path, 'utf8')
    for (const { name, regex } of PATTERNS) {
      if (regex.test(contents)) {
        findings.push({ path: relativePath, name })
      }
    }
  }
}

if (findings.length > 0) {
  console.error('\n✗ Escaneo de secretos: se encontraron posibles secretos.\n')
  for (const { path, name } of findings) {
    console.error(`  · ${path} — ${name}`)
  }
  console.error(
    '\nLa service-role key existe solo en tools/seed y en los secretos de CI.\n' +
      'Si esto llegó al cliente, rotá la clave antes de arreglar el código.\n' +
      'Ver docs/security/threat-model.md §T5.\n',
  )
  process.exit(1)
}

const alcance =
  EXTRA_ROOTS.length > 0
    ? `el código del cliente y ${EXTRA_ROOTS.join(', ')}`
    : 'el código del cliente'
console.log(`✓ Escaneo de secretos: nada encontrado en ${alcance}.`)
