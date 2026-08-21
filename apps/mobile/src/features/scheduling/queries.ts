/**
 * El almanaque, contra la base.
 *
 * Tres cosas distintas viven acá y conviene no confundirlas:
 *
 * - **El horario** (`availability_rules` / `availability_exceptions`) lo escribe
 *   el artista y lo lee cualquiera: es lo que la persona viene a mirar antes de
 *   escribirle.
 * - **Los huecos ocupados** salen de `get_busy_slots()`, que devuelve desde y
 *   hasta y nada más. Ver el almanaque no es ver la agenda.
 * - **Los turnos** los ven las dos partes y nadie más.
 *
 * Ver ADR-018.
 */

import { scheduleErrorOf, type ScheduleError } from './errors.ts'
import { supabase } from '../../data/supabase.ts'

export interface WeeklyRule {
  readonly id: string
  readonly weekday: number
  /** 'HH:MM', como lo guarda Postgres en un `time`. */
  readonly startsAt: string
  readonly endsAt: string
}

export interface DayException {
  readonly id: string
  readonly onDate: string
  readonly isOpen: boolean
  readonly startsAt: string | null
  readonly endsAt: string | null
}

export interface BusySlot {
  readonly startsAt: string
  readonly endsAt: string
}

export interface Appointment {
  readonly id: string
  readonly startsAt: string
  readonly endsAt: string
  readonly status: 'scheduled' | 'cancelled'
  readonly note: string | null
  readonly professionalId: string
  readonly conversationId: string | null
}

/** `time` de Postgres llega como 'HH:MM:SS'. La app trabaja con 'HH:MM'. */
function toHm(value: string): string {
  return value.slice(0, 5)
}

export async function fetchWeeklyRules(
  professionalId: string,
): Promise<readonly WeeklyRule[]> {
  const { data, error } = await supabase
    .from('availability_rules')
    .select('id, weekday, starts_at, ends_at')
    .eq('professional_id', professionalId)
    .order('weekday')
    .order('starts_at')
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    weekday: row.weekday,
    startsAt: toHm(row.starts_at),
    endsAt: toHm(row.ends_at),
  }))
}

export async function addWeeklyRule(
  professionalId: string,
  weekday: number,
  startsAt: string,
  endsAt: string,
): Promise<void> {
  const { error } = await supabase.from('availability_rules').insert({
    professional_id: professionalId,
    weekday,
    starts_at: startsAt,
    ends_at: endsAt,
  })
  // 23505 es el unique: ese tramo ya estaba. Cargarlo dos veces es cargarlo
  // una vez, y no hay nada que avisarle a nadie.
  if (error != null && error.code !== '23505') throw error
}

export async function removeWeeklyRule(id: string): Promise<void> {
  const { error } = await supabase
    .from('availability_rules')
    .delete()
    .eq('id', id)
  if (error != null) throw error
}

export async function fetchExceptions(
  professionalId: string,
  fromDate: string,
): Promise<readonly DayException[]> {
  const { data, error } = await supabase
    .from('availability_exceptions')
    .select('id, on_date, is_open, starts_at, ends_at')
    .eq('professional_id', professionalId)
    .gte('on_date', fromDate)
    .order('on_date')
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    onDate: row.on_date,
    isOpen: row.is_open,
    startsAt: row.starts_at == null ? null : toHm(row.starts_at),
    endsAt: row.ends_at == null ? null : toHm(row.ends_at),
  }))
}

/** Cerrar un día suelto. Abrir uno con otro horario usa la misma tabla. */
export async function closeDay(
  professionalId: string,
  onDate: string,
): Promise<void> {
  const { error } = await supabase.from('availability_exceptions').insert({
    professional_id: professionalId,
    on_date: onDate,
    is_open: false,
  })
  if (error != null && error.code !== '23505') throw error
}

export async function removeException(id: string): Promise<void> {
  const { error } = await supabase
    .from('availability_exceptions')
    .delete()
    .eq('id', id)
  if (error != null) throw error
}

