// Una línea de JSON por cosa que pasa.
//
// Ver ADR-026.
//
// ## Por qué esto existe
//
// Hasta hoy, las tres Edge Functions se tragaban los errores en un 502 genérico
// y no dejaban rastro de nada:
//
//     if (!anthropicResponse.ok) {
//       return jsonResponse({ error: 'no se pudo responder' }, 502)
//     }
//
// Si el modelo empieza a devolver 429 por cuota, o 400 por un `tool_choice`
// equivocado —que ya pasó una vez, y estuvo días roto— desde afuera se ve
// exactamente lo mismo: "no se pudo responder". El único síntoma es gente que
// se queja.
//
// ## Qué se registra, y qué no
//
// **Nunca el cuerpo.** Ni el mensaje que alguien escribió, ni la foto, ni el
// resumen que armó el asistente, ni el correo de nadie. Lo que se registra es la
// **forma** de lo que pasó: qué función, qué evento, cuánto tardó, con qué
// estado, y —si hubo un upstream— qué código devolvió.
//
// El id de usuario tampoco. Un log de operación no necesita saber de quién era
// la petición; para correlacionar alcanza el `request_id`, que vive lo que dura
// la petición y no identifica a nadie después.
//
// ## Por qué JSON en una línea
//
// Porque el recolector de Supabase lo parsea y lo vuelve consultable. Un
// `console.log('algo falló', error)` es una cadena que hay que leer a ojo.

/** Lo único que puede ir en un log. Sin objetos: un objeto esconde un cuerpo. */
export type LogValue = string | number | boolean | null

export interface LogFields {
  /** Qué función. Constante por archivo. */
  readonly fn: string
  /** Qué pasó. Un verbo corto y de un conjunto chico, para poder agrupar. */
  readonly event: string
  /** Cuánto tardó, en milisegundos enteros. */
  readonly ms?: number
  /** El estado con el que se respondió. */
  readonly status?: number
  /** El estado que devolvió un servicio de afuera, si se llamó a alguno. */
  readonly upstream_status?: number
  /** Correlaciona las líneas de una misma petición. Muere con ella. */
  readonly request_id?: string
  /** Código de error corto, nunca un mensaje. */
  readonly code?: string
}

/**
 * Escribe una línea.
 *
 * Nunca lanza: un fallo del registro no puede tumbar la petición que estaba
 * registrando.
 */
export function logLine(fields: LogFields): void {
  try {
    const seguro: Record<string, LogValue> = {}
    for (const [clave, valor] of Object.entries(fields)) {
      // Segunda barrera: si alguien agrega un campo con un objeto adentro
      // —donde viajaría un cuerpo— no sale.
      if (
        typeof valor === 'string' ||
        typeof valor === 'number' ||
        typeof valor === 'boolean' ||
        valor === null
      ) {
        seguro[clave] = valor
      }
    }
    // `console.log` y no `console.error`: esto no es un error, es el registro
    // de operación. El recolector de Supabase toma stdout y lo vuelve
    // consultable; mandarlo por stderr pintaría de rojo cada petición exitosa.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(seguro))
  } catch {
    // Sin fallback ruidoso: si `JSON.stringify` falló, un `console.log` del
    // objeto crudo sería exactamente lo que este módulo existe para evitar.
  }
}

/**
 * Envuelve el manejador de una función con un registro de entrada y salida.
 *
 * Devuelve el `Response` sin tocarlo. Lo que agrega es una línea por petición
 * con la duración y el estado, y una línea más si el manejador lanzó — que
 * antes se perdía entera.
 *
 * `Date.now()` acá está bien: es una Edge Function, no `packages/domain`.
 */
export function withLogging(
  fn: string,
  handler: (req: Request, requestId: string) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const requestId = crypto.randomUUID()
    const inicio = Date.now()

    try {
      const response = await handler(req, requestId)
      logLine({
        fn,
        event: 'done',
        ms: Date.now() - inicio,
        status: response.status,
        request_id: requestId,
      })
      return response
    } catch (error) {
      // Lo que antes era una excepción sin rastro. Del error se registra la
      // CLASE, nunca el mensaje: el mensaje de un error de Postgres lleva
      // valores de la fila.
      logLine({
        fn,
        event: 'threw',
        ms: Date.now() - inicio,
        status: 500,
        request_id: requestId,
        code: error instanceof Error ? error.name : 'unknown',
      })
      return new Response(JSON.stringify({ error: 'error interno' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  }
}
