/**
 * La otra dirección de MESH, con la anon key y de punta a punta.
 *
 * Lo que esto cubre y 46_open_searches.sql no: que los dos RPC estén expuestos
 * por PostgREST con el grant correcto, y —lo que decide si esto es publicable—
 * que la **política de storage** deje bajar la foto de una búsqueda abierta y
 * no la de una cerrada. Un grant correcto y una política de storage mal escrita
 * se ven igual desde adentro de Postgres, y acá lo que se filtra es una foto
 * que alguien subió para sí misma.
 *
 * Ver ADR-014.
 */

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

import { referencePath } from '@mesh/domain'

import { serviceClient, signedInAnon } from './client.ts'

const SLUG = 'demand-artista'

let persona: Awaited<ReturnType<typeof signedInAnon>>
let artista: Awaited<ReturnType<typeof signedInAnon>>
let professionalId: string
let abierta: string
let cerrada: string
let rutaAbierta: string
let rutaCerrada: string

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])

/** Crea un proyecto con una foto de referencia. Devuelve el id y la ruta. */
async function crearBusqueda(
  categoryId: string,
  styleId: string,
  title: string,
  isOpen: boolean,
): Promise<{ projectId: string; path: string }> {
  const { data: project, error } = await persona.client
    .from('projects')
    .insert({
      user_id: persona.userId,
      category_id: categoryId,
      title,
      status: 'active',
      is_open_to_professionals: isOpen,
    })
    .select('id')
    .single()
  if (error != null) throw error

  await persona.client
    .from('project_styles')
    .insert({ project_id: project.id, style_id: styleId, weight: 1 })

  const mediaId = crypto.randomUUID()
  const path = referencePath(persona.userId, mediaId, 'image/jpeg')

  const { error: uploadError } = await persona.client.storage
    .from('references')
    .upload(path, JPEG, { contentType: 'image/jpeg' })
  if (uploadError != null) throw uploadError

  await persona.client.from('media_assets').insert({
    id: mediaId,
    bucket: 'references',
    path,
    mime_type: 'image/jpeg',
    byte_size: JPEG.byteLength,
    owner_user_id: persona.userId,
  })

  const { error: refError } = await persona.client
    .from('project_references')
    .insert({ project_id: project.id, media_id: mediaId, sort_order: 0 })
  if (refError != null) throw refError

  return { projectId: project.id, path }
}

before(async () => {
  persona = await signedInAnon()
  artista = await signedInAnon()

  const service = serviceClient()
  const { data: category } = await service
    .from('categories')
    .select('id')
    .eq('slug', 'tattoo')
    .single()
  const categoryId = category?.id as string

  const { data: style } = await service
    .from('styles')
    .select('id')
    .eq('slug', 'fine-line')
    .single()
  const styleId = style?.id as string

  // El artista se da de alta solo, por el mismo camino que la app. Ver ADR-013.
  const { error: altaError } = await artista.client.rpc(
    'create_own_professional',
    { p_display_name: 'Demand Artista', p_instagram: 'demandartista' },
  )
  if (altaError != null) throw altaError

  await artista.client.rpc('set_own_styles', { p_style_slugs: ['fine-line'] })

  // Por `owner_user_id` y no por "el único que tiene dueño": esa suposición se
  // rompe apenas otro test —o la app— da de alta a un segundo artista, y el
  // síntoma aparece lejos de acá, en dos tests del mazo que dejan de cerrar.
  const { data: pro } = await artista.client
    .from('professionals')
    .select('id')
    .eq('owner_user_id', artista.userId)
    .single()
  professionalId = pro?.id as string

  // El slug se deriva del nombre; se guarda para limpiar después.
  const abiertaResult = await crearBusqueda(
    categoryId,
    styleId,
    'Abierta a tatuadores',
    true,
  )
  abierta = abiertaResult.projectId
  rutaAbierta = abiertaResult.path

  const cerradaResult = await crearBusqueda(
    categoryId,
    styleId,
    'Privada',
    false,
  )
  cerrada = cerradaResult.projectId
  rutaCerrada = cerradaResult.path
})

after(async () => {
  const service = serviceClient()
  await service.storage.from('references').remove([rutaAbierta, rutaCerrada])
  await service.from('projects').delete().eq('id', abierta)
  await service.from('projects').delete().eq('id', cerrada)
  await service.from('professionals').delete().eq('id', professionalId)
  await service.from('professionals').delete().eq('slug', SLUG)
})

