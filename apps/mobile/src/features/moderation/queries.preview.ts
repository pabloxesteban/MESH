/**
 * Moderación en el preview: en memoria, sin red.
 *
 * El bloqueo del preview **no** esconde a nadie de las grillas, y eso es una
 * mentira honesta que conviene tener escrita: en la app el filtro lo hace la
 * base, dentro de `get_artist_grid` y `get_discovery_feed`. Acá alcanza con
 * poder ver el botón, el estado bloqueado y la lista de Perfil.
 */

import type {
  BlockedProfessional,
  ReportReason,
  ReportTarget,
} from './queries.ts'

export class AlreadyReportedError extends Error {}

const denunciados = new Set<string>()
const bloqueados = new Map<string, BlockedProfessional>()

function claveDe(target: ReportTarget): string {
  switch (target.kind) {
    case 'professional':
      return `professional:${target.professionalId}`
    case 'artwork':
      return `artwork:${target.portfolioItemId}`
    case 'review':
      return `review:${target.reviewId}`
    case 'message':
      return `message:${target.messageId}`
    case 'assistant':
      return `assistant:${target.assistantTurnId}`
  }
}

export const REPORT_REASONS: readonly ReportReason[] = [
  'stolen_work',
  'impersonation',
  'harassment',
  'explicit',
  'spam',
  'off_platform',
  'other',
]

export async function sendReport(input: {
  userId: string
  target: ReportTarget
  reason: ReportReason
  note: string | null
}): Promise<void> {
  const clave = claveDe(input.target)
  if (denunciados.has(clave)) {
    throw new AlreadyReportedError('ya denunciado')
  }
  denunciados.add(clave)
}

export async function fetchBlockedProfessionals(): Promise<
  readonly BlockedProfessional[]
> {
  return [...bloqueados.values()]
}

export async function isProfessionalBlocked(
  professionalId: string,
): Promise<boolean> {
  return bloqueados.has(professionalId)
}

export async function blockProfessional(
  _userId: string,
  professionalId: string,
): Promise<void> {
  bloqueados.set(professionalId, {
    blockId: `preview-block-${professionalId}`,
    professionalId,
    slug: professionalId.replace('preview-professional-', ''),
    displayName: 'Perfil bloqueado',
  })
}

export async function blockUser(
  _userId: string,
  _blockedUserId: string,
): Promise<void> {
  // En el preview hay una sola persona, así que bloquearla no tiene a nadie del
  // otro lado. Existe para que la pantalla del artista no se rompa.
}

export async function unblock(blockId: string): Promise<void> {
  for (const [id, bloqueo] of bloqueados) {
    if (bloqueo.blockId === blockId) bloqueados.delete(id)
  }
}

export async function unblockProfessional(
  professionalId: string,
): Promise<void> {
  bloqueados.delete(professionalId)
}
