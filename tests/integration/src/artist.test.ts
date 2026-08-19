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
let nueva: Awaited<ReturnType<typeof signedInAnon>>
let professionalId: string
let code: string

/** El nombre del que se deriva el slug del alta propia. Ver ADR-013. */
const NOMBRE_PROPIO = 'Alta Propia Integración'
const SLUG_PROPIO = 'alta-propia-integracion'

before(async () => {
  artista = await signedInAnon()
  intrusa = await signedInAnon()
  nueva = await signedInAnon()

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
  await service.from('professionals').delete().eq('slug', SLUG_PROPIO)
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

/**
 * Alta propia. Ver ADR-013 y supabase/tests/26_artist_self_signup.sql.
 *
 * Lo que esto cubre y el pgTAP no: que las tres funciones estén expuestas por
 * PostgREST con el grant correcto, y que un perfil creado desde la app llegue
 * hasta el final del recorrido — subir una foto a su propia carpeta de storage.
 * Ese último paso es el que prueba que el alta sirve para algo: sin él hay una
 * fila en una tabla y nada más.
 */
describe('alta propia de artista', () => {
  test('crear el perfil devuelve el slug derivado del nombre', async () => {
    const { data, error } = await nueva.client.rpc('create_own_professional', {
      p_display_name: NOMBRE_PROPIO,
      p_instagram: 'alta.propia',
    })
    assert.equal(error, null, `el alta falló: ${error?.message}`)
    assert.equal(data, SLUG_PROPIO)
  })

  test('el perfil nace publicado y NO como registro de prueba', async () => {
    // `is_fixture` corta el contacto y muestra una insignia. Un perfil que hizo
    // una persona no es un registro de prueba, aunque el producto lo esté.
    const { data, error } = await nueva.client
      .from('professionals')
      .select('is_published, is_fixture')
      .eq('slug', SLUG_PROPIO)
      .single()

    assert.equal(error, null)
    assert.equal(data?.is_published, true)
    assert.equal(data?.is_fixture, false)
  })

  test('una persona no puede tener dos perfiles', async () => {
    const { error } = await nueva.client.rpc('create_own_professional', {
      p_display_name: 'Otro Intento',
      p_instagram: 'otro.intento',
    })
    assert.ok(error != null, 'el segundo alta tiene que fallar')
  })

  test('un perfil sin canal de contacto no se crea', async () => {
    const { error } = await intrusa.client.rpc('create_own_professional', {
      p_display_name: 'Sin Contacto',
    })
    // La base ya lo exige con `professionals_published_is_contactable`; la
    // función lo verifica antes para poder dar un mensaje que se entienda.
    assert.ok(error != null, 'un perfil sin contacto es un callejón sin salida')
  })

  test('los estilos declarados quedan guardados y los primeros son primarios', async () => {
    const { error } = await nueva.client.rpc('set_own_styles', {
      p_style_slugs: ['fine-line', 'blackwork'],
    })
    assert.equal(error, null, `declarar estilos falló: ${error?.message}`)

    const { data } = await nueva.client
      .from('professionals')
      .select('professional_styles ( is_primary, styles ( slug ) )')
      .eq('slug', SLUG_PROPIO)
      .single()

    const estilos = (data?.professional_styles ?? []) as Array<{
      is_primary: boolean
      styles: { slug: string } | null
    }>
    assert.deepEqual(
      estilos.map((entry) => entry.styles?.slug).sort(),
      ['blackwork', 'fine-line'],
    )
    assert.ok(estilos.every((entry) => entry.is_primary))
  })

  test('un estilo inexistente falla en vez de saltearse', async () => {
    // Guardar en silencio menos estilos de los que la persona eligió es peor
    // que fallar: creería que se recomienda por algo que no quedó guardado.
    const { error } = await nueva.client.rpc('set_own_styles', {
      p_style_slugs: ['fine-line', 'no-existe'],
    })
    assert.ok(error != null, 'un slug inventado tiene que fallar')
  })

  test('la ubicación guarda coordenadas y barrio', async () => {
    const { error } = await nueva.client.rpc('set_studio_location', {
      p_lat: -34.5875,
      p_lng: -58.4371,
      p_neighborhood_slug: 'palermo',
    })
    assert.equal(error, null, `la ubicación falló: ${error?.message}`)

    const { data } = await nueva.client
      .from('professionals')
      .select('studio_lat, locations ( slug )')
      .eq('slug', SLUG_PROPIO)
      .single()

    assert.equal(data?.studio_lat, -34.5875)
    assert.equal(
      (data?.locations as { slug: string } | null)?.slug,
      'palermo',
      'el barrio es lo que puntúa el componente de Ubicación del matching',
    )
  })

  test('nadie más puede declarar estilos en ese perfil', async () => {
    const { error } = await intrusa.client.rpc('set_own_styles', {
      p_style_slugs: ['blackwork'],
    })
    assert.ok(error != null, 'sin perfil propio no se declaran estilos')

    const { data } = await nueva.client
      .from('professionals')
      .select('professional_styles ( styles ( slug ) )')
      .eq('slug', SLUG_PROPIO)
      .single()
    assert.equal((data?.professional_styles ?? []).length, 2)
  })

  test('el perfil recién creado puede subir a su propia carpeta', async () => {
    const mediaId = crypto.randomUUID()
    const path = portfolioPath(SLUG_PROPIO, mediaId, 'lg', 'jpg')
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])

    const { error } = await nueva.client.storage
      .from('portfolio')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: false })
    assert.equal(error, null, `la subida falló: ${error?.message}`)

    const { error: rowError } = await nueva.client
      .from('media_assets')
      .insert({
        id: mediaId,
        bucket: 'portfolio',
        path,
        mime_type: 'image/jpeg',
        byte_size: bytes.byteLength,
        owner_user_id: nueva.userId,
      })
    assert.equal(rowError, null, `la fila falló: ${rowError?.message}`)

    const { data: propio } = await nueva.client
      .from('professionals')
      .select('id')
      .eq('slug', SLUG_PROPIO)
      .single()

    const { error: pieceError } = await nueva.client
      .from('portfolio_items')
      .insert({ professional_id: propio?.id as string, media_id: mediaId })
    assert.equal(pieceError, null, `la pieza falló: ${pieceError?.message}`)
  })
})
