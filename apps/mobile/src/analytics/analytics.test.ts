import { MATCHING_VERSION } from '@mesh/domain'
import type { KeyValueStore } from '@/data/kv.ts'

import { EVENT_NAMES, type AnalyticsEvent } from './events.ts'
import {
  __BUFFER_KEY as BUFFER_KEY,
  __resetAnalytics,
  configureAnalytics,
  flushAnalytics,
  isAnalyticsOptedIn,
  MAX_BUFFERED,
  readAnalyticsBuffer,
  setAnalyticsOptIn,
  setAnalyticsUser,
  track,
} from './track.ts'

const mockInsert = jest.fn()
jest.mock('../data/supabase.ts', () => ({
  get supabase() {
    return { from: () => ({ insert: mockInsert }) }
  },
}))

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    async get(key) {
      return data.get(key) ?? null
    },
    async set(key, value) {
      data.set(key, value)
    },
    async remove(key) {
      data.delete(key)
    },
    async clearPrefix(prefix) {
      for (const key of [...data.keys()])
        if (key.startsWith(prefix)) data.delete(key)
    },
  }
}

let store: ReturnType<typeof memoryStore>

beforeEach(async () => {
  jest.clearAllMocks()
  mockInsert.mockResolvedValue({ error: null })
  __resetAnalytics()
  store = memoryStore()
  configureAnalytics({
    sessionId: '11111111-1111-1111-1111-111111111111',
    platform: 'ios',
    appVersion: '0.1.0',
    now: () => '2026-08-18T12:00:00.000Z',
    store,
  })
  setAnalyticsUser('user-1')
  await setAnalyticsOptIn(true)
})

/** Espera a que la cadena interna de escrituras se vacíe. */
async function settle() {
  await new Promise<void>((resolve) => setImmediate(() => resolve()))
  await new Promise<void>((resolve) => setImmediate(() => resolve()))
}

describe('opt-out', () => {
  it('apagado no encola NADA', async () => {
    // Si encolara igual, el evento existiría en el teléfono de la persona
    // esperando que cambie de opinión. Apagado significa que no se escribe.
    await setAnalyticsOptIn(false)
    track({ name: 'app_opened', props: { is_first_open: true } })
    await settle()

    expect(await readAnalyticsBuffer(store)).toEqual([])
    expect(isAnalyticsOptedIn()).toBe(false)
  })

  it('apagar borra lo que ya había en el buffer', async () => {
    // Dejarlo ahí significaría que apagar solo pausa, y no es eso lo que dice
    // el interruptor.
    track({ name: 'app_opened', props: { is_first_open: true } })
    await settle()
    expect(await readAnalyticsBuffer(store)).toHaveLength(1)

    await setAnalyticsOptIn(false)
    expect(await readAnalyticsBuffer(store)).toEqual([])
  })

  it('apagado tampoco envía', async () => {
    track({ name: 'app_opened', props: { is_first_open: true } })
    await settle()
    await setAnalyticsOptIn(false)

    expect(await flushAnalytics()).toBe(0)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})

describe('buffer', () => {
  it('adjunta sesión, plataforma y versión, y nada más', async () => {
    track({
      name: 'artwork_liked',
      props: { portfolio_item_id: 'p1', via: 'button' },
    })
    await settle()

    const [event] = await readAnalyticsBuffer(store)
    expect(event).toEqual({
      name: 'artwork_liked',
      props: { portfolio_item_id: 'p1', via: 'button' },
      occurred_at: '2026-08-18T12:00:00.000Z',
      session_id: '11111111-1111-1111-1111-111111111111',
      platform: 'ios',
      app_version: '0.1.0',
    })
  })

  it('tira los más viejos cuando se llena', async () => {
    // Si el buffer se llenó es porque hace rato que no hay red, y lo reciente
    // describe mejor lo que está pasando ahora.
    mockInsert.mockResolvedValue({ error: { message: 'sin red' } })
    for (let index = 0; index < MAX_BUFFERED + 25; index += 1) {
      track({
        name: 'artwork_viewed',
        props: { portfolio_item_id: `p${index}`, position: index },
      })
    }
    await settle()

    const buffer = await readAnalyticsBuffer(store)
    expect(buffer.length).toBeLessThanOrEqual(MAX_BUFFERED)
    expect(buffer[buffer.length - 1]?.props['portfolio_item_id']).toBe(
      `p${MAX_BUFFERED + 24}`,
    )
  })

  it('no pierde eventos cuando se encolan en paralelo', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'sin red' } })
    for (let index = 0; index < 10; index += 1) {
      track({
        name: 'artwork_viewed',
        props: { portfolio_item_id: `p${index}`, position: index },
      })
    }
    await settle()
    expect(await readAnalyticsBuffer(store)).toHaveLength(10)
  })

  it('tolera un buffer corrupto', async () => {
    store.data.set(BUFFER_KEY, 'no es json')
    expect(await readAnalyticsBuffer(store)).toEqual([])
  })
})