export async function fetchBusySlots(
  professionalId: string,
  from: Date,
  to: Date,
): Promise<readonly BusySlot[]> {
  const { data, error } = await supabase.rpc('get_busy_slots', {
    p_professional_id: professionalId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  })
  if (error != null) throw error
  return (data ?? []).map((row) => ({
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }))
}

/** Los turnos de quien pregunta: los suyos como cliente, o los de su agenda. */
export async function fetchAppointments(): Promise<readonly Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(
      'id, starts_at, ends_at, status, note, professional_id, conversation_id',
    )
    .eq('status', 'scheduled')
    .order('starts_at')
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    note: row.note,
    professionalId: row.professional_id,
    conversationId: row.conversation_id,
  }))
}

export { scheduleErrorOf, type ScheduleError }

export async function scheduleAppointment(
  conversationId: string,
  startsAt: Date,
  endsAt: Date,
  note: string | null,
): Promise<{ ok: true } | { ok: false; reason: ScheduleError }> {
  const { error } = await supabase.rpc('schedule_appointment', {
    p_conversation_id: conversationId,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
    ...(note == null ? {} : { p_note: note }),
  })
  if (error != null) return { ok: false, reason: scheduleErrorOf(error.code) }
  return { ok: true }
}

export async function cancelAppointment(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_appointment', {
    p_appointment_id: id,
  })
  if (error != null) throw error
}

/**
 * El id del perfil profesional de esta conversación, si quien pregunta ES su
 * dueño. `null` para el cliente.
 *
 * Es lo que decide si aparece el botón de dar un turno, y por eso se resuelve
 * contra la base y no con lo que la pantalla creía saber: el turno lo asigna
 * quien tiene la agenda, y "quien tiene la agenda" es un hecho de la fila del
 * profesional, no del modo en que la persona se registró.
 *
 * Si el botón igual apareciera por un error acá, agendar seguiría fallando con
 * un 42501: `schedule_appointment` deriva el profesional de la conversación y
 * verifica el dueño. Esto es para que la pantalla no ofrezca lo que la base va
 * a rechazar.
 */
export async function fetchOwnProfessionalForConversation(
  conversationId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('professional_id, professionals ( owner_user_id )')
    .eq('id', conversationId)
    .maybeSingle()
  if (error != null) throw error
  if (data == null) return null

  const owner = (data.professionals as { owner_user_id: string | null } | null)
    ?.owner_user_id
  return owner === userId ? data.professional_id : null
}

/** Un turno que viene, con el nombre de la otra parte. */
export interface AgendaEntry {
  readonly id: string
  readonly startsAt: string
  readonly endsAt: string
  readonly note: string | null
  readonly conversationId: string | null
  readonly professionalId: string
  /** De qué lado mira quien pregunta. Lo dice la base, no lo adivina la pantalla. */
  readonly viewerIsProfessional: boolean
  /** Nombre para mostrar de la otra parte. `null` si no puso ninguno. */
  readonly counterpartName: string | null
}

/**
 * Los turnos propios que vienen, de cualquiera de los dos lados.
 *
 * Es lo que faltaba de ADR-018: hasta acá cada turno vivía adentro de la
 * conversación de la que salió, y alguien con cinco tenía que abrir cinco chats
 * para saber cómo venía su semana.
 *
 * Va por RPC y no por `from('appointments')` porque hace falta el nombre de la
 * otra parte, y `profiles` está cerrado a la fila propia. Con un turno
 * confirmado esa excepción se abre — y solo ahí.
 */
export async function fetchAgenda(): Promise<readonly AgendaEntry[]> {
  const { data, error } = await supabase.rpc('get_my_appointments')
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    note: row.note,
    conversationId: row.conversation_id,
    professionalId: row.professional_id,
    viewerIsProfessional: row.viewer_is_professional,
    counterpartName: row.counterpart_name,
  }))
}
