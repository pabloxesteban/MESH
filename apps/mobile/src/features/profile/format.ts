/**
 * Formateo de precio y fecha para la pantalla de perfil.
 *
 * Está aparte de la pantalla porque tiene reglas y las reglas se testean.
 *
 * **Un campo que falta no renderiza nada.** No hay "Precio: a consultar", ni
 * "Disponibilidad: desconocida", ni un guion. Un placeholder ocupa el lugar de
 * un dato y le enseña a la persona a leer ausencia como presencia.
 */

import { AVAILABILITY_STALE_DAYS, daysBetween } from '@mesh/domain'

/**
 * Precio en pesos, sin centavos.
 *
 * Los centavos existen en la base porque el dinero se guarda en enteros, pero
 * mostrarlos en un rango de tatuaje sería ruido: nadie cotiza $60.000,00.
 */
export function formatMoney(
  cents: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/** Fecha larga y legible. Una fecha ISO cruda en pantalla es un dato sin traducir. */
export function formatDate(iso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (match == null) return iso
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
}

/**
 * ¿La disponibilidad declarada sigue siendo afirmable?
 *
 * Después de 45 días el estado se muestra como "sin novedades desde…", no como
 * un hecho. Es la misma regla que aplica el motor de match, que directamente
 * omite el componente. MESH no afirma una disponibilidad que no puede sostener.
 */
export function isAvailabilityStale(updatedAt: string, today: string): boolean {
  const age = daysBetween(updatedAt, today)
  return age == null || age > AVAILABILITY_STALE_DAYS
}
