/**
 * El reportador de errores.
 *
 * Lo que se testea acá es lo que hace que esto no sea una filtración con buenas
 * intenciones:
 *
 * 1. **Lo que viaja es exactamente `ErrorReport`, y no lleva el id de nadie.**
 * 2. **Sin sumidero configurado no se encola nada.** Guardar reportes para un
 *    servidor que no existe es ocupar el teléfono de alguien por las dudas.
 * 3. **Apagado borra el buffer**, no lo pausa.
 * 4. **Nunca lanza.** Un error del reportador de errores que rompa una pantalla
 *    sería una broma cruel.
 *
 * La redacción de los textos se prueba aparte, en `redact.test.ts`.
 */

import type { KeyValueStore } from '../data/kv.ts'

import {
  buildReport,
  configureReporter,
  flushReports,
  reportError,
  resetReporterForTests,
  setReporterEnabled,
  type ErrorReport,
  type ErrorSink,
} from './report.ts'

/** Un almacén en memoria, para no tocar el del dispositivo. */
function memoria(): KeyValueStore {
  const datos = new Map<string, string>()
  return {
    get: async (key: string) => datos.get(key) ?? null,
    set: async (key: string, value: string) => {
      datos.set(key, value)
    },
    remove: async (key: string) => {
      datos.delete(key)
    },
    clearPrefix: async (prefix: string) => {
      for (const key of [...datos.keys()]) {
        if (key.startsWith(prefix)) datos.delete(key)
      }
    },
  }
}

function sumideroQueGuarda() {
  const enviados: ErrorReport[] = []
  const sink: ErrorSink = {
    name: 'test',
    send: async (reports) => {
      enviados.push(...reports)
    },
  }
  return { sink, enviados }
}

const META = {
  sessionId: 'sesion-1',
  platform: 'ios' as const,
  appVersion: '1.0.0',
  now: () => '2026-08-21T12:00:00.000Z',
}

beforeEach(() => {
  resetReporterForTests()
})

describe('buildReport', () => {
  it('no lleva el id de la persona: un error no necesita saber de quién es', () => {
    const report = buildReport(
      new Error('algo'),
      { surface: 'chat' },
      {
        occurredAt: META.now(),
        sessionId: META.sessionId,
        platform: META.platform,
        appVersion: META.appVersion,
      },
    )

    // La forma completa de lo que sale del teléfono. Si alguien agrega una
    // clave, este test se cae y hay que justificarla.
    expect(Object.keys(report).sort()).toEqual([
      'app_version',
      'cause',
      'fatal',
      'frames',
      'kind',
      'message',
      'occurred_at',
      'platform',
      'session_id',
      'surface',
    ])
    expect(JSON.stringify(report)).not.toMatch(/user|uid/i)
  })

  it('redacta el mensaje antes de guardarlo', () => {
    const report = buildReport(
      new Error('Key (email)=(alguien@ejemplo.com) already exists'),
      { surface: 'cuenta' },
      {
        occurredAt: META.now(),
        sessionId: META.sessionId,
        platform: META.platform,
        appVersion: META.appVersion,
      },
    )
    expect(report.message).not.toMatch(/alguien@ejemplo/)
  })

  it('no se rompe con algo que no es un Error', () => {
    const report = buildReport(
      'se cayó',
      { surface: 'x' },
      {
        occurredAt: META.now(),
        sessionId: META.sessionId,
        platform: META.platform,
        appVersion: META.appVersion,
      },
    )
    expect(report.kind).toBe('string')
    expect(report.frames).toEqual([])
  })
})

describe('reportError', () => {
  it('sin sumidero no encola nada', async () => {
    const store = memoria()
    configureReporter({ ...META, sink: null, store })

    reportError(new Error('x'), { surface: 'chat' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(await store.get('mesh.errors.buffer')).toBeNull()
  })

  it('con sumidero, encola y manda al llegar al lote', async () => {
    const store = memoria()
    const { sink, enviados } = sumideroQueGuarda()
    configureReporter({ ...META, sink, store })

    for (let i = 0; i < 5; i += 1) {
      reportError(new Error(`x${String(i)}`), { surface: 'chat' })
    }
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(enviados.length).toBe(5)
    expect(enviados[0]?.surface).toBe('chat')
  })

  it('apagado no encola, y borra lo que había', async () => {
    const store = memoria()
    const { sink } = sumideroQueGuarda()
    configureReporter({ ...META, sink, store })

    reportError(new Error('x'), { surface: 'chat' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(await store.get('mesh.errors.buffer')).not.toBeNull()

    // Apagar BORRA. Si solo pausara, quedarían reportes esperando que alguien
    // cambie de opinión, que no es lo que dice el interruptor.
    await setReporterEnabled(false)
    expect(JSON.parse((await store.get('mesh.errors.buffer')) ?? '[]')).toEqual(
      [],
    )

    reportError(new Error('y'), { surface: 'chat' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(JSON.parse((await store.get('mesh.errors.buffer')) ?? '[]')).toEqual(
      [],
    )
  })

  it('si el sumidero falla, el buffer queda para el próximo ciclo', async () => {
    const store = memoria()
    const sink: ErrorSink = {
      name: 'roto',
      send: async () => {
        throw new Error('502')
      },
    }
    configureReporter({ ...META, sink, store })

    reportError(new Error('x'), { surface: 'chat' })
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(await flushReports()).toBe(0)
    const buffer = JSON.parse(
      (await store.get('mesh.errors.buffer')) ?? '[]',
    ) as unknown[]
    expect(buffer.length).toBe(1)
  })

  it('nunca lanza, ni sin configurar', () => {
    // Es el caso del arranque: algo se rompe antes de que el proveedor corra.
    expect(() => {
      reportError(new Error('x'), { surface: 'arranque' })
    }).not.toThrow()
  })
})
