/**
 * La cola de interacciones.
 *
 * Lo que quedó de este archivo cuando el mazo salió de la app de quien busca
 * (ver MESH-DESIGN-DECISIONS D-010): la cola offline sigue siendo
 * infraestructura y sigue verificada. Los tests del mazo se fueron con el mazo.
 */

import type { KeyValueStore } from '@/data/kv.ts'

import {
  __QUEUE_KEY as QUEUE_KEY,
  enqueue,
  flushQueue,
  readQueue,
  recordInteraction,
} from './interactions.ts'

const mockRpc = jest.fn()
const mockUpsert = jest.fn()
const mockFrom = jest.fn()

jest.mock('../../data/supabase.ts', () => ({
  get supabase() {
    return {
      rpc: mockRpc,
      from: mockFrom,
      storage: {
        from: () => ({
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://ejemplo.test/${path}` },
          }),
        }),
      },
    }
  },
}))

/** Store en memoria: la cola se prueba sobre su comportamiento, no sobre SQLite. */
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
      for (const key of [...data.keys()]) {
        if (key.startsWith(prefix)) data.delete(key)
      }
    },
  }
}

function feedRow(index: number, professional: string) {
  return {
    feed_cursor: `00000${index}:${professional}`,
    portfolio_item_id: `pieza-${index}`,
    professional_id: `prof-${professional}`,
    professional_slug: professional,
    professional_display_name: `${professional}`,
    professional_is_fixture: false,
    caption: null,
    year: 2026,
    media_bucket: 'portfolio',
    media_path: `${professional}/pieza-${index}/lg.webp`,
    media_width: 1200,
    media_height: 1500,
    media_blurhash: 'L8P6,D~qxu~q',
    styles: [{ slug: 'fine-line', weight: 1 }],
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRpc.mockResolvedValue({
    data: [feedRow(1, 'uno'), feedRow(2, 'dos'), feedRow(3, 'tres')],
    error: null,
  })
  mockUpsert.mockResolvedValue({ error: null })
  mockFrom.mockReturnValue({
    upsert: mockUpsert,
    delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
  })
})

describe('la cola de interacciones', () => {
  it('encola antes de intentar la red', async () => {
    // El orden no es negociable: si intentara la red primero y la app se
    // cerrara con la petición en vuelo, la decisión se perdería sin rastro.
    const store = memoryStore()
    mockUpsert.mockResolvedValue({ error: { message: 'sin red' } })

    await recordInteraction(
      'user-1',
      {
        portfolioItemId: 'pieza-1',
        verdict: 'like',
        isSaved: false,
        source: 'discover',
      },
      store,
    )

    expect(await readQueue(store)).toHaveLength(1)
  })

  it('vacía la cola cuando la escritura sale bien', async () => {
    const store = memoryStore()
    await recordInteraction(
      'user-1',
      {
        portfolioItemId: 'pieza-1',
        verdict: 'like',
        isSaved: false,
        source: 'discover',
      },
      store,
    )
    expect(await readQueue(store)).toHaveLength(0)
  })

  it('conserva la cola intacta cuando la red falla', async () => {
    // Es el caso del subte: veinte deslizadas sin señal tienen que llegar todas
    // cuando vuelva la conexión.
    const store = memoryStore()
    mockUpsert.mockResolvedValue({ error: { message: 'sin red' } })

    for (let index = 1; index <= 20; index += 1) {
      await recordInteraction(
        'user-1',
        {
          portfolioItemId: `pieza-${index}`,
          verdict: 'like',
          isSaved: false,
          source: 'discover',
        },
        store,
      )
    }
    expect(await readQueue(store)).toHaveLength(20)

    mockUpsert.mockResolvedValue({ error: null })
    expect(await flushQueue('user-1', store)).toBe(20)
    expect(await readQueue(store)).toHaveLength(0)
  })

  it('guarda una sola entrada por pieza: es estado, no un log', async () => {
    const store = memoryStore()
    mockUpsert.mockResolvedValue({ error: { message: 'sin red' } })

    await enqueue(
      {
        portfolioItemId: 'pieza-1',
        verdict: 'pass',
        isSaved: false,
        source: 'discover',
      },
      store,
    )
    await enqueue(
      {
        portfolioItemId: 'pieza-1',
        verdict: 'like',
        isSaved: true,
        source: 'discover',
      },
      store,
    )

    const queue = await readQueue(store)
    expect(queue).toHaveLength(1)
    expect(queue[0]?.isSaved).toBe(true)
  })

  it('no pierde eventos cuando dos deslizadas se pisan', async () => {
    // El almacenamiento es asíncrono (ADR-009): sin serializar, dos escrituras
    // concurrentes leen la misma cola y una pisa a la otra.
    const store = memoryStore()
    await Promise.all(
      [1, 2, 3, 4, 5].map((index) =>
        enqueue(
          {
            portfolioItemId: `pieza-${index}`,
            verdict: 'like',
            isSaved: false,
            source: 'discover',
          },
          store,
        ),
      ),
    )
    expect(await readQueue(store)).toHaveLength(5)
  })

  it('tolera una cola corrupta en vez de romper el arranque', async () => {
    const store = memoryStore()
    store.data.set(QUEUE_KEY, '{esto no es json')
    expect(await readQueue(store)).toEqual([])
  })
})
