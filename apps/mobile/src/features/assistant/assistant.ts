/**
 * Hablar con el asistente.
 *
 * Un solo camino de salida —la Edge Function— y dos formas de respuesta, que
 * son las dos herramientas que el modelo puede usar: sigue preguntando, o cierra
 * el pedido. No hay una tercera, y eso es toda la garantía de ADR-021: el modelo
 * no contesta con un mensaje libre, contesta eligiendo una herramienta con los
 * slugs de la taxonomía real adentro.
 *
 * Acá no hay clave de Anthropic ni puede haberla. Vive como secreto de Edge
 * Function, igual que en `quick-search/classify.ts`.
 */

import { supabase } from '../../data/supabase.ts'

export class AssistantError extends Error {}

/** Un rasgo leído: dimensión y slug, los dos del vocabulario cerrado. */
export interface AssistantTrait {
  readonly dimension: string
  readonly slug: string
}

export interface AssistantQuestion {
  readonly kind: 'question'
  readonly question: string
  /**
   * Respuestas para tocar en vez de escribir.
   *
   * Son texto, no vocabulario: lo que la persona toque vuelve como un mensaje
   * suyo y se vuelve a interpretar. El vocabulario cerrado está del otro lado,
   * en el pedido, que es lo único que termina siendo un dato.
   */
  readonly options: readonly string[]
}

export interface AssistantBrief {
  readonly kind: 'brief'
  readonly title: string
  readonly summary: string
  readonly styleSlug: string | null
  readonly traits: readonly AssistantTrait[]
}

export type AssistantReply = AssistantQuestion | AssistantBrief

export async function sendToAssistant(input: {
  threadId: string
  message: string
  categorySlug?: string
}): Promise<AssistantReply> {
  const { data, error } = await supabase.functions.invoke('brief-assistant', {
    body: {
      threadId: input.threadId,
      message: input.message,
      categorySlug: input.categorySlug ?? 'tattoo',
    },
  })

  if (error != null) throw new AssistantError(error.message)

  // Se escribe suelto y se estrecha abajo. Un `Partial<AssistantBrief &
  // AssistantQuestion>` no sirve: los dos `kind` son literales distintos, así
  // que la intersección es `never` y todos los campos desaparecen.
  const payload = data as {
    kind?: string
    title?: string
    summary?: string
    styleSlug?: string | null
    traits?: readonly AssistantTrait[]
    question?: string
    options?: readonly string[]
  } | null

  if (payload?.kind === 'brief') {
    return {
      kind: 'brief',
      title: payload.title ?? '',
      summary: payload.summary ?? '',
      styleSlug: payload.styleSlug ?? null,
      traits: payload.traits ?? [],
    }
  }

  if (payload?.kind === 'question' && typeof payload.question === 'string') {
    return {
      kind: 'question',
      question: payload.question,
      options: payload.options ?? [],
    }
  }

  // Cualquier otra cosa es una respuesta que no entendemos. Se rompe fuerte en
  // vez de mostrar un hilo vacío que parece que el asistente se quedó callado.
  throw new AssistantError('respuesta inesperada')
}
