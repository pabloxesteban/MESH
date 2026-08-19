/**
 * Recorridos completos contra la base local, con la anon key.
 *
 * Lo que estos tests cubren y los de pgTAP no: que la app, usando exactamente
 * las credenciales que lleva en el bundle, pueda hacer lo que tiene que hacer y
 * no pueda hacer lo que no. Un `grant` correcto y un PostgREST mal configurado
 * se ven igual desde adentro de Postgres.
 */

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

import { computeTaste, matchProfessionals } from '@mesh/domain'

import { anonClient, serviceClient, signedInAnon } from './client.ts'

const HOY = '2026-08-18'

let alice: Awaited<ReturnType<typeof signedInAnon>>
let bob: Awaited<ReturnType<typeof signedInAnon>>

before(async () => {
  alice = await signedInAnon()
  bob = await signedInAnon()
})

after(async () => {
  // Se limpia lo escrito por los tests. El catálogo lo dejó el seeder y no se
  // toca: borrar contenido cargado haría que la próxima corrida falle sin
  // relación con lo que se cambió.
  const service = serviceClient()
  for (const userId of [alice?.userId, bob?.userId].filter(Boolean)) {
    await service
      .from('interactions')
      .delete()
      .eq('user_id', userId as string)
    await service
      .from('taste_profiles')
      .delete()
      .eq('user_id', userId as string)
    await service
      .from('matches')
      .delete()
      .eq('user_id', userId as string)
    await service
      .from('projects')
      .delete()
      .eq('user_id', userId as string)
  }
})

describe('sesión', () => {
  test('el ingreso anónimo produce un usuario real con perfil', async () => {
    const { data } = await alice.client
      .from('profiles')
      .select('id, locale, analytics_opt_in')
      .eq('id', alice.userId)
      .single()

    assert.equal(data?.id, alice.userId)
    // El perfil lo crea un trigger, no el cliente.
    assert.equal(data?.locale, 'es-AR')
  })

  test('sin sesión no se lee nada', async () => {
    // No existe camino de lectura sin autenticar. Ver ADR-002.
    const sinSesion = anonClient()
    const { data, error } = await sinSesion.from('professionals').select('id')
    assert.ok(
      error != null || (data ?? []).length === 0,
      'anon no debería leer nada',
    )
  })
})

describe('feed de descubrimiento', () => {
  test('devuelve obra publicada con su media y sus estilos', async () => {
    const { data, error } = await alice.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 12,
    })

    assert.equal(error, null)
    assert.ok(
      (data ?? []).length > 0,
      'el seed tiene que haber dejado obra publicada',
    )

    const first = (data ?? [])[0]
    assert.ok(first?.media_path.endsWith('.webp'))
    assert.ok(first?.media_blurhash != null, 'falta el blurhash')
    assert.ok(Array.isArray(first?.styles) && first.styles.length > 0)
  })

  test('nunca dos piezas seguidas del mismo profesional', async () => {
    const { data } = await alice.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 50,
    })

    const ids = (data ?? []).map((row) => row.professional_id)
    for (let index = 1; index < ids.length; index += 1) {
      assert.notEqual(ids[index], ids[index - 1], `posición ${index}`)
    }
  })

  test('dos personas ven órdenes distintos', async () => {
    // La mezcla es determinística por usuario. Si los dos vieran lo mismo, la
    // semilla no estaría entrando.
    const [uno, dos] = await Promise.all([
      alice.client.rpc('get_discovery_feed', {
        p_category_slug: 'tattoo',
        p_limit: 50,
      }),
      bob.client.rpc('get_discovery_feed', {
        p_category_slug: 'tattoo',
        p_limit: 50,
      }),
    ])

    const a = (uno.data ?? []).map((row) => row.portfolio_item_id).join(',')
    const b = (dos.data ?? []).map((row) => row.portfolio_item_id).join(',')
    assert.notEqual(a, b)
  })

  test('paginar no repite ni saltea', async () => {
    const primera = await alice.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 5,
    })
    const cursor = (primera.data ?? []).at(-1)?.feed_cursor
    assert.ok(cursor != null)

    const segunda = await alice.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 5,
      p_cursor: cursor,
    })

    const todos = await alice.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 10,
    })

    const paginado = [...(primera.data ?? []), ...(segunda.data ?? [])].map(
      (row) => row.portfolio_item_id,
    )
    assert.deepEqual(
      paginado,
      (todos.data ?? []).map((row) => row.portfolio_item_id),
    )
  })
})

