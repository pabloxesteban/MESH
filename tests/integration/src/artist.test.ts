/**
 * El modo artista, con la anon key y de punta a punta.
 *
 * Lo que esto cubre y 25_artist_ownership.sql no: que el RPC de reclamo esté
 * expuesto por PostgREST, que la política de storage acepte una subida real, y
 * que el conjunto de grants alcance para el recorrido completo. Un grant
 * correcto y un PostgREST mal configurado se ven igual desde adentro de
 * Postgres.
 */

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

import { portfolioPath } from '@mesh/domain'

import { serviceClient, signedInAnon } from './client.ts'

const SLUG = 'test-claim-artist'

let artista: Awaited<ReturnType<typeof signedInAnon>>
let intrusa: Awaited<ReturnType<typeof signedInAnon>>
let professionalId: string
let code: string

before(async () => {
  artista = await signedInAnon()
  intrusa = await signedInAnon()

  const service = serviceClient()
  const { data: category } = await service
    .from('categories')
    .select('id')
    .eq('slug', 'tattoo')
    .single()

  const { data: professional, error } = await service
    .from('professionals')
    .insert({
      category_id: category?.id as string,
      slug: SLUG,
      display_name: 'Artista de prueba',
      instagram_handle: 'testclaim',
      is_published: true,
      is_fixture: true,
    })
    .select('id')
    .single()
  if (error != null) throw error
  professionalId = professional.id

  code = 'TESTCODE'
  const { error: claimError } = await service
    .from('professional_claims')
    .insert({ professional_id: professionalId, code })
  if (claimError != null) throw claimError
})

after(async () => {
  const service = serviceClient()
  await service.storage.from('portfolio').remove([`${SLUG}/`])
  await service.from('professionals').delete().eq('id', professionalId)
})

describe('modo artista', () => {
  test('la tabla de códigos no existe para el cliente', async () => {
    const { data, error } = await artista.client
      .from('professional_claims')
      .select('code')

    // PostgREST devuelve error o vacío según cómo esté el grant. Las dos son
    // aceptables; lo que no lo es sería devolver el código.
    assert.equal(
      (data ?? []).length,
      0,
      'el cliente no puede ver ningún código',
    )
    if (error == null) assert.deepEqual(data, [])
  })

  test('un código inválido no dice por qué', async () => {
    const { error } = await artista.client.rpc('claim_professional', {
      p_code: 'NOEXISTE',
    })
    assert.ok(error != null, 'un código inexistente falla')
    assert.ok(
      !/existe|usado|reclamado/i.test(error.message),
      `el mensaje no distingue casos: ${error.message}`,
    )
  })

  test('el código válido deja al artista como dueño', async () => {
    const { data, error } = await artista.client.rpc('claim_professional', {
      p_code: code,
    })
    assert.equal(error, null)
    assert.equal(data, SLUG)
  })

  test('el mismo código no sirve dos veces', async () => {
    const { error } = await intrusa.client.rpc('claim_professional', {
      p_code: code,
    })
    assert.ok(error != null, 'el segundo canje falla')
  })

  test('el dueño sube a la carpeta de su slug', async () => {
    const mediaId = crypto.randomUUID()
    const path = portfolioPath(SLUG, mediaId, 'lg', 'jpg')
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])

    const { error } = await artista.client.storage
      .from('portfolio')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: false })

    assert.equal(error, null, `la subida del dueño falló: ${error?.message}`)

    const { error: rowError } = await artista.client
      .from('media_assets')
      .insert({
        id: mediaId,
        bucket: 'portfolio',
        path,
        mime_type: 'image/jpeg',
        byte_size: bytes.byteLength,
        owner_user_id: artista.userId,
      })
    assert.equal(error, null)
    assert.equal(rowError, null, `la fila falló: ${rowError?.message}`)

    const { error: pieceError } = await artista.client
      .from('portfolio_items')
      .insert({ professional_id: professionalId, media_id: mediaId })
    assert.equal(pieceError, null, `la pieza falló: ${pieceError?.message}`)
  })

  test('otra persona NO puede subir a esa carpeta', async () => {
    // Este es el test que decide si esto es publicable. El resto es interfaz.
    const path = portfolioPath(SLUG, crypto.randomUUID(), 'lg', 'jpg')
    const { error } = await intrusa.client.storage
      .from('portfolio')
      .upload(path, new Uint8Array([0xff, 0xd8]), {
        contentType: 'image/jpeg',
      })

    assert.ok(error != null, 'una subida a la carpeta ajena tiene que fallar')
  })

  test('otra persona NO puede agregar piezas a ese perfil', async () => {
    const { error } = await intrusa.client.from('portfolio_items').insert({
      professional_id: professionalId,
      media_id: crypto.randomUUID(),
    })
    assert.ok(error != null, 'el insert ajeno tiene que fallar')
  })
})
