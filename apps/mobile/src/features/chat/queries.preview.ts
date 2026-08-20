/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * Los hilos viven en memoria. Lo que el preview NO prueba es lo único que
 * importa de seguridad —que nadie lea un hilo ajeno—, porque eso lo decide RLS
 * y acá no hay base. Está en supabase/tests/45_conversations.sql.
 */

import {
  addPreviewMessage,
  artistBySlug,
  openPreviewConversation,
  previewConversations,
  previewMessages,
  previewSlugOfProfessional,
  markPreviewConversationRead,
} from '../../../preview/store.ts'
import type { ChatMessage, ConversationSummary } from './queries.ts'

export async function fetchConversations(): Promise<
  readonly ConversationSummary[]
> {
  return previewConversations().map((conversation) => {
    // El hilo guarda el id; el slug sale de ahí. Buscar el artista con el id
    // devolvía `undefined` y la lista mostraba `preview-aguja-fina` donde va
    // un nombre.
    const slug = previewSlugOfProfessional(conversation.professionalId)
    const artist = artistBySlug(slug)
    return {
      id: conversation.id,
      professionalId: conversation.professionalId,
      professionalSlug: slug,
      professionalName: artist?.displayName ?? slug,
      lastMessageAt: conversation.lastMessageAt,
      hasUnread: conversation.hasUnread,
    }
  })
}

export async function fetchMessages(
  conversationId: string,
): Promise<readonly ChatMessage[]> {
  return previewMessages(conversationId)
}

export async function openConversation(
  _userId: string,
  professionalId: string,
): Promise<string> {
  return openPreviewConversation(professionalId)
}

export async function sendMessage(
  conversationId: string,
  senderUserId: string,
  body: string,
): Promise<void> {
  addPreviewMessage(conversationId, senderUserId, body.trim())
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  markPreviewConversationRead(conversationId)
}

export function subscribeToMessages(
  _conversationId: string,
  _onMessage: () => void,
): () => void {
  // No hay servidor que empuje nada: en el preview el único que escribe es
  // quien está mirando, y esa escritura ya refresca la lista.
  return () => undefined
}