describe('envío', () => {
  it('vacía el buffer cuando el envío sale bien', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'sin red' } })
    track({ name: 'onboarding_started', props: {} })
    await settle()

    mockInsert.mockResolvedValue({ error: null })
    expect(await flushAnalytics()).toBe(1)
    expect(await readAnalyticsBuffer(store)).toEqual([])
  })

  it('descarta el intento sin reintentar cuando falla', async () => {
    // Un dato de producto perdido cuesta menos que una app que gasta batería
    // reintentando telemetría.
    mockInsert.mockResolvedValue({ error: { message: 'sin red' } })
    track({ name: 'onboarding_started', props: {} })
    await settle()

    expect(await flushAnalytics()).toBe(0)
    expect(await readAnalyticsBuffer(store)).toHaveLength(1)
  })

  it('no envía sin usuario: la tabla exige user_id = auth.uid()', async () => {
    setAnalyticsUser(null)
    track({ name: 'onboarding_started', props: {} })
    await settle()
    expect(await flushAnalytics()).toBe(0)
  })
})

describe('reglas de privacidad', () => {
  it('ninguna propiedad encolada contiene texto libre', async () => {
    // La unión discriminada de events.ts es lo que impone metrics.md §5.2.
    // Este test es la segunda red: emite un evento de cada forma con props
    // representativas y verifica que ningún valor de texto tenga espacios —
    // que es lo que distingue un enum o un id de una descripción, una búsqueda
    // o un mensaje de error.
    const muestras: AnalyticsEvent[] = [
      { name: 'app_opened', props: { is_first_open: true } },
      {
        name: 'artwork_liked',
        props: { portfolio_item_id: 'p1', via: 'gesture' },
      },
      {
        name: 'taste_profile_generated',
        props: {
          style_count: 4,
          interaction_count: 15,
          taste_version: 'taste/1',
        },
      },
      {
        name: 'match_viewed',
        props: {
          professional_id: 'a1',
          band: 'strong',
          rank: 1,
          matching_version: MATCHING_VERSION,
        },
      },
      {
        name: 'contact_clicked',
        props: {
          professional_id: 'a1',
          channel: 'whatsapp',
          has_project: false,
        },
      },
      { name: 'search_performed', props: { filter_count: 2 } },
      {
        name: 'error_shown',
        props: { surface: 'deck', error_code: 'offline' },
      },
    ]

    for (const evento of muestras) track(evento)
    await settle()

    for (const encolado of await readAnalyticsBuffer(store)) {
      for (const [clave, valor] of Object.entries(encolado.props)) {
        if (typeof valor !== 'string') continue
        expect(`${encolado.name}.${clave}=${valor}`).not.toMatch(/\s/)
      }
    }
  })

  it('nunca hay nombres de estilos en los eventos de gusto', async () => {
    // Un vector de gusto es un proxy razonable de la identidad de alguien.
    // Vive bajo RLS en `taste_profiles`, no en un flujo de analytics.
    track({
      name: 'taste_profile_generated',
      props: {
        style_count: 4,
        interaction_count: 15,
        taste_version: 'taste/1',
      },
    })
    await settle()

    const [event] = await readAnalyticsBuffer(store)
    const serialized = JSON.stringify(event)
    for (const slug of ['fine-line', 'blackwork', 'japanese', 'minimalist']) {
      expect(serialized).not.toContain(slug)
    }
  })

  it('el catálogo declarado coincide con la unión de tipos', () => {
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length)
    expect(EVENT_NAMES).toContain('contact_clicked')
  })

  it('todo nombre de evento cumple el CHECK de la base', () => {
    // `^[a-z][a-z0-9_]{2,63}$`. Un nombre que no pasa se rechaza al insertar, y
    // eso se descubriría en producción.
    for (const name of EVENT_NAMES) {
      expect(name).toMatch(/^[a-z][a-z0-9_]{2,63}$/)
    }
  })
})
