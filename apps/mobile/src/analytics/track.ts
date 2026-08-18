/**
 * `track()`: encolar un evento.
 *
 * Tres decisiones que definen este archivo:
 *
 * 1. **El opt-out corta antes de encolar, no antes de enviar.** Si estuviera
 *    apagado y aun así se encolara, el evento existiría en el teléfono de la
 *    persona esperando que cambie de opinión. Apagado significa que no se
 *    escribe nada, en ningún lado.
 * 2. **Los eventos se descartan, no se reintentan con insistencia.** Si el
 *    envío falla, el buffer se recorta y se sigue. Un dato de producto perdido
 *    cuesta menos que una app que gasta batería reintentando telemetría.
 * 3. **Nunca lanza.** Un error de analytics no puede romper una pantalla.
 */

import { kv, readJson, writeJson, type KeyValueStore } from '../data/kv.ts'
import { supabase } from '../data/supabase.ts'

import type { AnalyticsEvent } from './events.ts'

const BUFFER_KEY = 'mesh.analytics.buffer'

/** Tope del buffer. Pasado esto se tiran los MÁS VIEJOS. */
const MAX_BUFFERED = 200

/** A partir de acá se intenta enviar sin esperar al siguiente ciclo. */
const FLUSH_AT = 20

export interface QueuedEvent {
  readonly name: string
  readonly props: Record<string, unknown>
  readonly occurred_at: string
  readonly session_id: string
  readonly platform: 'ios' | 'android' | 'web'
  readonly app_version: string | null
}

export interface TrackerConfig {
  readonly sessionId: string
  readonly platform: 'ios' | 'android' | 'web'
  readonly appVersion: string | null
  /** Reloj inyectable: los tests no dependen de la hora real. */
  readonly now: () => string
  readonly store?: KeyValueStore
}

let config: TrackerConfig | null = null
let optedIn = true
let userId: string | null = null
let chain: Promise<unknown> = Promise.resolve()

export function configureAnalytics(next: TrackerConfig): void {
  config = next
}

export function setAnalyticsUser(id: string | null): void {
  userId = id
}

/**
 * Enciende o apaga la recolección.
 *
 * Al apagar se **borra** lo que había en el buffer. Dejarlo ahí significaría
 * que apagar solo pausa, y no es eso lo que dice el interruptor.
 */
export async function setAnalyticsOptIn(value: boolean): Promise<void> {
  optedIn = value
  if (!value) {
    const store = config?.store ?? kv
    await writeJson(store, BUFFER_KEY, [])
  }
}

export function isAnalyticsOptedIn(): boolean {
  return optedIn
}

/** Encola un evento. Nunca lanza, nunca bloquea la UI. */
export function track(event: AnalyticsEvent): void {
  if (!optedIn || config == null) return
  void enqueue(event).catch(() => undefined)
}

async function enqueue(event: AnalyticsEvent): Promise<void> {
  const current = config
  if (current == null) return

  const store = current.store ?? kv
  const queued: QueuedEvent = {
    name: event.name,
    props: event.props as Record<string, unknown>,
    occurred_at: current.now(),
    session_id: current.sessionId,
    platform: current.platform,
    app_version: current.appVersion,
  }

  const size = await serialize(async () => {
    const buffer = await readJson<QueuedEvent[]>(store, BUFFER_KEY, [])
    buffer.push(queued)
    // Se tiran los más viejos: si el buffer se llenó es porque hace rato que no
    // hay red, y lo reciente describe mejor lo que está pasando ahora.
    const trimmed = buffer.slice(-MAX_BUFFERED)
    await writeJson(store, BUFFER_KEY, trimmed)
    return trimmed.length
  })

  if (size >= FLUSH_AT) await flushAnalytics()
}

/**
 * Manda el buffer. Devuelve cuántos eventos se enviaron.
 *
 * Si falla, el buffer queda como está y se reintenta en el próximo ciclo. No
 * hay backoff exponencial: esto se llama al pasar la app a segundo plano, que
 * ya es el momento correcto.
 */
export async function flushAnalytics(): Promise<number> {
  const current = config
  if (current == null || !optedIn || userId == null) return 0

  const store = current.store ?? kv
  const buffer = await readJson<QueuedEvent[]>(store, BUFFER_KEY, [])
  if (buffer.length === 0) return 0

  const { error } = await supabase.from('analytics_events').insert(
    buffer.map((event) => ({
      user_id: userId,
      session_id: event.session_id,
      name: event.name,
      props: event.props as never,
      occurred_at: event.occurred_at,
      app_version: event.app_version,
      platform: event.platform,
    })),
  )

  if (error != null) return 0

  await serialize(async () => {
    const after = await readJson<QueuedEvent[]>(store, BUFFER_KEY, [])
    // Se sacan los que se enviaron, no todo: pudieron encolarse más mientras
    // la petición estaba en vuelo.
    await writeJson(store, BUFFER_KEY, after.slice(buffer.length))
  })

  return buffer.length
}

export async function readAnalyticsBuffer(
  store: KeyValueStore = config?.store ?? kv,
): Promise<QueuedEvent[]> {
  return readJson<QueuedEvent[]>(store, BUFFER_KEY, [])
}

/** Las escrituras del buffer se serializan, igual que la cola de interacciones. */
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = chain.then(operation, operation)
  chain = next.catch(() => undefined)
  return next
}

/** Solo para tests: devuelve el módulo a su estado inicial. */
export function __resetAnalytics(): void {
  config = null
  optedIn = true
  userId = null
  chain = Promise.resolve()
}

export { BUFFER_KEY as __BUFFER_KEY, MAX_BUFFERED, FLUSH_AT }