describe('búsquedas abiertas', () => {
  test('el artista ve la abierta y solo la abierta', async () => {
    const { data, error } = await artista.client.rpc('get_open_search_feed', {
      p_category_slug: 'tattoo',
    })

    assert.equal(error, null, `el feed falló: ${error?.message}`)
    const titulos = (data ?? []).map((row) => row.title)
    assert.ok(titulos.includes('Abierta a tatuadores'))
    assert.ok(
      !titulos.includes('Privada'),
      'una búsqueda cerrada no puede aparecer',
    )
  })

  test('el feed no devuelve quién hizo la búsqueda', async () => {
    const { data } = await artista.client.rpc('get_open_search_feed', {
      p_category_slug: 'tattoo',
    })
    const fila = (data ?? [])[0] as Record<string, unknown> | undefined
    assert.ok(fila != null)
    assert.ok(!('user_id' in fila), 'la identidad no viaja en el feed')
  })

  test('la tabla de proyectos sigue siendo invisible para el artista', async () => {
    // El feed es una proyección elegida a mano; la tabla no se abrió.
    const { data } = await artista.client.from('projects').select('id, title')
    assert.equal(
      (data ?? []).length,
      0,
      'un artista no lee `projects`, ni las abiertas',
    )
  })

  test('el artista puede bajar la foto de una búsqueda abierta', async () => {
    // Este es el test que decide si esto es publicable del lado de storage: sin
    // esta política el mazo queda sin imágenes, y con una política de más se
    // filtra una foto privada.
    const { data, error } = await artista.client.storage
      .from('references')
      .createSignedUrl(rutaAbierta, 60)

    assert.equal(error, null, `firmar falló: ${error?.message}`)
    assert.ok(data?.signedUrl != null)

    const respuesta = await fetch(data.signedUrl)
    assert.equal(respuesta.status, 200, 'la foto tiene que bajarse de verdad')
  })

  test('NO puede bajar la de una búsqueda cerrada', async () => {
    const { data, error } = await artista.client.storage
      .from('references')
      .createSignedUrl(rutaCerrada, 60)

    // Según la versión, storage rechaza al firmar o al bajar. Las dos son
    // aceptables; lo que no lo es sería devolver los bytes.
    if (error == null && data?.signedUrl != null) {
      const respuesta = await fetch(data.signedUrl)
      assert.notEqual(
        respuesta.status,
        200,
        'una foto de una búsqueda cerrada no puede bajarse',
      )
    }
  })

  test('el interés llega a la persona, y el paso no', async () => {
    const { error } = await artista.client
      .from('project_interests')
      .insert({
        project_id: abierta,
        professional_id: professionalId,
        verdict: 'interest',
      })
    assert.equal(error, null, `el interés falló: ${error?.message}`)

    // Se busca AL artista, no se cuenta el total: `get_search_interests()` sin
    // argumento devuelve los interesados en todas las búsquedas propias, y
    // afirmar sobre ese total es afirmar sobre estado que este test no
    // controla del todo. Antes decía `length === 1` y falló una vez sin que
    // pudiera reproducirlo; esto no puede fallar por esa clase de razón.
    const { data } = await persona.client.rpc('get_search_interests', {})
    const mio = (data ?? []).filter(
      (row) => row.professional_id === professionalId,
    )
    assert.equal(mio.length, 1, 'el interés llegó, una sola vez')
    assert.equal(mio[0]?.professional_display_name, 'Demand Artista')
  })

  test('levantar la mano NO abre un chat', async () => {
    const { data } = await persona.client.from('conversations').select('id')
    assert.equal(
      (data ?? []).length,
      0,
      'el chat lo abre la persona, nunca el artista',
    )
  })

  test('lo ya decidido no vuelve al mazo', async () => {
    const { data } = await artista.client.rpc('get_open_search_feed', {
      p_category_slug: 'tattoo',
    })
    const titulos = (data ?? []).map((row) => row.title)
    assert.ok(!titulos.includes('Abierta a tatuadores'))
  })

  test('cerrar la búsqueda la saca del mazo de todos', async () => {
    await artista.client
      .from('project_interests')
      .delete()
      .eq('project_id', abierta)

    await persona.client
      .from('projects')
      .update({ is_open_to_professionals: false })
      .eq('id', abierta)

    const { data } = await artista.client.rpc('get_open_search_feed', {
      p_category_slug: 'tattoo',
    })
    const titulos = (data ?? []).map((row) => row.title)
    assert.ok(
      !titulos.includes('Abierta a tatuadores'),
      'apagar el interruptor alcanza, sin migrar nada',
    )
  })
})
