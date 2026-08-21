// Lee una foto de referencia contra la taxonomía: estilo, zona del cuerpo,
// tamaño y paleta.
//
// Antes se llamaba `classify-style` y devolvía un slug. Un estilo solo no es un
// pedido; "línea fina, antebrazo, chico, negro" sí — y esa diferencia es la que
// convierte una foto en un brief que un artista puede responder con un precio.
// Ver ADR-020.
//
// Es la ÚNICA parte de MESH que usa un modelo de IA, y adrede es angosta:
// interpreta lo que alguien subió, no decide a quién le mostramos ni en qué
// orden. El motor de matching (`packages/domain/src/matching`) sigue siendo
// puro y determinístico — esta función solo traduce una imagen a un slug de
// una lista cerrada, o a `null` si no reconoce nada. Ver ADR-011 y CLAUDE.md
// (Innegociable 1, reescrito para esta excepción).
//
// Por qué es una Edge Function y no una llamada desde el cliente: la clave de
// Anthropic es un secreto de servidor. Nunca puede tocar el bundle de la app
// — eso la expondría a cualquiera que abra el inspector de red.
//
// Por qué el vocabulario es cerrado y no texto libre: la respuesta tiene que
// poder aparecer como razón de match ("Marcaste varios trabajos de línea
// fina"), y esas plantillas están escritas contra los slugs reales de
// `styles`. Un modelo que devuelve texto libre podría inventar un estilo que
// no existe — el `tool_choice` forzado abajo hace eso imposible: la única
// forma de responder es eligiendo de la lista que le mandamos.
//
// Y por qué **todo puede volver `null`**: una foto de un diseño en papel no
// tiene zona del cuerpo, y ninguna foto tiene escala. Un modelo que adivine
// "mediano" porque hay que contestar algo estaría inventando un dato sobre el
// cuerpo de una persona — el innegociable 2, en la superficie donde más fácil
// se rompe. La lista de rasgos sale de la tabla `traits`, así que otro rubro
// con otras dimensiones no toca este archivo.

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

// Modelo chico y rápido: esto es una clasificación cerrada contra ~15
// opciones, no una conversación. No hace falta el modelo más grande.
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_VERSION = '2023-06-01'

// Mismo tope que `MAX_UPLOAD_BYTES` en packages/domain/src/storage/paths.ts.
// Deno no importa ese paquete sin empaquetarlo aparte, así que el número se
// repite acá — si uno cambia, cambia el otro.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface ReadRequest {
  readonly image: string
  readonly mimeType: string
  readonly categorySlug: string
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// La barrera que valida cada slug contra la lista que entró vive en
// `_shared/vocabulary.ts`: la comparte con el asistente de ADR-021, y dos copias
// de una barrera de seguridad es una barrera que algún día se arregla en un
// solo lado.

/**
 * Qué le pedimos al modelo por cada dimensión.
 *
 * Las CLAVES son el enum `trait_dimension` de Postgres, que es cerrado y
 * genérico; los VALORES de cada dimensión salen de la tabla `traits`, o sea de
 * la categoría. Por eso otro rubro no toca este archivo salvo que invente una
 * dimensión nueva, que además sería un cambio de esquema.
 *
 * Cada pista dice **cuándo contestar `null`**, y eso es lo que más importa: sin
 * esa instrucción el modelo elige el valor más parecido, porque hay que
 * contestar algo.
 */
const DIMENSION_HINTS: Record<string, string> = {
  body_area:
    '¿En qué parte del cuerpo está o iría el tatuaje? Devolvé null si la imagen es un diseño en papel o digital, o si no se ve suficiente cuerpo para saberlo. No adivines por el encuadre.',
  size: '¿De qué tamaño es? Devolvé null salvo que la imagen dé una referencia real de escala — el tatuaje sobre una parte del cuerpo reconocible, o un objeto al lado. Una foto sola no tiene escala, y un tamaño inventado le cambia el precio a alguien.',
  palette:
    '¿Con qué paleta está hecho? Negro sólido, negro y gris con degradados, o color. Devolvé null si la imagen es en blanco y negro por la foto y no por el tatuaje.',
}

