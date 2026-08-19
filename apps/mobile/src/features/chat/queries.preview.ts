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
  markPreviewConversationRead,
} from '../../../preview/store.ts'
import type { ChatMessage, ConversationSummary } from './queries.ts'

export async function fetchConversations(): Promise<
  readonly ConversationSummary[]
> {
  return previewConversations().map((conversation) => {
    const artist = artistBySlug(conversation.professionalSlug)
    return {
      id: conversation.id,
      professionalId: conversation.professionalSlug,
      professionalSlug: conversation.professionalSlug,
      professionalName: artist?.displayName ?? conversation.professionalSlug,
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
  professionalSlug: string,
): Promise<string> {
  return openPreviewConversation(professionalSlug)
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
