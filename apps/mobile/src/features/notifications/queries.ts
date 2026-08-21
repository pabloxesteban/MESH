/**
 * La bandeja de avisos.
 *
 * **No hay forma de crear un aviso desde acá, y es a propósito.** La tabla no
 * le da INSERT al cliente: un aviso es la consecuencia de un hecho que ocurrió
 * en otra tabla, no algo que alguien decide mandar. Los escriben tres triggers.
 *
 * Y tampoco hay texto que leer: cada fila trae un tipo y una referencia, y la
 * frase la arma la pantalla con i18n. Ver ADR-027.
 */

import { supabase } from '../../data/supabase.ts'

export type NotificationKind =
  'report_reviewed' | 'appointment_scheduled' | 'appointment_cancelled'

export type ReportOutcome = 'actioned' | 'dismissed'

export interface Notification {
  readonly id: string
  readonly kind: NotificationKind
  /** Cómo terminó la denuncia. Solo con `report_reviewed`. */
  readonly outcome: ReportOutcome | null
  readonly createdAt: string
  readonly read: boolean
}

/** Cuántos avisos trae la bandeja. Más que esto es historia, no bandeja. */
const MAX = 30

export async function fetchNotifications(): Promise<readonly Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, outcome, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(MAX)
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as NotificationKind,
    outcome: (row.outcome as ReportOutcome | null) ?? null,
    createdAt: row.created_at,
    read: row.read_at != null,
  }))
}

/**
 * Marca leído todo lo pendiente.
 *
 * Por RPC: si el cliente pudiera hacer UPDATE sobre la tabla, podría reescribir
 * `kind` y hacerse aparecer un aviso que no ocurrió.
 */
export async function markNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc('mark_notifications_read')
  if (error != null) throw error
}

/** Sacar uno de la bandeja. Es suya. */
export async function dismissNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error != null) throw error
}
