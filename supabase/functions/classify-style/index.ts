// Clasifica una foto de referencia contra la taxonomía de estilos.
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

import { createClient } from 'jsr:@supabase/supabase-js@2'

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

interface ClassifyRequest {
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

/**
 * Valida que el slug que devolvió el modelo sea uno de los que le ofrecimos.
 *
 * Es una segunda barrera después del `tool_choice` forzado — si algo raro
 * pasa (una versión de API distinta, un cambio de comportamiento del
 * modelo), esto nunca deja pasar un estilo inventado.
 */
export function resolveClassifiedSlug(
  raw: unknown,
  knownSlugs: readonly string[],
): string | null {
  if (typeof raw !== 'string') return null
  return knownSlugs.includes(raw) ? raw : null
}

export function buildClassificationTool(styleSlugs: readonly string[]) {
  return {
    name: 'classify_style',
    description:
      'Elegí el estilo de tatuaje que mejor describe la imagen, de la lista dada. Si la imagen no muestra claramente ninguno de estos estilos, o no es una referencia de tatuaje, devolvé null — no elijas el más parecido a la fuerza.',
    input_schema: {
      type: 'object',
      properties: {
        style_slug: {
          type: ['string', 'null'],
          enum: [...styleSlugs, null],
        },
      },
      required: ['style_slug'],
    },
  }
}

Deno.serve(async (req) => {
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

  let body: ClassifyRequest
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

  const { data: styles, error: stylesError } = await supabase
    .from('styles')
    .select('slug, aliases, categories!inner(slug, is_active)')
    .eq('categories.slug', body.categorySlug)
    .eq('categories.is_active', true)
    .eq('is_active', true)

  if (stylesError != null || styles == null || styles.length === 0) {
    return jsonResponse({ error: 'no hay estilos para esa categoría' }, 400)
  }

  const styleSlugs = styles.map((row) => String(row.slug))

  const tool = buildClassificationTool(styleSlugs)
  const styleList = styles
    .map((row) => {
      const aliases = (row.aliases as string[] | null) ?? []
      return aliases.length > 0
        ? `${String(row.slug)} (también: ${aliases.join(', ')})`
        : String(row.slug)
    })
    .join('\n')

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
        tool_choice: { type: 'tool', name: 'classify_style' },
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
                text: `Estilos de tatuaje posibles:\n${styleList}\n\n¿Cuál describe mejor esta imagen?`,
              },
            ],
          },
        ],
      }),
    })
  } catch {
    return jsonResponse({ error: 'no se pudo clasificar' }, 502)
  }

  if (!anthropicResponse.ok) {
    return jsonResponse({ error: 'no se pudo clasificar' }, 502)
  }

  const payload = await anthropicResponse.json()
  const toolUse = (
    payload.content as Array<Record<string, unknown>> | undefined
  )?.find((block) => block['type'] === 'tool_use')

  const rawSlug = (toolUse?.['input'] as Record<string, unknown> | undefined)?.[
    'style_slug'
  ]

  const styleSlug = resolveClassifiedSlug(rawSlug, styleSlugs)

  return jsonResponse({ styleSlug }, 200)
})
