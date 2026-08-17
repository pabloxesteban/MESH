#!/usr/bin/env node
/**
 * Gate de `npm audit` para CI.
 *
 * Falla ante cualquier aviso alto o crítico, EXCEPTO los que estén en la lista
 * de excepciones de abajo. Cada excepción lleva razón, fecha y disparador de
 * revisión.
 *
 * Por qué esto y no `npm audit --audit-level=critical`: bajar el umbral general
 * apaga el chequeo para siempre y en silencio. Una lista de excepciones por
 * aviso mantiene el gate: un aviso alto NUEVO sigue rompiendo el build.
 *
 * Ver docs/security/security-model.md §10.
 */

import { execFileSync } from 'node:child_process'

/**
 * Avisos aceptados a conciencia.
 *
 * Regla para agregar uno: tiene que ser inalcanzable desde el código que corre
 * en el dispositivo de una persona, o tener una mitigación concreta. "Es
 * molesto de arreglar" no es una razón.
 */
const ACCEPTED = [
  {
    id: 'GHSA-w3rx-r6r6-pgpr',
    package: 'image-size',
    accepted: '2026-08-17',
    reason:
      'DoS al parsear un ICNS malformado. Se alcanza solo por ' +
      'expo → @expo/metro → metro: es el bundler, corre en build sobre ' +
      'nuestros propios archivos, no en el dispositivo de nadie. El "fix" que ' +
      'propone npm es expo@53 (cuatro SDK atrás), que empeora todo lo demás. ' +
      'Además nuestra lista blanca de media no acepta ICNS.',
    reviewWhen:
      'Expo publique una SDK con metro > 0.84.4, o aparezca una vía de ' +
      'explotación en runtime.',
  },
  {
    id: 'GHSA-5p2g-fcmc-qvqq',
    package: 'image-size',
    accepted: '2026-08-17',
    reason:
      'DoS al parsear JXL/HEIF malformados. Misma vía y mismo razonamiento ' +
      'que GHSA-w3rx-r6r6-pgpr: es el bundler, no runtime. Ojo: HEIF sí está ' +
      'en nuestra lista blanca de subidas, pero esas imágenes las procesa ' +
      'sharp en tools/seed, no metro.',
    reviewWhen:
      'Expo publique una SDK con metro > 0.84.4, o el pipeline de media pase ' +
      'a usar image-size.',
  },
]

const acceptedIds = new Set(ACCEPTED.map((a) => a.id))

let report
try {
  report = JSON.parse(
    execFileSync('npm', ['audit', '--json'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }),
  )
} catch (error) {
  // npm audit sale con código != 0 cuando encuentra algo; el JSON igual sirve.
  if (error.stdout == null || error.stdout.length === 0) {
    console.error('✗ No se pudo correr npm audit:', error.message)
    process.exit(1)
  }
  report = JSON.parse(error.stdout)
}

/** Junta los avisos raíz (los objetos `via`), no los paquetes alcanzados. */
const advisories = new Map()
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via ?? []) {
    if (typeof via === 'object' && via.url != null) {
      const id = via.url.split('/').pop()
      advisories.set(id, {
        id,
        severity: via.severity,
        title: via.title,
        name: via.name,
      })
    }
  }
}

const blocking = [...advisories.values()].filter(
  (a) =>
    (a.severity === 'high' || a.severity === 'critical') &&
    !acceptedIds.has(a.id),
)

const staleExceptions = ACCEPTED.filter((a) => !advisories.has(a.id))

if (staleExceptions.length > 0) {
  console.log('ℹ Excepciones que ya no aplican (borralas de este archivo):')
  for (const a of staleExceptions) console.log(`    · ${a.id} (${a.package})`)
  console.log('')
}

if (blocking.length > 0) {
  console.error(
    `\n✗ npm audit: ${blocking.length} aviso(s) alto/crítico sin aceptar.\n`,
  )
  for (const a of blocking) {
    console.error(`  [${a.severity}] ${a.name} — ${a.title}`)
    console.error(`      https://github.com/advisories/${a.id}\n`)
  }
  console.error(
    'Arreglalo, o agregalo a ACCEPTED en scripts/audit-check.mjs con razón,\n' +
      'fecha y disparador de revisión. "Es molesto" no es una razón.\n',
  )
  process.exit(1)
}

const accepted = ACCEPTED.filter((a) => advisories.has(a.id))
console.log(
  `✓ npm audit: sin avisos altos/críticos sin aceptar` +
    (accepted.length > 0
      ? ` (${accepted.length} aceptado(s): ${accepted.map((a) => a.id).join(', ')})`
      : ''),
)
