/**
 * Denunciar y bloquear, contra la base.
 *
 * Dos cosas que este módulo NO puede hacer, y las dos son a propósito:
 *
 * - **No puede saber si a vos te bloquearon.** `blocks` se lee solo del lado de
 *   quien bloqueó. Un bloqueo detectable es un bloqueo que se responde, y
 *   responder es lo que la persona quiso evitar.
 * - **No puede cambiarle el estado a una denuncia.** Eso lo hace el equipo con
 *   la service key. Desde acá una denuncia se crea y, mientras nadie la haya
 *   mirado, se retira.
 *
 * Ver ADR-023.
 */

import { supabase } from '../../data/supabase.ts'

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'impersonation'
  | 'stolen_work'
  | 'explicit'
  | 'off_platform'
  | 'other'

/** Qué se denuncia. Cada variante lleva el id de lo suyo y nada más. */
export type ReportTarget =
  | { kind: 'professional'; professionalId: string }
  | { kind: 'artwork'; portfolioItemId: string }
  | { kind: 'review'; reviewId: string }
  | { kind: 'message'; messageId: string }
  | { kind: 'assistant'; assistantTurnId: string }

/** Los motivos que se ofrecen, en el orden en que se muestran. */
export const REPORT_REASONS: readonly ReportReason[] = [
  'stolen_work',
  'impersonation',
  'harassment',
  'explicit',
  'spam',
  'off_platform',
  'other',
]

function targetColumns(target: ReportTarget): Record<string, string> {
  switch (target.kind) {
    case 'professional':
      return { professional_id: target.professionalId }
    case 'artwork':
      return { portfolio_item_id: target.portfolioItemId }
    case 'review':
      return { review_id: target.reviewId }
    case 'message':
      return { message_id: target.messageId }
    case 'assistant':
      return { assistant_turn_id: target.assistantTurnId }
  }
}

export class AlreadyReportedError extends Error {}

/**
 * Manda una denuncia.
 *
 * `23505` es "ya denunciaste esto": la base tiene un índice único por persona y
 * por cosa. Se traduce a un error propio en vez de dejarlo pasar como un fallo
 * genérico, porque la pantalla tiene algo distinto que decir — y porque
 * denunciar dos veces no lo hace más urgente.
 */
export async function sendReport(input: {
  userId: string
  target: ReportTarget
  reason: ReportReason
  note: string | null
}): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_user_id: input.userId,
    target_kind: input.target.kind,
    reason: input.reason,
    note: input.note,
    ...targetColumns(input.target),
  })

  if (error != null) {
    if (error.code === '23505') throw new AlreadyReportedError(error.message)
    throw error
  }
}

export interface BlockedProfessional {
  readonly blockId: string
  readonly professionalId: string
  readonly slug: string
  readonly displayName: string
}

/** A quién bloqueó esta persona. Solo su propio lado de la tabla. */
export async function fetchBlockedProfessionals(): Promise<
  readonly BlockedProfessional[]
> {
  const { data, error } = await supabase
    .from('blocks')
    .select(
      'id, blocked_professional_id, professionals!inner(slug, display_name)',
    )
    .not('blocked_professional_id', 'is', null)
    .order('created_at', { ascending: false })
  if (error != null) throw error

  return (data ?? []).map((row) => {
    const pro = row.professionals as unknown as {
      slug: string
      display_name: string
    }
    return {
      blockId: row.id,
      professionalId: String(row.blocked_professional_id),
      slug: pro.slug,
      displayName: pro.display_name,
    }
  })
}

/** Si esta persona bloqueó a este perfil. No dice nada de la otra dirección. */
export async function isProfessionalBlocked(
  professionalId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocked_professional_id', professionalId)
    .limit(1)
    .maybeSingle()
  if (error != null) throw error
  return data != null
}

export async function blockProfessional(
  userId: string,
  professionalId: string,
): Promise<void> {
  const { error } = await supabase.from('blocks').insert({
    blocker_user_id: userId,
    blocked_professional_id: professionalId,
  })
  if (error != null && error.code !== '23505') throw error
}

/**
 * El artista bloquea a una persona.
 *
 * Solo funciona con alguien con quien ya habló: la política lo exige, porque
 * sin eso un uuid adivinado alcanzaría para saber si esa persona existe.
 */
export async function blockUser(
  userId: string,
  blockedUserId: string,
): Promise<void> {
  const { error } = await supabase.from('blocks').insert({
    blocker_user_id: userId,
    blocked_user_id: blockedUserId,
  })
  if (error != null && error.code !== '23505') throw error
}

/** Desbloquear es borrar. */
export async function unblock(blockId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('id', blockId)
  if (error != null) throw error
}

/** Desbloquear desde el perfil, donde no se conoce el id del bloqueo. */
export async function unblockProfessional(
  professionalId: string,
): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocked_professional_id', professionalId)
  if (error != null) throw error
}
