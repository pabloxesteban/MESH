/**
 * La fila de `professionals` que escribe la carga.
 *
 * Existe por un defecto que solo se puede tropezar con contenido real, y que
 * encontré cargando de a un artista: **la carga despublicaba.** `is_published`
 * se escribía en `false` en cada corrida, con el razonamiento correcto
 * —publicar es una decisión aparte de cargar— aplicado al caso equivocado.
 *
 * En un alta es cierto. En una actualización significa que corregir una bio
 * saca a la persona de la app, en silencio, hasta que alguien se acuerde de
 * volver a correr con `--publish`. Y corregir un dato re-cargando es
 * exactamente lo que `docs/launch/rollback.md` caso 2 promete resolver en una
 * hora sin release.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { artistRow } from './upsert.ts'

const BASE = {
  categoryId: 'cat-1',
  locationId: 'loc-1',
}

function artista(patch: Record<string, unknown> = {}) {
  return {
    slug: 'briza-maldonado',
    display_name: 'Briza Maldonado',
    location: 'palermo',
    styles: [],
    contact: { instagram: 'briza' },
    ...patch,
  } as never
}

test('en el alta se escribe sin publicar', () => {
  // Cargar no es publicar: un perfil recién cargado no aparece hasta que
  // alguien lo decide, después de mostrárselo a la persona.
  const row = artistRow(artista(), { ...BASE, isNew: true })
  assert.equal(row.is_published, false)
})

test('al actualizar no se toca is_published', () => {
  // El defecto que este test existe para que no vuelva. Ni para arriba ni para
  // abajo: la carga no opina sobre si alguien está publicado.
  const row = artistRow(artista(), { ...BASE, isNew: false })
  assert.equal(
    'is_published' in row,
    false,
    'una actualización escribió is_published y puede despublicar a alguien',
  )
})

test('los campos que solo trae el contenido real se mapean', () => {
  // Precio y disponibilidad no los usa ningún fixture, así que son justo los
  // que pueden estar mal escritos sin que nada falle.
  const row = artistRow(
    artista({
      bio: 'Tatúo hace ocho años.',
      travels: true,
      price: {
        min_cents: 4_500_000,
        max_cents: 13_000_000,
        currency: 'ARS',
        priced_at: '2026-08-04',
      },
      availability: { status: 'open', updated_at: '2026-08-16' },
      contact: { instagram: 'briza', whatsapp: '+5491122334455' },
    }),
    { ...BASE, isNew: true },
  )

  assert.equal(row.bio, 'Tatúo hace ocho años.')
  assert.equal(row.travels, true)
  assert.equal(row.price_min_cents, 4_500_000)
  assert.equal(row.price_max_cents, 13_000_000)
  assert.equal(row.price_currency, 'ARS')
  assert.equal(row.priced_at, '2026-08-04')
  assert.equal(row.availability_status, 'open')
  assert.equal(row.availability_updated_at, '2026-08-16')
  assert.equal(row.whatsapp_e164, '+5491122334455')
})

test('lo que falta se escribe nulo, nunca con un relleno', () => {
  // Un campo que falta no renderiza nada en la app. Para eso tiene que llegar
  // como null y no como '' ni como 0.
  const row = artistRow(artista(), { ...BASE, isNew: true })

  assert.equal(row.bio, null)
  assert.equal(row.price_min_cents, null)
  assert.equal(row.price_currency, null)
  assert.equal(row.priced_at, null)
  assert.equal(row.availability_status, null)
  assert.equal(row.whatsapp_e164, null)
})

test('sin is_fixture declarado, no es fixture', () => {
  // El default tiene que ser el seguro: un artista real que por olvido quedara
  // marcado como fixture se saltearía en producción.
  const row = artistRow(artista(), { ...BASE, isNew: true })
  assert.equal(row.is_fixture, false)
})