describe('interacciones y gusto', () => {
  test('lo que se marca desaparece del mazo', async () => {
    const antes = await alice.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 50,
    })
    const objetivo = (antes.data ?? [])[0]
    assert.ok(objetivo != null)

    const { error } = await alice.client.from('interactions').upsert(
      {
        user_id: alice.userId,
        portfolio_item_id: objetivo.portfolio_item_id,
        verdict: 'like',
        is_saved: false,
        source: 'discover',
      },
      { onConflict: 'user_id,portfolio_item_id' },
    )
    assert.equal(error, null)

    const despues = await alice.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 50,
    })
    const ids = (despues.data ?? []).map((row) => row.portfolio_item_id)
    assert.ok(!ids.includes(objetivo.portfolio_item_id))
  })

  test('reintentar el mismo upsert es seguro', async () => {
    // Es la propiedad de la que depende la cola offline.
    const feed = await alice.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 1,
    })
    const item = (feed.data ?? [])[0]
    assert.ok(item != null)

    const row = {
      user_id: alice.userId,
      portfolio_item_id: item.portfolio_item_id,
      verdict: 'like' as const,
      is_saved: false,
      source: 'discover' as const,
    }
    for (let intento = 0; intento < 3; intento += 1) {
      const { error } = await alice.client
        .from('interactions')
        .upsert(row, { onConflict: 'user_id,portfolio_item_id' })
      assert.equal(error, null)
    }

    const { count } = await alice.client
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('portfolio_item_id', item.portfolio_item_id)
    assert.equal(count, 1)
  })

  test('el gusto se computa desde las filas propias', async () => {
    const { data: interactions } = await alice.client
      .from('interactions')
      .select('portfolio_item_id, verdict, is_saved, source')

    const ids = (interactions ?? []).map((row) => row.portfolio_item_id)
    const { data: styleRows } = await alice.client
      .from('portfolio_item_styles')
      .select('portfolio_item_id, weight, styles(slug)')
      .in('portfolio_item_id', ids)

    const pieces = new Map<
      string,
      {
        portfolioItemId: string
        styles: Array<{ styleSlug: string; weight: number }>
      }
    >()
    for (const row of styleRows ?? []) {
      const slug = (row as { styles?: { slug?: string } }).styles?.slug
      if (slug == null) continue
      const entry = pieces.get(row.portfolio_item_id) ?? {
        portfolioItemId: row.portfolio_item_id,
        styles: [],
      }
      entry.styles.push({ styleSlug: slug, weight: Number(row.weight) })
      pieces.set(row.portfolio_item_id, entry)
    }

    const taste = computeTaste({
      categorySlug: 'tattoo',
      interactions: (interactions ?? []).map((row) => ({
        portfolioItemId: row.portfolio_item_id,
        verdict: row.verdict,
        isSaved: row.is_saved,
        source: row.source,
      })),
      pieces,
    })

    assert.ok(taste.decisiveCount > 0)
    assert.equal(taste.algoVersion, 'taste/1')
  })
})

describe('aislamiento', () => {
  test('Bob no ve las interacciones de Alice', async () => {
    const { data } = await bob.client
      .from('interactions')
      .select('portfolio_item_id')
    const { data: deAlice } = await alice.client
      .from('interactions')
      .select('portfolio_item_id')

    assert.ok((deAlice ?? []).length > 0, 'Alice tiene que tener interacciones')
    assert.equal((data ?? []).length, 0)
  })

  test('Bob no puede escribir a nombre de Alice', async () => {
    const feed = await bob.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 1,
    })
    const item = (feed.data ?? [])[0]
    assert.ok(item != null)

    const { error } = await bob.client.from('interactions').insert({
      user_id: alice.userId,
      portfolio_item_id: item.portfolio_item_id,
      verdict: 'like',
      is_saved: false,
      source: 'discover',
    })
    assert.notEqual(error, null, 'RLS tiene que rechazar el insert cruzado')
  })

  test('nadie puede leer analytics_events', async () => {
    const { error } = await alice.client.from('analytics_events').select('id')
    assert.notEqual(error, null)
  })

  test('nadie puede tocar audit_events', async () => {
    const { error } = await alice.client.from('audit_events').select('id')
    assert.notEqual(error, null)
  })
})

