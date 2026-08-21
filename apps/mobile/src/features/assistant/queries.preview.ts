/**
 * El hilo del asistente en el preview: en memoria, sin red.
 *
 * Guarda los turnos de la persona para que la conversación se vea entera al
 * volver a entrar. Los del asistente los agrega `assistant.preview.ts`, porque
 * en la app de verdad los escribe el servidor y no este módulo — el preview
 * imita esa separación en vez de aplanarla.
 */

import type { AssistantTurn } from './queries.ts'

const hilos = new Map<string, AssistantTurn[]>()
let siguiente = 0

/** Fecha estable: en el preview no importa la hora, importa el orden. */
function ahora(index: number): string {
  return new Date(Date.UTC(2026, 7, 20, 12, index)).toISOString()
}

export function recordPreviewTurn(
  threadId: string,
  role: AssistantTurn['role'],
  body: string,
): void {
  const turnos = hilos.get(threadId) ?? []
  turnos.push({
    id: `preview-turn-${String(turnos.length)}-${threadId}`,
    role,
    body,
    createdAt: ahora(turnos.length),
  })
  hilos.set(threadId, turnos)
}

export async function startAssistantThread(
  _userId: string,
  _categorySlug = 'tattoo',
): Promise<string> {
  siguiente += 1
  const id = `preview-thread-${String(siguiente)}`
  hilos.set(id, [])
  return id
}

export async function fetchAssistantTurns(
  threadId: string,
): Promise<readonly AssistantTurn[]> {
  return hilos.get(threadId) ?? []
}

export async function deleteAssistantThread(threadId: string): Promise<void> {
  hilos.delete(threadId)
}

export async function attachThreadProject(
  _threadId: string,
  _projectId: string,
): Promise<void> {
  // El hilo y la búsqueda ya viven los dos en memoria: colgar uno del otro no
  // cambia nada de lo que el preview muestra.
}

export interface OwnBrief {
  readonly projectId: string
  readonly title: string
  readonly summary: string
  readonly styleSlug: string | null
  readonly traitSlugs: readonly string[]
}

/**
 * En el preview siempre hay un pedido, para poder mirar el botón del chat.
 *
 * Es el mismo que cierra el guion de `assistant.preview.ts`, con el tamaño
 * ausente: el estado que hay que poder ver es el pedido con huecos.
 */
export async function fetchOwnBrief(_userId: string): Promise<OwnBrief | null> {
  return {
    projectId: 'preview-project-brief',
    title: 'Línea fina en el antebrazo',
    summary:
      'Quiero algo de línea fina en el antebrazo, en negro. Es una idea simple, sin mucho relleno. Todavía no sé qué tamaño va a tener.',
    styleSlug: 'fine-line',
    traitSlugs: ['antebrazo', 'negro'],
  }
}
