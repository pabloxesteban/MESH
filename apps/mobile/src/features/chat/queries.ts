/**
 * El único lugar donde el chat habla con Supabase.
 *
 * Todo lo de acá está autorizado por RLS y no por estas funciones: un cliente
 * modificado que pida los mensajes de un hilo ajeno recibe cero filas, no un
 * error. Ver supabase/tests/45_conversations.sql.
 */

import { supabase } from '../../data/supabase.ts'

export interface ConversationSummary {
  readonly id: string
  readonly professionalId: string
  readonly professionalSlug: string
  readonly professionalName: string
  readonly lastMessageAt: string | null
  /** Hay algo escrito después de la última vez que esta persona lo abrió. */
  readonly hasUnread: boolean
}

interface ConversationRow {
  id: string
  professional_id: string
  last_message_at: string | null
  user_read_at: string | null
  professionals: { slug: string; display_name: string } | null
}

export async function fetchConversations(): Promise<
  readonly ConversationSummary[]
> {
  // Sin filtro por usuario: la política ya devuelve solo los hilos propios.
  const { data, error } = await supabase
    .from('conversations')
    .select(
      'id, professional_id, last_message_at, user_read_at, professionals ( slug, display_name )',
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error != null) throw error

  return ((data ?? []) as unknown as ConversationRow[]).map((row) => ({
    id: row.id,
    professionalId: row.professional_id,
    professionalSlug: row.professionals?.slug ?? '',
    professionalName: row.professionals?.display_name ?? '',
    lastMessageAt: row.last_message_at,
    // Sin `last_message_at` no hay nada escrito todavía, así que no hay nada
    // sin leer — un hilo recién abierto no se marca en rojo.
    hasUnread:
      row.last_message_at != null &&
      (row.user_read_at == null || row.user_read_at < row.last_message_at),
  }))
}

export interface ChatMessage {
  readonly id: string
  readonly senderUserId: string
  readonly body: string
  readonly createdAt: string
}

export async function fetchMessages(
  conversationId: string,
): Promise<readonly ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_user_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    senderUserId: row.sender_user_id,
    body: row.body,
    createdAt: row.created_at,
  }))
}

/**
 * Abre el hilo con este profesional, o devuelve el que ya existía.
 *
 * `upsert` con `ignoreDuplicates` y no un select-después-insert: entre las dos
 * consultas hay una ventana en la que dos toques seguidos crean dos filas, y
 * la restricción `unique (user_id, professional_id)` haría fallar al segundo
 * con un error que la pantalla tendría que interpretar.
 */
export async function openConversation(
  userId: string,
  professionalId: string,
): Promise<string> {
  const { error } = await supabase
    .from('conversations')
    .upsert(
      { user_id: userId, professional_id: professionalId },
      { onConflict: 'user_id,professional_id', ignoreDuplicates: true },
    )

  if (error != null) throw error

  const { data, error: readError } = await supabase
    .from('conversations')
    .select('id')
    .eq('professional_id', professionalId)
    .maybeSingle()

  if (readError != null) throw readError
  if (data == null) throw new Error('no se pudo abrir la conversación')

  return data.id
}

export async function sendMessage(
  conversationId: string,
  senderUserId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_user_id: senderUserId,
    body: body.trim(),
  })

  if (error != null) throw error
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  })
  if (error != null) throw error
}

/**
 * Avisa cuando llega un mensaje nuevo a este hilo.
 *
 * La publicación de realtime respeta RLS, así que solo llegan eventos de filas
 * que esta sesión ya podría leer. Devuelve la función para desuscribirse — sin
 * llamarla, cada visita a la pantalla deja un canal abierto.
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: () => void,
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => onMessage(),
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
