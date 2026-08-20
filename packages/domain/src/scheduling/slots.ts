/**
 * Los huecos libres de un día.
 *
 * La disponibilidad de un artista **no se guarda como casilleros**: se guarda
 * como reglas, y los huecos se calculan. Ver ADR-018. Este archivo es ese
 * cálculo, y está acá —puro, sin base de datos, sin React— porque es donde se
 * puede testear de verdad: la mitad de los errores de una agenda son de bordes
 * (el turno que empieza justo cuando termina otro, el día que la excepción
 * pisa la regla) y esos no se ven mirando una pantalla.
 *
 * Todo se maneja en **minutos desde la medianoche local del artista**. Es
 * deliberado: mezclar zonas horarias en el cálculo es cómo un turno de las 14
 * termina mostrándose a las 11.
 */

/** Un tramo, en minutos desde la medianoche. `[start, end)`. */
export interface Span {
  readonly start: number
  readonly end: number
}

export interface AvailabilityRule {
  /** 0 = domingo, como `extract(dow)` de Postgres. */
  readonly weekday: number
  readonly start: number
  readonly end: number
}

export interface AvailabilityException {
  readonly isOpen: boolean
  readonly start: number | null
  readonly end: number | null
}

/**
 * Los tramos en los que el artista trabaja ese día.
 *
 * **Una excepción reemplaza a la regla, no la complementa.** Si alguien marcó
 * un día, ese día es lo que dijo la excepción — cerrado, o el horario que
 * puso. Sumarlas dejaría "cerrado" sin efecto cuando además hay una regla, que
 * es justo el caso para el que se marca un día.
 */
export function openSpans(
  rules: readonly AvailabilityRule[],
  exceptions: readonly AvailabilityException[],
  weekday: number,
): readonly Span[] {
  if (exceptions.length > 0) {
    return merge(
      exceptions
        .filter((e) => e.isOpen && e.start != null && e.end != null)
        .map((e) => ({ start: e.start as number, end: e.end as number })),
    )
  }

  return merge(
    rules
      .filter((rule) => rule.weekday === weekday)
      .map((rule) => ({ start: rule.start, end: rule.end })),
  )
}

/**
 * Lo que queda libre después de sacar lo ocupado.
 *
 * Los tramos ocupados pueden venir en cualquier orden y solaparse entre sí —
 * no es tarea de quien llama normalizarlos.
 */
export function freeSpans(
  open: readonly Span[],
  busy: readonly Span[],
): readonly Span[] {
  const ocupado = merge(busy)
  const libres: Span[] = []

  for (const tramo of open) {
    let desde = tramo.start
    for (const tomado of ocupado) {
      if (tomado.end <= desde || tomado.start >= tramo.end) continue
      if (tomado.start > desde) libres.push({ start: desde, end: tomado.start })
      desde = Math.max(desde, tomado.end)
    }
    if (desde < tramo.end) libres.push({ start: desde, end: tramo.end })
  }

  return libres
}

/**
 * Los comienzos posibles de un turno de `duration` minutos.
 *
 * Se avanza de a `step` y **solo entra el turno que cabe entero**: ofrecer un
 * comienzo a las 19:45 para algo de una hora, en un tramo que cierra a las 20,
 * es ofrecer un turno que no existe.
 */
export function slotStarts(
  free: readonly Span[],
  duration: number,
  step: number,
): readonly number[] {
  if (duration <= 0 || step <= 0) return []

  const comienzos: number[] = []
  for (const tramo of free) {
    // Se alinea a la grilla del paso para que los horarios ofrecidos no
    // dependan de dónde terminó el turno anterior: si no, un tramo que arranca
    // a las 15:07 ofrecería las 15:07, las 15:37, las 16:07.
    const primero = Math.ceil(tramo.start / step) * step
    for (let t = primero; t + duration <= tramo.end; t += step) {
      comienzos.push(t)
    }
  }
  return comienzos
}

/** Une tramos que se tocan o se pisan, y los ordena. */
function merge(spans: readonly Span[]): readonly Span[] {
  const validos = spans
    .filter((s) => s.end > s.start)
    .slice()
    .sort((a, b) => a.start - b.start)

  // Mutable adentro y `readonly` afuera: `Span` es de solo lectura para quien
  // lo recibe, y unir tramos es justamente escribir.
  const unidos: { start: number; end: number }[] = []
  for (const span of validos) {
    const ultimo = unidos[unidos.length - 1]
    // `<=` y no `<`: dos tramos pegados —14 a 16 y 16 a 18— son uno solo de 14
    // a 18. Separados, `slotStarts` no ofrecería ningún turno que cruce las 16.
    if (ultimo != null && span.start <= ultimo.end) {
      ultimo.end = Math.max(ultimo.end, span.end)
    } else {
      unidos.push({ start: span.start, end: span.end })
    }
  }
  return unidos
}
