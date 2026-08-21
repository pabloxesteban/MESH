// El asistente que ayuda a alguien a decir qué se quiere tatuar.
//
// Ver ADR-021, que es donde están escritas las siete reglas y por qué esto vive
// en un hilo aparte y no adentro del chat con el artista.
//
// ## Qué hace esta función, en una línea
//
// Recibe un mensaje de la persona, lo guarda, le manda al modelo TODO el hilo
// más el vocabulario real de la categoría, y obliga al modelo a contestar
// eligiendo una de dos herramientas: **preguntar una cosa más** o **cerrar el
// pedido**. No hay una tercera forma de contestar.
//
// ## Por qué `tool_choice` en vez de un mensaje libre
//
// Es la única garantía estructural que tiene esta ADR. Con la respuesta forzada
// a una herramienta:
//
// - Los slugs de `close_brief` son **enums que salen de la base**, así que el
//   pedido nunca puede contener un estilo que no exista.
// - Todos los campos son **nullable y así lo dice el prompt**: un pedido puede
//   cerrarse vacío. Un modelo que rellena para poder cerrar es el innegociable 2
//   roto donde más barato sale romperlo.
// - El único texto libre que el modelo puede producir es **la pregunta que le
//   hace a su propia dueña** y **el resumen que ella después edita**. Nada de
//   eso llega a un artista sin pasar por su mano.
//
// ## Por qué la clave del servicio, y solo para una cosa
//
// El turno del asistente lo escribe el servidor porque la política de INSERT
// solo deja al cliente escribir `role = 'person'` — si el cliente pudiera
// escribir del lado del bot, fabricaría un precio o una disponibilidad y la
// mostraría como si MESH la hubiera dicho. Ver la migración
// `20260820000600_assistant.sql`.
//
// El hilo se valida ANTES con el JWT de quien llama: si RLS no se lo devuelve,
// no es suyo y acá no se escribe nada.

import { createClient } from 'jsr:@supabase/supabase-js@2'

import { logLine, withLogging } from '../_shared/log.ts'
import {
  fetchVocabulary,
  resolveSlug,
  resolveTraits,
} from '../_shared/vocabulary.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// El mismo modelo chico que lee las fotos: esto es una entrevista de seis
// preguntas contra un vocabulario cerrado, no un ensayo.
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_VERSION = '2023-06-01'

const MAX_MESSAGE_LENGTH = 2000
/** Igual que el tope del trigger. Si uno cambia, cambia el otro. */
const MAX_TURNS = 40

/**
 * Las siete reglas de ADR-021, escritas para el modelo.
 *
 * Están además sostenidas por la forma de la respuesta, pero el prompt importa
 * igual: la 3, la 4 y la 5 son sobre el TEXTO de la pregunta, y ahí la única
 * barrera es esta. Por eso están escritas como prohibiciones con el ejemplo de
 * qué contestar en su lugar — un "no hagas X" solo deja al modelo buscando la
 * cosa más parecida a X.
 */
