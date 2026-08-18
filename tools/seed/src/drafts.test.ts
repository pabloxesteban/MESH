/**
 * Tests del guard de borradores.
 *
 * Un directorio con `DRAFT` no se valida y no se carga. Es la regla que decide
 * si un perfil incompleto puede llegar a producción, así que tiene test: un
 * guard sin test es una regla que alguien borra sin enterarse.
 */

import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { validateAll } from './validate.ts'

/** Un artista incompleto: sin consentimiento, sin YAML. Falla todo. */
function artistaRoto(root: string, slug: string): void {
  mkdirSync(join(root, slug), { recursive: true })
}

function conRaizTemporal(fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'mesh-drafts-'))
  try {
    fn(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('un directorio incompleto sin DRAFT falla la validación', () => {
  conRaizTemporal((root) => {
    artistaRoto(root, 'briza-maldonado')
    const { errors, bundles, drafts } = validateAll(root)
    assert.equal(drafts.length, 0)
    assert.equal(bundles.length, 0)
    assert.ok(errors.length > 0, 'tendría que haber reportado errores')
  })
})

test('el mismo directorio con DRAFT no reporta errores', () => {
  conRaizTemporal((root) => {
    artistaRoto(root, 'briza-maldonado')
    writeFileSync(join(root, 'briza-maldonado', 'DRAFT'), 'faltan las fotos\n')

    const { errors, bundles, drafts } = validateAll(root)
    assert.deepEqual([...errors], [])
    assert.equal(bundles.length, 0, 'un borrador no se carga')
    assert.deepEqual([...drafts], ['briza-maldonado'])
  })
})

test('un borrador nunca entra en los bundles, ni con hermanos válidos', () => {
  conRaizTemporal((root) => {
    artistaRoto(root, 'en-borrador')
    writeFileSync(join(root, 'en-borrador', 'DRAFT'), 'x\n')
    artistaRoto(root, 'roto-de-verdad')

    const { errors, drafts } = validateAll(root)
    assert.deepEqual([...drafts], ['en-borrador'])
    // El que no es borrador sigue fallando: DRAFT tapa un directorio, no la
    // validación entera.
    assert.ok(errors.some((error) => error.startsWith('roto-de-verdad:')))
    assert.ok(!errors.some((error) => error.startsWith('en-borrador:')))
  })
})
