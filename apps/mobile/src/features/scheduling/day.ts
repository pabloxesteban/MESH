/**
 * De la base a los huecos de un día, y de vuelta.
 *
 * El cálculo puro vive en `packages/domain/src/scheduling/slots.ts`, que
 * trabaja en **minutos desde la medianoche** y no sabe nada de fechas ni de
 * `Date`. Este archivo es el puente: convierte lo que devuelve la base a esos
 * minutos, y los minutos elegidos de vuelta a un instante.
 *
 * Está separado a propósito. Mezclar zonas horarias con el cálculo es cómo un
 * turno de las 14 termina mostrándose a las 11, y con el puente afuera el
 * cálculo se puede testear sin una sola fecha.
 */

import {
  freeSpans,
  openSpans,
  slotStarts,
  type AvailabilityException,
  type AvailabilityRule,
  type Span,
} from '@mesh/domain'

import type { BusySlot, DayException, WeeklyRule } from './queries.ts'

/** 'HH:MM' → minutos desde la medianoche. */
export function toMinutes(hm: string): number {
  const [h, m] = hm.split(':')
  return Number(h ?? 0) * 60 + Number(m ?? 0)
}

/** Minutos desde la medianoche → 'HH:MM', con el cero adelante. */
export function toHm(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 'AAAA-MM-DD' de una fecha, en hora local. */
export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Un instante, a partir de un día y unos minutos desde su medianoche.
 *
 * `new Date(y, m, d, ...)` y no un string ISO: el constructor con números
 * interpreta en hora local, que es la del artista. Armar `'2026-08-25T14:00Z'`
 * a mano lo mandaría a UTC y el turno aparecería tres horas corrido.
 */
export function atMinutes(day: Date, minutes: number): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0,
  )
}

/**
 * Los horarios en que se puede empezar un turno ese día.
 *
 * Junta las tres fuentes: la regla semanal, las excepciones **de ese día**, y
 * lo que ya está tomado. Devuelve minutos desde la medianoche.
 */
export function freeStartsFor({
  day,
  rules,
  exceptions,
  busy,
  duration,
  step,
  now,
}: {
  day: Date
  rules: readonly WeeklyRule[]
  exceptions: readonly DayException[]
  busy: readonly BusySlot[]
  duration: number
  step: number
  now?: Date
}): readonly number[] {
  const fecha = isoDate(day)

  const reglas: AvailabilityRule[] = rules.map((rule) => ({
    weekday: rule.weekday,
    start: toMinutes(rule.startsAt),
    end: toMinutes(rule.endsAt),
  }))

  const delDia: AvailabilityException[] = exceptions
    .filter((e) => e.onDate === fecha)
    .map((e) => ({
      isOpen: e.isOpen,
      start: e.startsAt == null ? null : toMinutes(e.startsAt),
      end: e.endsAt == null ? null : toMinutes(e.endsAt),
    }))

  const abierto = openSpans(reglas, delDia, day.getDay())

  const tomado: Span[] = busy
    .map((slot) => ({
      start: minutesInDay(new Date(slot.startsAt), day),
      end: minutesInDay(new Date(slot.endsAt), day),
    }))
    .filter((span) => span.end > span.start)

  // El pasado del día de hoy también está tomado: ofrecer las 14 cuando son
  // las 17 es ofrecer un turno imposible.
  if (now != null && isoDate(now) === fecha) {
    tomado.push({ start: 0, end: now.getHours() * 60 + now.getMinutes() })
  }

  return slotStarts(freeSpans(abierto, tomado), duration, step)
}

/**
 * Dónde cae un instante dentro de un día, en minutos.
 *
 * Un turno puede empezar el día anterior y terminar en este —una sesión
 * larguísima, o un error de carga— así que se recorta al día en vez de
 * devolver un número negativo que después restaría mal.
 */
function minutesInDay(instant: Date, day: Date): number {
  const inicioDelDia = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
  ).getTime()
  const minutos = (instant.getTime() - inicioDelDia) / 60_000
  return Math.max(0, Math.min(24 * 60, minutos))
}