const SYSTEM_PROMPT = [
  'Sos el asistente de MESH, una app de Buenos Aires para encontrar tatuadores.',
  'Tu único trabajo es ayudar a una persona a describir qué se quiere tatuar, para que después un tatuador pueda cotizarlo sin tener que preguntar cinco cosas por chat.',
  '',
  'Hablás en español rioplatense, de vos, sin signos de exclamación y sin emojis. Frases cortas. Una sola pregunta por turno.',
  '',
  'PROHIBICIONES. Ninguna tiene excepción:',
  '1. NUNCA digas un precio, ni un rango, ni "suele salir", ni si algo es caro o barato. Si te preguntan cuánto sale, contestá que el precio lo pone cada tatuador para cada trabajo, y que en cuanto termines el pedido le va a llegar a varios para que te pasen su número.',
  '2. NUNCA digas si alguien tiene lugar, ni cuándo, ni cuánto tarda en haber turno. Si te preguntan, contestá que los turnos los muestra cada tatuador en su perfil.',
  '3. NUNCA nombres a un tatuador, ni recomiendes uno, ni digas que alguien hace o no hace algo. No sabés quiénes están en la app.',
  '4. NUNCA des consejo médico, de cicatrización, de dolor, ni sobre tapar cicatrices o lunares. Decí que eso se habla con el tatuador en persona.',
  '5. NUNCA inventes un dato que la persona no te dijo. Si no sabés algo, dejalo vacío.',
  '6. NUNCA prometas nada en nombre de un tatuador ni de MESH.',
  '',
  'CÓMO TRABAJÁS:',
  'Preguntá de a una cosa por vez, y solo lo que falte. Lo que importa es: qué imagen o idea quiere, en qué parte del cuerpo, de qué tamaño, y si lo piensa en negro o en color.',
  'Si la persona no sabe algo, no insistas: seguí. Un pedido con huecos es un pedido válido.',
  'Después de tres o cuatro preguntas, o antes si ya está claro, cerrá el pedido con close_brief.',
  'Si la persona te dice que ya está, cerrá aunque falten datos.',
  '',
  'AL CERRAR:',
  'El resumen lo va a leer un tatuador. Escribilo en primera persona, como lo diría ella, con lo que efectivamente te contó y nada más. Tres o cuatro oraciones como mucho. Sin precio, sin fechas, sin nombres.',
  'El título es corto, para que ella reconozca su pedido en una lista.',
  'Los campos de estilo, zona, tamaño y paleta se dejan en null salvo que ella lo haya dicho o se deduzca sin dudar de lo que dijo. Un dato inventado le cambia a quién le llega el pedido y cuánto le cobran.',
].join('\n')

interface AssistantRequest {
  readonly threadId: string
  readonly message: string
  readonly categorySlug: string
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Las dos formas que puede tener una respuesta. No hay una tercera.
 *
 * `ask_question` lleva `options` para que la pantalla pueda ofrecer toques en
 * vez de teclado — pero son sugerencias del modelo, texto, no vocabulario: lo
 * que la persona toque vuelve como un mensaje suyo y se vuelve a interpretar.
 * El vocabulario cerrado está del lado de `close_brief`, que es lo único que
 * termina siendo un dato.
 */
export function buildAssistantTools(
  styleSlugs: readonly string[],
  traitsByDimension: Readonly<Record<string, readonly string[]>>,
) {
  const briefProperties: Record<string, unknown> = {
    title: {
      type: 'string',
      description:
        'Título corto del pedido, como para reconocerlo en una lista. Máximo 60 caracteres.',
    },
    summary: {
      type: 'string',
      description:
        'El pedido en palabras, en primera persona, con lo que ella contó y nada más. Lo va a leer un tatuador. Sin precio, sin fechas, sin nombres.',
    },
    style_slug: {
      type: ['string', 'null'],
      enum: [...styleSlugs, null],
      description:
        'El estilo, si ella lo nombró o si se deduce sin dudar de lo que describió. null si no.',
    },
  }

  const dimensionDescriptions: Record<string, string> = {
    body_area:
      'La parte del cuerpo, si la dijo. null si todavía no la sabe o no la dijo.',
    size: 'El tamaño, si lo dijo o lo describió con algo comparable. null si no.',
    palette:
      'Si lo quiere en negro, en negro y gris, o en color. null si no lo dijo.',
  }

  for (const [dimension, slugs] of Object.entries(traitsByDimension)) {
    briefProperties[dimension] = {
      type: ['string', 'null'],
      enum: [...slugs, null],
      description:
        dimensionDescriptions[dimension] ??
        `El valor de ${dimension} que ella dijo, o null.`,
    }
  }

  return [
    {
      name: 'ask_question',
      description:
        'Preguntale una sola cosa más. Usá esto mientras falte algo importante y ella no haya dicho que ya está.',
      input_schema: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description:
              'La pregunta, corta y en rioplatense. Una sola. Sin precios, sin fechas, sin nombres de tatuadores.',
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Hasta cuatro respuestas posibles para tocar en vez de escribir, si la pregunta las admite. Vacío si es abierta.',
          },
        },
        required: ['question', 'options'],
      },
    },
    {
      name: 'close_brief',
      description:
        'Cerrá el pedido con lo que tengas. Todos los campos de vocabulario pueden ir en null: un pedido con huecos es un pedido válido, y un dato inventado no.',
      input_schema: {
        type: 'object',
        properties: briefProperties,
        required: Object.keys(briefProperties),
      },
    },
  ]
}

