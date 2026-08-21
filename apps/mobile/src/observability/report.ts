/**
 * Reportar un error, sin contarle a nadie quién lo tuvo.
 *
 * Ver ADR-026.
 *
 * ## Qué NO es
 *
 * No es analytics. Analytics mide **comportamiento** —qué pantallas se usan,
 * qué botones se tocan— y por eso está apagado hasta que alguien lo enciende.
 * Esto mide **si la app funciona**, y un reporte de acá no dice qué hizo nadie:
 * dice qué se rompió, en qué pantalla y con qué código.
 *
 * Por eso viene encendido y tiene su propio interruptor, separado del de datos
 * de uso. Mezclarlos habría significado que apagar la telemetría de producto
 * también nos deja ciegos ante los cierres inesperados, que es lo último que le
 * conviene a quien apagó el interruptor.
 *
 * ## Qué viaja, exactamente
 *
 * Un `ErrorReport` y nada más. Lo que no está en esa interfaz no sale del
 * teléfono. En particular **no viaja el id de la persona**: un reporte de error
 * no necesita saber de quién es, y con el `session_id` alcanza para agrupar los
 * errores de una misma sesión rota.
 *
 * El `message` pasa por `redact()`, que es donde está la garantía de verdad —
 * ver `redact.ts` y sus tests.
 *
 * ## Tres reglas del módulo
 *
 * 1. **Nunca lanza.** Un error del reportador de errores que rompa la pantalla
 *    sería una broma cruel.
 * 2. **Sin sumidero configurado, no encola nada.** Guardar reportes en el
 *    teléfono para un servidor que no existe es ocupar espacio ajeno por las
 *    dudas.
 * 3. **Apagar borra el buffer.** Igual que analytics: apagado significa que no
 *    queda nada esperando que alguien cambie de opinión.
 */

import { kv, readJson, writeJson, type KeyValueStore } from '../data/kv.ts'
import { classify, type ErrorCause } from '../data/errors.ts'

import { redact, redactStack } from './redact.ts'

const BUFFER_KEY = 'mesh.errors.buffer'

/** Tope del buffer. Pasado esto se tiran los MÁS VIEJOS. */
const MAX_BUFFERED = 50

/** A partir de acá se intenta enviar sin esperar al siguiente ciclo. */
const FLUSH_AT = 5

/**
 * Lo único que sale del teléfono.
 *
 * Si alguien agrega un campo acá, está agregando algo que viaja a un tercero.
 * Ese es exactamente el momento de preguntarse si corresponde.
 */
export interface ErrorReport {
  /** Dónde pasó. Un identificador nuestro, corto y sin datos. */
  readonly surface: string
  /** La causa visible, del mismo conjunto cerrado que usa la UI. */
  readonly cause: ErrorCause
  /** Clase del error: `TypeError`, `AuthApiError`. Nunca un valor. */
  readonly kind: string
  /** El mensaje, ya pasado por `redact()`. */
  readonly message: string
  /** La pila, reducida a función y archivo. */
  readonly frames: readonly string[]
  readonly occurred_at: string
  readonly session_id: string
  readonly platform: 'ios' | 'android' | 'web'
  readonly app_version: string | null
  /** Si la app siguió andando o se cayó la pantalla entera. */
  readonly fatal: boolean
}

/**
 * A dónde van los reportes.
 *
 * Es una interfaz y no una integración concreta a propósito: hoy no hay
 * proveedor elegido, y el día que lo haya se escribe un adaptador de veinte
 * líneas sin tocar nada de lo de arriba. Ver ADR-026.
 */
export interface ErrorSink {
  readonly name: string
  send: (reports: readonly ErrorReport[]) => Promise<void>
}

export interface ReporterConfig {
  readonly sessionId: string
  readonly platform: 'ios' | 'android' | 'web'
  readonly appVersion: string | null
  /** Reloj inyectable: los tests no dependen de la hora real. */
  readonly now: () => string
  readonly sink: ErrorSink | null
  readonly store?: KeyValueStore
}

let config: ReporterConfig | null = null
let enabled = true
let chain: Promise<unknown> = Promise.resolve()

/** Las escrituras del buffer se serializan: dos errores a la vez se pisarían. */
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task)
  chain = next.catch(() => undefined)
  return next
}