export function buildReadingTool(
  styleSlugs: readonly string[],
  traitsByDimension: Readonly<Record<string, readonly string[]>>,
) {
  const properties: Record<string, unknown> = {
    style_slug: {
      type: ['string', 'null'],
      enum: [...styleSlugs, null],
      description:
        'El estilo de tatuaje que mejor describe la imagen. null si no muestra claramente ninguno de estos, o si no es una referencia de tatuaje.',
    },
  }

  for (const [dimension, slugs] of Object.entries(traitsByDimension)) {
    properties[dimension] = {
      type: ['string', 'null'],
      enum: [...slugs, null],
      description:
        DIMENSION_HINTS[dimension] ??
        `Elegí el valor de ${dimension} que corresponda, o null.`,
    }
  }

  return {
    name: 'read_reference',
    description:
      'Leé la imagen de referencia y describila con el vocabulario dado. Contestá null en cualquier campo que la imagen no permita saber con seguridad — es preferible un campo vacío que un dato inventado, porque cada uno de estos cambia a qué artista le llega el pedido y cuánto le cobran.',
    input_schema: {
      type: 'object',
      properties,
      required: Object.keys(properties),
    },
  }
}

Deno.serve(
  withLogging('read-reference', async (req, requestId) => {
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

    // Cliente con el JWT de quien llama, no con la service key: las políticas
    // de `styles`/`categories` (lectura pública de lo activo) alcanzan, y así
    // esta función nunca tiene más acceso a la base que la propia persona.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user == null) {
      return jsonResponse({ error: 'sesión inválida' }, 401)
    }

    let body: ReadRequest
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'cuerpo inválido' }, 400)
    }

    if (
      typeof body.image !== 'string' ||
      body.image.length === 0 ||
      typeof body.mimeType !== 'string' ||
      typeof body.categorySlug !== 'string'
    ) {
      return jsonResponse({ error: 'faltan campos' }, 400)
    }

    if (!ALLOWED_MIME_TYPES.has(body.mimeType)) {
      return jsonResponse({ error: 'tipo de imagen no soportado' }, 400)
    }

    // Tamaño en base64 ≈ 4/3 del tamaño real — el chequeo es conservador.
    if (body.image.length > (MAX_IMAGE_BYTES * 4) / 3) {
      return jsonResponse({ error: 'imagen demasiado grande' }, 413)
    }

    // El vocabulario sale de la base, así que la lista que ve el modelo es
    // exactamente la que la pantalla del brief le va a ofrecer a la persona para
    // corregir.
    const vocabulary = await fetchVocabulary(supabase, body.categorySlug)
    if (vocabulary == null) {
      return jsonResponse({ error: 'no hay estilos para esa categoría' }, 400)
    }

    const { styleSlugs, styleList, traitsByDimension } = vocabulary
    const tool = buildReadingTool(styleSlugs, traitsByDimension)

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
          max_tokens: 256,
          tools: [tool],
          tool_choice: { type: 'tool', name: tool.name },
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: body.mimeType,
                    data: body.image,
                  },
                },
                {
                  type: 'text',
                  text: [
                    `Estilos posibles:\n${styleList}`,
                    ...Object.entries(traitsByDimension).map(
                      ([dimension, slugs]) =>
                        `${dimension} posibles:\n${slugs.join('\n')}`,
                    ),
                    'Describí esta imagen con ese vocabulario. Dejá en null todo lo que la imagen no permita saber.',
                  ].join('\n\n'),
                },
              ],
            },
          ],
        }),
      })
    } catch {
      logLine({
        fn: 'read-reference',
        event: 'upstream_unreachable',
        request_id: requestId,
      })
      return jsonResponse({ error: 'no se pudo clasificar' }, 502)
    }

    if (!anthropicResponse.ok) {
      // **El bug del `tool_choice` habría durado horas y no días** si esta línea
      // hubiera existido: la API devolvía 400 por un nombre de herramienta que no
      // existía, y desde afuera se veía "no se pudo clasificar".
      logLine({
        fn: 'read-reference',
        event: 'upstream_error',
        upstream_status: anthropicResponse.status,
        request_id: requestId,
      })
      return jsonResponse({ error: 'no se pudo clasificar' }, 502)
    }

    const payload = await anthropicResponse.json()
    const toolUse = (
      payload.content as Array<Record<string, unknown>> | undefined
    )?.find((block) => block['type'] === 'tool_use')

    const input =
      (toolUse?.['input'] as Record<string, unknown> | undefined) ?? {}

    // Segunda barrera, dimensión por dimensión: nada sale de acá que no estuviera
    // en la lista que entró. `styleSlug` conserva su nombre en la respuesta
    // porque es el mismo dato de siempre.
    const styleSlug = resolveSlug(input['style_slug'], styleSlugs)
    const readTraits = resolveTraits(input, traitsByDimension)

    logLine({
      fn: 'read-reference',
      event: 'read',
      request_id: requestId,
    })

    return jsonResponse({ styleSlug, traits: readTraits }, 200)
  }),
)
