/**
 * Búsqueda por fotos, de punta a punta contra Postgres real.
 *
 * El test de Jest (`matches.test.tsx`) prueba que la app arma bien el
 * `MatchContext` con datos simulados. Esto prueba la otra mitad: que el
 * esquema real (locations con barrio y comuna), RLS, y el motor puro de
 * `packages/domain` combinados dan el resultado que se espera — con la anon
 * key, como la app.
 */

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

import { blendProjectStyles, matchProfessionals } from '@mesh/domain'

import { serviceClient, signedInAnon } from './client.ts'

const SLUG_CERCA = 'test-qs-palermo'
const HANDLE_CERCA = 'test_qs_palermo'
const SLUG_LEJOS = 'test-qs-lugano'
const HANDLE_LEJOS = 'test_qs_lugano'

let persona: Awaited<ReturnType<typeof signedInAnon>>
let projectId: string
let idCerca: string
let idLejos: string

before(async () => {
  persona = await signedInAnon()
  const service = serviceClient()

  const { data: category } = await service
    .from('categories')
    .select('id')
    .eq('slug', 'tattoo')
    .single()

  const { data: palermo } = await service
    .from('locations')
    .select('id')
    .eq('slug', 'palermo')
    .single()

  const { data: lugano } = await service
    .from('locations')
    .select('id')
    .eq('slug', 'villa-lugano')
    .single()

  const { data: style } = await service
    .from('styles')
    .select('id')
    .eq('slug', 'fine-line')
    .single()

  const { data: cerca } = await service
    .from('professionals')
    .insert({
      category_id: category?.id as string,
      slug: SLUG_CERCA,
      display_name: 'Cerca',
      instagram_handle: HANDLE_CERCA,
      location_id: palermo?.id as string,
      is_published: true,
      is_fixture: true,
    })
    .select('id')
    .single()
  idCerca = cerca?.id as string

  const { data: lejos } = await service
    .from('professionals')
    .insert({
      category_id: category?.id as string,
      slug: SLUG_LEJOS,
      display_name: 'Lejos',
      instagram_handle: HANDLE_LEJOS,
      location_id: lugano?.id as string,
      is_published: true,
      is_fixture: true,
    })
    .select('id')
    .single()
  idLejos = lejos?.id as string

  await service.from('professional_styles').insert([
    {
      professional_id: idCerca,
      style_id: style?.id as string,
      proficiency: 1,
      is_primary: true,
    },
    {
      professional_id: idLejos,
      style_id: style?.id as string,
      proficiency: 1,
      is_primary: true,
    },
  ])

  // El proyecto se crea con la anon key, como lo haría la pantalla real.
  const { data: project, error } = await persona.client
    .from('projects')
    .insert({
      user_id: persona.userId,
      category_id: category?.id as string,
      title: 'Línea fina',
      location_id: palermo?.id as string,
      status: 'active',
    })
    .select('id')
    .single()
  if (error != null) throw error
  projectId = project.id

  await persona.client
    .from('project_styles')
    .insert({ project_id: projectId, style_id: style?.id as string, weight: 1 })
})

after(async () => {
  const service = serviceClient()
  await service.from('projects').delete().eq('id', projectId)
  await service.from('professionals').delete().in('id', [idCerca, idLejos])
})

describe('búsqueda por fotos: barrio real de punta a punta', () => {
  test('el proyecto se lee con su barrio y su estilo, con la anon key', async () => {
    // `persona.client`, no `anonClient()`: un proyecto es privado de su dueño.
    // Un cliente sin sesión (anon puro) tiene que ser rechazado — eso ya lo
    // prueba 00_rls_guarantee.sql. Este test verifica la otra mitad: que la
    // propia dueña SÍ puede leer lo que creó.
    const { data, error } = await persona.client
      .from('projects')
      .select(
        'id, title, locations ( slug ), project_styles ( weight, styles ( slug ) )',
      )
      .eq('id', projectId)
      .single()

    assert.equal(error, null)
    assert.equal(data?.locations?.slug, 'palermo')
    assert.equal(data?.project_styles[0]?.styles?.slug, 'fine-line')
  })

  test('el profesional de Palermo puntúa más alto que el de Villa Lugano', async () => {
    // Un profesional publicado es de lectura pública para cualquier SESIÓN
    // (`grant select ... to authenticated`), pero sigue sin ser anon puro —
    // usamos la sesión de la persona, como usaría la app real.
    const { data: rows } = await persona.client
      .from('professionals')
      .select(
        'id, slug, category_id, is_fixture, locations ( id, slug, city, admin_area, country_code, metro_key ), professional_styles ( proficiency, is_primary, styles ( slug ) )',
      )
      .in('id', [idCerca, idLejos])

    assert.ok(rows != null && rows.length === 2)

    const toProfessional = (row: NonNullable<typeof rows>[number]) => ({
      id: row.id,
      slug: row.slug,
      categorySlug: 'tattoo' as const,
      displayName: row.slug,
      bio: null,
      location:
        row.locations == null
          ? null
          : {
              id: row.locations.id,
              slug: row.locations.slug,
              city: row.locations.city,
              adminArea: row.locations.admin_area ?? '',
              countryCode: row.locations.country_code,
              metroKey: row.locations.metro_key,
            },
      travels: false,
      styles: row.professional_styles.map((s) => ({
        styleSlug: s.styles?.slug as string,
        proficiency: Number(s.proficiency),
        isPrimary: s.is_primary,
      })),
      price: null,
      availability: null,
      instagramHandle: row.slug,
      whatsappE164: null,
      isFixture: row.is_fixture,
    })

    const professionals = (rows ?? []).map(toProfessional)

    const scores = blendProjectStyles([{ styleSlug: 'fine-line', weight: 1 }], {
      scores: {},
    })

    const scored = matchProfessionals(
      {
        taste: { scores, aversion: {} },
        today: '2026-08-18',
        locationSlug: 'palermo',
        locationDiscriminates: true,
      },
      professionals,
      { projectId },
    )

    const bySlug = new Map(scored.map((m) => [m.professionalId, m]))
    const cerca = bySlug.get(idCerca)
    const lejos = bySlug.get(idLejos)

    assert.ok(cerca != null && lejos != null)
    assert.ok(
      cerca.score > lejos.score,
      `Palermo (${cerca?.score}) tendría que puntuar más que Villa Lugano (${lejos?.score})`,
    )
  })
})
