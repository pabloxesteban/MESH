/**
 * El asistente en el preview: un guion fijo, sin modelo y sin red.
 *
 * Tres preguntas y cierra. No es un modelo chico: es una lista, y lo dice — el
 * preview existe para poder recorrer la pantalla y mirar los estados, no para
 * evaluar qué tan bien conversa el asistente de verdad.
 *
 * El pedido que cierra sale con **el tamaño en null** a propósito, igual que
 * hace `classify.preview.ts` con la foto: el caso que hay que poder mirar es el
 * campo vacío con su explicación, no el camino feliz.
 */

import type { AssistantReply } from './assistant.ts'
import { recordPreviewTurn } from './queries.preview.ts'

export class AssistantError extends Error {}

const GUION: readonly AssistantReply[] = [
  {
    kind: 'question',
    question: '¿En qué parte del cuerpo lo pensás?',
    options: ['Antebrazo', 'Muñeca', 'Espalda', 'Todavía no sé'],
  },
  {
    kind: 'question',
    question: '¿Lo pensás en negro o con color?',
    options: ['Negro', 'Negro y gris', 'Color', 'No sé'],
  },
  {
    kind: 'brief',
    title: 'Línea fina en el antebrazo',
    summary:
      'Quiero algo de línea fina en el antebrazo, en negro. Es una idea simple, sin mucho relleno. Todavía no sé qué tamaño va a tener.',
    styleSlug: 'fine-line',
    traits: [
      { dimension: 'body_area', slug: 'antebrazo' },
      { dimension: 'palette', slug: 'negro' },
    ],
  },
]

const vueltas = new Map<string, number>()

export async function sendToAssistant(input: {
  threadId: string
  message: string
  categorySlug?: string
}): Promise<AssistantReply> {
  recordPreviewTurn(input.threadId, 'person', input.message)

  const vuelta = vueltas.get(input.threadId) ?? 0
  vueltas.set(input.threadId, vuelta + 1)

  const reply = GUION[Math.min(vuelta, GUION.length - 1)] as AssistantReply
  recordPreviewTurn(
    input.threadId,
    'assistant',
    reply.kind === 'question' ? reply.question : reply.summary,
  )

  return reply
}