export function configureReporter(next: ReporterConfig): void {
  config = next
}

export async function setReporterEnabled(value: boolean): Promise<void> {
  enabled = value
  if (!value) {
    const store = config?.store ?? kv
    await writeJson(store, BUFFER_KEY, [])
  }
}

export function isReporterEnabled(): boolean {
  return enabled
}

/** Forma mínima de algo que se parece a un error. */
function kindOf(error: unknown): string {
  if (error instanceof Error) return error.name
  if (typeof error === 'object' && error !== null) {
    return error.constructor?.name ?? 'Object'
  }
  return typeof error
}

/**
 * Arma el reporte. Exportada para poder testear qué viaja sin montar la cola.
 *
 * **Es el único lugar donde un error se convierte en algo que sale del
 * teléfono.** Todo lo que no pase por acá no viaja.
 */
export function buildReport(
  error: unknown,
  context: { surface: string; fatal?: boolean },
  meta: {
    occurredAt: string
    sessionId: string
    platform: 'ios' | 'android' | 'web'
    appVersion: string | null
  },
): ErrorReport {
  const asError = error instanceof Error ? error : null

  return {
    surface: context.surface,
    cause: classify(error),
    kind: kindOf(error),
    message: redact(
      asError?.message ??
        (typeof error === 'string'
          ? error
          : ((error as { message?: unknown } | null)?.message ?? '')),
    ),
    frames: redactStack(asError?.stack),
    occurred_at: meta.occurredAt,
    session_id: meta.sessionId,
    platform: meta.platform,
    app_version: meta.appVersion,
    fatal: context.fatal ?? false,
  }
}

/**
 * Encola un error. Nunca lanza, nunca bloquea la UI.
 *
 * `surface` es lo que hace útil un reporte: sin él, todo llega como "algo se
 * rompió en algún lado". Se pasa a mano y a propósito — derivarlo de la ruta
 * activa habría metido en el reporte el slug de un artista o el id de una
 * conversación.
 */
export function reportError(
  error: unknown,
  context: { surface: string; fatal?: boolean },
): void {
  const current = config
  // Sin sumidero no se encola: guardar reportes para un servidor que no existe
  // es ocupar el teléfono de alguien por las dudas.
  if (!enabled || current == null || current.sink == null) return

  void serialize(async () => {
    const store = current.store ?? kv
    const report = buildReport(error, context, {
      occurredAt: current.now(),
      sessionId: current.sessionId,
      platform: current.platform,
      appVersion: current.appVersion,
    })

    const buffer = await readJson<ErrorReport[]>(store, BUFFER_KEY, [])
    buffer.push(report)
    // Se tiran los más viejos: si el buffer se llenó, lo reciente describe
    // mejor lo que está pasando ahora.
    const trimmed = buffer.slice(-MAX_BUFFERED)
    await writeJson(store, BUFFER_KEY, trimmed)
    return trimmed.length
  })
    .then((size) => (size >= FLUSH_AT ? flushReports() : 0))
    .catch(() => undefined)
}

/**
 * Manda el buffer. Devuelve cuántos reportes se enviaron.
 *
 * Si falla, el buffer queda como está. Sin backoff: esto se llama al pasar la
 * app a segundo plano, que ya es el momento correcto.
 */
export async function flushReports(): Promise<number> {
  const current = config
  if (current == null || !enabled || current.sink == null) return 0

  const store = current.store ?? kv
  const buffer = await readJson<ErrorReport[]>(store, BUFFER_KEY, [])
  if (buffer.length === 0) return 0

  try {
    await current.sink.send(buffer)
  } catch {
    // Se reintenta en el próximo ciclo. Un reporte perdido cuesta menos que una
    // app que gasta batería insistiendo con telemetría.
    return 0
  }

  await serialize(async () => {
    const after = await readJson<ErrorReport[]>(store, BUFFER_KEY, [])
    // Se sacan los que se enviaron, no todo: pudieron encolarse más mientras la
    // petición estaba en vuelo.
    await writeJson(store, BUFFER_KEY, after.slice(buffer.length))
  })

  return buffer.length
}

/** Para los tests: deja el módulo como recién importado. */
export function resetReporterForTests(): void {
  config = null
  enabled = true
  chain = Promise.resolve()
}