/**
 * Junta turnos seguidos del mismo lado en uno solo.
 *
 * La API de mensajes espera que los roles se alternen, y el hilo puede no
 * alternar: si una llamada falla después de guardar el turno de la persona
 * —se cayó la red, contestó un 502— el próximo mensaje deja dos turnos de
 * persona pegados. Sin esto, ese hilo queda roto para siempre, que es la peor
 * forma de perder una conversación.
 */
export function mergeTurns(
  turns: readonly { role: string; body: string }[],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const merged: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const turn of turns) {
    const role = turn.role === 'person' ? 'user' : 'assistant'
    const last = merged[merged.length - 1]
    if (last != null && last.role === role) {
      last.content = `${last.content}\n${turn.body}`
    } else {
      merged.push({ role, content: String(turn.body) })
    }
  }
  return merged
}

/** Recorta sin cortar una palabra por la mitad. */
function trim(value: unknown, max: number): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

Deno.serve(
  withLogging('brief-assistant', async (req, requestId) => {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method not allowed' }, 405)
    }

    if (ANTHROPIC_API_KEY == null || ANTHROPIC_API_KEY === '') {
      return jsonResponse({ error: 'no configurado' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (authHeader == null) {
      return jsonResponse({ error: 'hace falta una sesión' }, 401)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user == null) {
      return jsonResponse({ error: 'sesión inválida' }, 401)
    }

    let body: AssistantRequest
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'cuerpo inválido' }, 400)
    }

    if (
      typeof body.threadId !== 'string' ||
      typeof body.message !== 'string' ||
      body.message.trim() === '' ||
      typeof body.categorySlug !== 'string'
    ) {
      return jsonResponse({ error: 'faltan campos' }, 400)
    }

    if (body.message.length > MAX_MESSAGE_LENGTH) {
      return jsonResponse({ error: 'mensaje demasiado largo' }, 400)
    }

    // El hilo, con el JWT de quien llama. Si RLS no lo devuelve, no es suyo — y
    // esta es la única verificación de dueño que hay antes de usar la service
    // key más abajo.
    const { data: thread } = await supabase
      .from('assistant_threads')
      .select('id')
      .eq('id', body.threadId)
      .maybeSingle()

    if (thread == null) {
      return jsonResponse({ error: 'ese hilo no existe' }, 404)
    }

    // El turno de la persona lo escribe la persona: con su JWT, contra su
    // política, y pasando por los dos topes del trigger. Que la cuota se aplique
    // acá y no en código es a propósito — un tope que vive en la función se evade
    // llamando a la tabla.
    const { error: turnError } = await supabase.from('assistant_turns').insert({
      thread_id: body.threadId,
      role: 'person',
      body: body.message.trim(),
    })

    if (turnError != null) {
      // 53400 son los dos topes: el del hilo y el de la hora.
      const status = turnError.code === '53400' ? 429 : 400
      return jsonResponse({ error: turnError.message }, status)
    }

    const { data: turns } = await supabase
      .from('assistant_turns')
      .select('role, body')
      .eq('thread_id', body.threadId)
      .order('created_at')

    const history = turns ?? []

    const vocabulary = await fetchVocabulary(supabase, body.categorySlug)
    if (vocabulary == null) {
      return jsonResponse({ error: 'no hay estilos para esa categoría' }, 400)
    }

    const tools = buildAssistantTools(
      vocabulary.styleSlugs,
      vocabulary.traitsByDimension,
    )

    // Cerca del tope, el modelo tiene que cerrar sí o sí: la alternativa es que
    // el trigger le corte la conversación a la persona con un error, que es la
    // peor forma de terminar un pedido.
    const casiLleno = history.length >= MAX_TURNS - 4

    const vocabularyNote = [
      `Estilos posibles: ${vocabulary.styleSlugs.join(', ')}`,
      ...Object.entries(vocabulary.traitsByDimension).map(
        ([dimension, slugs]) => `${dimension} posibles: ${slugs.join(', ')}`,
      ),
    ].join('\n')

    let anthropicResponse: Response
    try {
      anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 700,
          system: [
            SYSTEM_PROMPT,
            '',
            'VOCABULARIO. Al cerrar, los campos de abajo solo aceptan estos valores, o null:',
            vocabularyNote,
            ...(casiLleno
              ? [
                  '',
                  'ESTA CONVERSACIÓN YA ES LARGA: cerrá el pedido ahora con close_brief, con lo que tengas.',
                ]
              : []),
          ].join('\n'),
          tools,
          // Forzado a herramienta, sin dejarle elegir "contestar de una":
          // `any` obliga a usar una de las dos, que es toda la garantía.
          tool_choice: casiLleno
            ? { type: 'tool', name: 'close_brief' }
            : { type: 'any' },
          messages: mergeTurns(
            history.map((turn) => ({
              role: String(turn.role),
              body: String(turn.body),
            })),
          ),
        }),
      })
    } catch {
      // Antes esto se perdía entero. Que el modelo esté caído y que devuelva 429
      // por cuota se veían igual desde afuera: "no se pudo responder".
      logLine({
        fn: 'brief-assistant',
        event: 'upstream_unreachable',
        request_id: requestId,
      })
      return jsonResponse({ error: 'no se pudo responder' }, 502)
    }

    if (!anthropicResponse.ok) {
      logLine({
        fn: 'brief-assistant',
        event: 'upstream_error',
        upstream_status: anthropicResponse.status,
        request_id: requestId,
      })
      return jsonResponse({ error: 'no se pudo responder' }, 502)
    }

    const payload = await anthropicResponse.json()
    const toolUse = (
      payload.content as Array<Record<string, unknown>> | undefined
    )?.find((block) => block['type'] === 'tool_use')

    if (toolUse == null) {
      // El modelo contestó sin usar ninguna herramienta, que con `tool_choice`
      // forzado no debería poder pasar. Si empieza a pasar, es un cambio de
      // contrato de la API y hay que enterarse.
      logLine({
        fn: 'brief-assistant',
        event: 'no_tool_use',
        request_id: requestId,
      })
      return jsonResponse({ error: 'no se pudo responder' }, 502)
    }

    const input =
      (toolUse['input'] as Record<string, unknown> | undefined) ?? {}

    // El turno del asistente, con la service key. Es lo ÚNICO para lo que se usa,
    // y sobre un hilo que ya se verificó que es de quien llama.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    async function recordAssistantTurn(text: string): Promise<void> {
      await admin
        .from('assistant_turns')
        .insert({ thread_id: body.threadId, role: 'assistant', body: text })
    }

    if (toolUse['name'] === 'ask_question') {
      const question = trim(input['question'], 400)
      if (question === '') {
        return jsonResponse({ error: 'no se pudo responder' }, 502)
      }

      const rawOptions = Array.isArray(input['options']) ? input['options'] : []
      const options = rawOptions
        .map((option) => trim(option, 40))
        .filter((option) => option !== '')
        .slice(0, 4)

      await recordAssistantTurn(question)
      logLine({
        fn: 'brief-assistant',
        event: 'asked',
        request_id: requestId,
      })
      return jsonResponse({ kind: 'question', question, options }, 200)
    }

    // close_brief. Segunda barrera sobre cada slug: lo que no estaba en la lista
    // que entró, no sale.
    const styleSlug = resolveSlug(input['style_slug'], vocabulary.styleSlugs)
    const traits = resolveTraits(input, vocabulary.traitsByDimension)
    const summary = trim(input['summary'], 600)
    const title = trim(input['title'], 60)

    if (summary === '' || title === '') {
      return jsonResponse({ error: 'no se pudo responder' }, 502)
    }

    // El resumen queda también en el hilo: si la persona lo edita en la pantalla
    // de revisión, se puede ver qué había propuesto el asistente y qué escribió
    // ella. Un resumen que solo existiera en la pantalla sería imposible de
    // auditar después.
    await recordAssistantTurn(summary)

    // Que cerró un pedido, y nada de lo que dice. Es la única medida de si el
    // asistente sirve para algo.
    logLine({
      fn: 'brief-assistant',
      event: 'closed',
      request_id: requestId,
    })

    return jsonResponse(
      { kind: 'brief', title, summary, styleSlug, traits },
      200,
    )
  }),
)
