/**
 * Round trips por pantalla.
 *
 * El presupuesto de `docs/testing/test-strategy.md` §7 dice: el feed, el perfil
 * y la lista de matches, **un round trip cada uno**. Es el único de los cinco
 * presupuestos de performance que se puede medir sin un dispositivo, así que se
 * mide acá y no se deja para "cuando haya un teléfono".
 *
 * Se cuenta interceptando `fetch`, que es lo que supabase-js usa por debajo. Un
 * conteo de llamadas a la librería mentiría: un `select` con `in(...)` de 200
 * ids puede ser una llamada y varias peticiones.
 */

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@mesh/domain/db'

import { SUPABASE_URL, serviceClient, signedInAnon } from './client.ts'

let counting: { client: SupabaseClient<Database>; userId: string; requests: string[] }

before(async () => {
  const { userId } = await signedInAnon()
  const requests: string[] = []

  const anonKey = process.env['SUPABASE_ANON_KEY'] as string
  const client = createClient<Database>(SUPABASE_URL, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const url = typeof input === 'string' ? input : String(input)
        // Las peticiones de auth no cuentan: no son parte de pintar la
        // pantalla, y el token ya está en memoria cuando la persona navega.
        if (!url.includes('/auth/v1/')) requests.push(url)
        return fetch(input as Parameters<typeof fetch>[0], init)
      },
    },
  })

  // La sesión se inyecta a mano para no contar el ingreso.
  const session = await signedInAnon()
  await client.auth.setSession({
    access_token: (await session.client.auth.getSession()).data.session
      ?.access_token as string,
    refresh_token: (await session.client.auth.getSession()).data.session
      ?.refresh_token as string,
  })

  counting = { client, userId: session.userId, requests }
  // La llamada de `setSession` puede haber agregado algo.
  requests.length = 0
  void userId
})

after(async () => {
  const service = serviceClient()
  await service.from('interactions').delete().eq('user_id', counting.userId)
  await service.from('matches').delete().eq('user_id', counting.userId)
})

function measure(): () => number {
  const start = counting.requests.length
  return () => counting.requests.length - start
}

describe('presupuesto de round trips', () => {
  test('el feed de descubrimiento es UN round trip', async () => {
    // Es la razón por la que existe el RPC. Del lado del cliente serían tres:
    // piezas, media y estilos.
    const count = measure()
    const { error } = await counting.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 12,
    })
    assert.equal(error, null)
    assert.equal(count(), 1)
  })

  test('el catálogo para matching es UN round trip además del de la categoría', async () => {
    // Dos, y el de la categoría se podría cachear. Se deja registrado como
    // está en vez de afirmar que es uno.
    const count = measure()
    const { data: category } = await counting.client
      .from('categories')
      .select('id')
      .eq('slug', 'tattoo')
      .maybeSingle()

    await counting.client
      .from('professionals')
      .select(
        'id, slug, display_name, professional_styles ( proficiency, is_primary, styles ( slug ) )',
      )
      .eq('category_id', category?.id ?? '')

    assert.equal(count(), 2)
  })

  test('el perfil son DOS round trips: el artista y su obra', async () => {
    // Anidar el portfolio dentro del profesional repetiría los datos del
    // artista en cada pieza. Dos peticiones chicas le ganan a una grande.
    const count = measure()
    const { data: professional } = await counting.client
      .from('professionals')
      .select('id, slug, display_name, professional_styles ( proficiency, styles ( slug ) )')
      .limit(1)
      .maybeSingle()

    await counting.client
      .from('portfolio_items')
      .select('id, media_assets ( path, blurhash ), portfolio_item_styles ( weight, styles ( slug ) )')
      .eq('professional_id', professional?.id ?? '')

    assert.equal(count(), 2)
  })

  test('registrar una interacción es UN round trip', async () => {
    const feed = await counting.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 1,
    })
    const item = (feed.data ?? [])[0]
    assert.ok(item != null)

    const count = measure()
    await counting.client.from('interactions').upsert(
      {
        user_id: counting.userId,
        portfolio_item_id: item.portfolio_item_id,
        verdict: 'like',
        is_saved: false,
        source: 'discover',
      },
      { onConflict: 'user_id,portfolio_item_id' },
    )
    assert.equal(count(), 1)
  })

  test('veinte interacciones encoladas se mandan en UN round trip', async () => {
    // Es lo que hace que salir del subte no sea veinte peticiones.
    const feed = await counting.client.rpc('get_discovery_feed', {
      p_category_slug: 'tattoo',
      p_limit: 20,
    })
    const items = feed.data ?? []
    assert.ok(items.length > 1)

    const count = measure()
    await counting.client.from('interactions').upsert(
      items.map((item) => ({
        user_id: counting.userId,
        portfolio_item_id: item.portfolio_item_id,
        verdict: 'like' as const,
        is_saved: false,
        source: 'discover' as const,
      })),
      { onConflict: 'user_id,portfolio_item_id' },
    )
    assert.equal(count(), 1)
  })
})