describe('matching de punta a punta', () => {
  test('el catálogo se puede puntuar con el motor puro', async () => {
    const { data: category } = await alice.client
      .from('categories')
      .select('id')
      .eq('slug', 'tattoo')
      .single()

    const { data: professionals } = await alice.client
      .from('professionals')
      .select(
        'id, slug, display_name, bio, travels, price_min_cents, price_max_cents, price_currency, priced_at, availability_status, availability_updated_at, instagram_handle, whatsapp_e164, is_fixture, professional_styles ( proficiency, is_primary, styles ( slug ) )',
      )
      .eq('category_id', category?.id ?? '')

    assert.ok((professionals ?? []).length > 0)

    const catalog = (professionals ?? []).map((row) => ({
      id: row.id,
      slug: String(row.slug),
      categorySlug: 'tattoo' as const,
      displayName: row.display_name,
      bio: row.bio,
      location: null,
      travels: row.travels,
      styles: (row.professional_styles ?? [])
        .filter((style) => style.styles != null)
        .map((style) => ({
          styleSlug: String((style.styles as { slug: string }).slug),
          proficiency: Number(style.proficiency),
          isPrimary: style.is_primary,
        })),
      price: null,
      availability: null,
      instagramHandle: row.instagram_handle,
      whatsappE164: row.whatsapp_e164,
      studioCoordinates: null,
      isFixture: row.is_fixture,
    }))

    const matches = matchProfessionals(
      {
        taste: { scores: { 'fine-line': 0.8, minimalist: 0.6 }, aversion: {} },
        today: HOY,
        locationDiscriminates: false,
      },
      catalog,
    )

    // Con el catálogo fixture cargado tiene que salir al menos un match, y
    // todos con al menos una razón fundada.
    assert.ok(matches.length > 0, 'debería haber al menos un match')
    for (const match of matches) {
      assert.ok(match.reasons.length > 0)
      for (const reason of match.reasons) {
        const components: Record<string, number | undefined> = {
          ...match.components,
        }
        assert.ok((components[reason.component] ?? 0) > 0)
      }
    }
  })

  test('un match se puede guardar y la base valida sus razones', async () => {
    const { data: professional } = await alice.client
      .from('professionals')
      .select('id')
      .limit(1)
      .single()

    const { error } = await alice.client.from('matches').upsert(
      {
        user_id: alice.userId,
        professional_id: professional?.id ?? '',
        score: 0.9,
        band: 'strong',
        components: { style: 0.9 },
        reasons: [
          { component: 'style', template_key: 'match.reason.markedStyle' },
        ],
        matching_version: 'match/1',
        taste_version: 'taste/1',
      },
      { onConflict: 'user_id,professional_id,project_key' },
    )
    assert.equal(error, null)
  })

  test('la base rechaza una razón sin fundamento', async () => {
    // El innegociable #2, verificado desde el cliente y no solo en SQL.
    const { data: professional } = await alice.client
      .from('professionals')
      .select('id')
      .limit(1)
      .single()

    const { error } = await alice.client.from('matches').insert({
      user_id: alice.userId,
      professional_id: professional?.id ?? '',
      project_id: null,
      score: 0.9,
      band: 'strong',
      components: { style: 0.9 },
      reasons: [{ component: 'price', template_key: 'match.reason.price' }],
      matching_version: 'match/1',
      taste_version: 'taste/1',
    })
    assert.notEqual(
      error,
      null,
      'la razón sobre un componente ausente tiene que fallar',
    )
  })
})

describe('cuotas', () => {
  test('el proyecto 21 se rechaza desde el cliente', async () => {
    const { data: category } = await alice.client
      .from('categories')
      .select('id')
      .eq('slug', 'tattoo')
      .single()

    for (let index = 0; index < 20; index += 1) {
      const { error } = await alice.client.from('projects').insert({
        user_id: alice.userId,
        category_id: category?.id ?? '',
        title: `Proyecto ${index}`,
      })
      assert.equal(error, null, `el proyecto ${index} debería entrar`)
    }

    const { error } = await alice.client.from('projects').insert({
      user_id: alice.userId,
      category_id: category?.id ?? '',
      title: 'El 21',
    })
    assert.notEqual(error, null)
  })
})
