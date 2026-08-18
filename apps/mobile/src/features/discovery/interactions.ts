/**
 * Registrar una interacción, con cola para cuando no hay red.
 *
 * Una interacción es ESTADO, no un evento: una fila por (usuario, pieza), con
 * UNIQUE en la base. Por eso reintentar es seguro y por eso la cola puede
 * simplemente volver a mandar todo lo pendiente sin llevar cuenta de qué llegó.
 *
 * El orden importa poco y la pérdida importa mucho: si alguien desliza veinte
 * obras en el subte, las veinte tienen que llegar cuando salga. Por eso la cola
 * se persiste antes de intentar la red, no después.
 */

import type { InteractionSource, InteractionVerdict } from '@mesh/domain'

import { kv, readJson, writeJson, type KeyValueStore } from '../../data/kv.ts'
import { supabase } from '../../data/supabase.ts'

const QUEUE_KEY = 'mesh.interactions.queue'

export interface PendingInteraction {
  readonly portfolioItemId: string
  readonly verdict: InteractionVerdict
  readonly isSaved: boolean
  readonly source: InteractionSource
}

/**
 * Las escrituras de la cola se serializan.
 *
 * El almacenamiento es asíncrono (ADR-009), así que dos deslizadas rápidas
 * pueden leer la misma cola y una pisar a la otra. Encadenar las operaciones es
 * más simple que un lock y no tiene forma de perder un evento.
 */
let chain: Promise<unknown> = Promise.resolve()

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = chain.then(operation, operation)
  // La cadena nunca se rompe por un error de una operación anterior.
  chain = next.catch(() => undefined)
  return next
}

export async function readQueue(
  store: KeyValueStore = kv,
): Promise<PendingInteraction[]> {
  return readJson<PendingInteraction[]>(store, QUEUE_KEY, [])
}

export async function enqueue(
  interaction: PendingInteraction,
  store: KeyValueStore = kv,
): Promise<void> {
  await serialize(async () => {
    const queue = await readJson<PendingInteraction[]>(store, QUEUE_KEY, [])
    // Una pieza aparece una sola vez: es estado actual. Si alguien deshace y
    // vuelve a decidir, gana lo último.
    const next = queue.filter(
      (item) => item.portfolioItemId !== interaction.portfolioItemId,
    )
    next.push(interaction)
    await writeJson(store, QUEUE_KEY, next)
  })
}

async function removeFromQueue(
  portfolioItemIds: readonly string[],
  store: KeyValueStore,
): Promise<void> {
  const ids = new Set(portfolioItemIds)
  await serialize(async () => {
    const queue = await readJson<PendingInteraction[]>(store, QUEUE_KEY, [])
    await writeJson(
      store,
      QUEUE_KEY,
      queue.filter((item) => !ids.has(item.portfolioItemId)),
    )
  })
}

/**
 * Manda lo pendiente. Devuelve cuántas se sincronizaron.
 *
 * Si la red falla, la cola queda intacta y se vuelve a intentar más adelante.
 * No hay backoff exponencial ni reintentos agresivos: esto se llama al reanudar
 * la app y al volver la conexión, que ya es el momento correcto.
 */
export async function flushQueue(
  userId: string,
  store: KeyValueStore = kv,
): Promise<number> {
  const queue = await readQueue(store)
  if (queue.length === 0) return 0

  const { error } = await supabase.from('interactions').upsert(
    queue.map((item) => ({
      user_id: userId,
      portfolio_item_id: item.portfolioItemId,
      verdict: item.verdict,
      is_saved: item.isSaved,
      source: item.source,
    })),
    { onConflict: 'user_id,portfolio_item_id' },
  )

  if (error != null) return 0

  await removeFromQueue(
    queue.map((item) => item.portfolioItemId),
    store,
  )
  return queue.length
}

/**
 * Registra una decisión: encola primero, después intenta mandarla.
 *
 * El orden no es negociable. Si intentara la red primero y la app se cerrara
 * mientras la petición está en vuelo, la decisión se perdería sin dejar rastro.
 */
export async function recordInteraction(
  userId: string,
  interaction: PendingInteraction,
  store: KeyValueStore = kv,
): Promise<void> {
  await enqueue(interaction, store)
  await flushQueue(userId, store)
}

/** Deshacer: saca la fila. El gusto es una función pura de las filas que quedan. */
export async function undoInteraction(
  userId: string,
  portfolioItemId: string,
  store: KeyValueStore = kv,
): Promise<void> {
  await removeFromQueue([portfolioItemId], store)
  await supabase
    .from('interactions')
    .delete()
    .eq('user_id', userId)
    .eq('portfolio_item_id', portfolioItemId)
}

export { QUEUE_KEY as __QUEUE_KEY }
