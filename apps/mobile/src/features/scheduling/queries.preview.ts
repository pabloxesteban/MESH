/**
 * El almanaque en el preview: en memoria y sin red.
 *
 * Arranca vacío. Un preview con horarios ya cargados sería disponibilidad
 * inventada —justo lo que el innegociable 2 prohíbe— y además escondería la
 * mitad que importa mirar: el estado vacío del Estudio, que es lo primero que
 * ve un artista que llega.
 */

import {
  addPreviewRule,
  cancelPreviewAppointment,
  closePreviewDay,
  previewAppointments,
  previewBusySlots,
  previewConversationProfessional,
  previewExceptionsOf,
  previewOwnProfile,
  previewProfessionalId,
  previewRulesOf,
  removePreviewException,
  removePreviewRule,
  schedulePreviewAppointment,
} from '../../../preview/store.ts'

import type {
  Appointment,
  BusySlot,
  DayException,
  ScheduleError,
  WeeklyRule,
} from './queries.ts'

export { scheduleErrorOf } from './queries.ts'

export async function fetchWeeklyRules(
  professionalId: string,
): Promise<readonly WeeklyRule[]> {
  return previewRulesOf(professionalId).map((rule) => ({
    id: rule.id,
    weekday: rule.weekday,
    startsAt: rule.startsAt,
    endsAt: rule.endsAt,
  }))
}

export async function addWeeklyRule(
  professionalId: string,
  weekday: number,
  startsAt: string,
  endsAt: string,
): Promise<void> {
  addPreviewRule(professionalId, weekday, startsAt, endsAt)
}

export async function removeWeeklyRule(id: string): Promise<void> {
  removePreviewRule(id)
}

export async function fetchExceptions(
  professionalId: string,
  fromDate: string,
): Promise<readonly DayException[]> {
  return previewExceptionsOf(professionalId, fromDate).map((item) => ({
    id: item.id,
    onDate: item.onDate,
    isOpen: item.isOpen,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
  }))
}

export async function closeDay(
  professionalId: string,
  onDate: string,
): Promise<void> {
  closePreviewDay(professionalId, onDate)
}

export async function removeException(id: string): Promise<void> {
  removePreviewException(id)
}

export async function fetchBusySlots(
  professionalId: string,
  from: Date,
  to: Date,
): Promise<readonly BusySlot[]> {
  return previewBusySlots(
    professionalId,
    from.toISOString(),
    to.toISOString(),
  ).map((slot) => ({ startsAt: slot.startsAt, endsAt: slot.endsAt }))
}

export async function fetchAppointments(): Promise<readonly Appointment[]> {
  return previewAppointments().map((turno) => ({
    id: turno.id,
    startsAt: turno.startsAt,
    endsAt: turno.endsAt,
    status: 'scheduled' as const,
    note: turno.note,
    professionalId: turno.professionalId,
    conversationId: turno.conversationId,
  }))
}

export async function scheduleAppointment(
  conversationId: string,
  startsAt: Date,
  endsAt: Date,
  note: string | null,
): Promise<{ ok: true } | { ok: false; reason: ScheduleError }> {
  const profesional = previewConversationProfessional(conversationId)
  if (profesional == null) return { ok: false, reason: 'notYours' }

  const resultado = schedulePreviewAppointment(
    profesional,
    conversationId,
    startsAt.toISOString(),
    endsAt.toISOString(),
    note,
  )
  if (resultado === 'ok') return { ok: true }
  return { ok: false, reason: resultado }
}

export async function cancelAppointment(id: string): Promise<void> {
  cancelPreviewAppointment(id)
}

/**
 * En el preview el único perfil con dueño es el propio, así que dar un turno
 * requiere haber abierto un chat con vos mismo. Ver el comentario del
 * almanaque en `preview/store.ts`.
 */
export async function fetchOwnProfessionalForConversation(
  conversationId: string,
  _userId: string,
): Promise<string | null> {
  const profesional = previewConversationProfessional(conversationId)
  const own = previewOwnProfile()
  if (profesional == null || own == null) return null
  return profesional === previewProfessionalId(own.slug) ? profesional : null
}
