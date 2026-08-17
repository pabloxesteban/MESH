/**
 * CLI de carga de contenido.
 *
 * Pipeline (Fase 7):
 *   validar todo → redimensionar (sm 400 / md 900 / lg 1600, WebP) → blurhash
 *   → subir a Storage → upsert de filas → escribir audit_event
 *
 * Idempotente: volver a correrlo produce el mismo resultado y no duplica media.
 * Ver docs/product/content-policy.md §7 y ADR-006.
 */

import { assertNotBundled } from './guard.ts'
import { validateAll } from './validate.ts'

function main(): void {
  assertNotBundled()

  const { bundles, errors } = validateAll()
  if (errors.length > 0) {
    console.error('✗ La validación falló. No se cargó nada.')
    console.error('  Corré `npm run content:validate` para ver el detalle.')
    process.exit(1)
  }

  console.error(
    `El pipeline de carga es la Fase 7 y todavía no está implementado.\n` +
      `La validación pasa: ${bundles.length} artista(s) listos para cargar.\n` +
      `Ver docs/product/roadmap.md.`,
  )
  process.exit(1)
}

if (import.meta.filename === process.argv[1]) {
  main()
}
