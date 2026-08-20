/**
 * Los huecos libres.
 *
 * Casi todos estos tests son de bordes, y es a propósito: una agenda falla en
 * los bordes. El turno que empieza justo cuando termina otro, el día que la
 * excepción pisa la regla, el hueco de cuarenta minutos donde alguien quiere
 * meter una hora. Ninguno se ve mirando una pantalla, y todos se ven cuando
 * alguien llega y hay otra persona sentada.
 */

import { describe, expect, it } from 'vitest'

import {
  freeSpans,
  openSpans,
  slotStarts,
  type AvailabilityRule,
} from './slots.ts'

/** 14:00 → 840. Escribir minutos a mano hace ilegibles los tests. */
const h = (hora: number, minutos = 0) => hora * 60 + minutos

const MARTES = 2
const TARDE: AvailabilityRule = { weekday: MARTES, start: h(14), end: h(20) }

describe('cuándo trabaja', () => {
  it('toma la regla del día que se pregunta, y ninguna otra', () => {
    const reglas = [TARDE, { weekday: 3, start: h(10), end: h(12) }]
    expect(openSpans(reglas, [], MARTES)).toEqual([{ start: h(14), end: h(20) }])
  })

  it('sin regla para ese día, no trabaja', () => {
    expect(openSpans([TARDE], [], 0)).toEqual([])
  })

  it('une dos tramos pegados en uno solo', () => {
    // Si quedaran separados, no se podría ofrecer ningún turno que cruce las
    // 16 — y para el artista ese día es un bloque continuo.
    const reglas = [
      { weekday: MARTES, start: h(14), end: h(16) },
      { weekday: MARTES, start: h(16), end: h(18) },
    ]
    expect(openSpans(reglas, [], MARTES)).toEqual([
      { start: h(14), end: h(18) },
    ])
  })

  it('respeta la siesta: dos tramos separados siguen siendo dos', () => {
    const reglas = [
      { weekday: MARTES, start: h(10), end: h(13) },
      { weekday: MARTES, start: h(16), end: h(20) },
    ]
    expect(openSpans(reglas, [], MARTES)).toHaveLength(2)
  })

  it('un día cerrado no abre, aunque la regla diga que sí', () => {
    // El caso que motiva que la excepción REEMPLACE en vez de sumarse. Si se
    // sumaran, marcar un feriado no serviría para nada.
    const cerrado = [{ isOpen: false, start: null, end: null }]
    expect(openSpans([TARDE], cerrado, MARTES)).toEqual([])
  })

  it('un día con horario propio pisa a la regla, no se suma', () => {
    const especial = [{ isOpen: true, start: h(9), end: h(11) }]
    expect(openSpans([TARDE], especial, MARTES)).toEqual([
      { start: h(9), end: h(11) },
    ])
  })
})

describe('qué queda libre', () => {
  const abierto = [{ start: h(14), end: h(20) }]

  it('sin nada tomado, todo el tramo', () => {
    expect(freeSpans(abierto, [])).toEqual(abierto)
  })

  it('un turno en el medio parte el tramo en dos', () => {
    expect(freeSpans(abierto, [{ start: h(16), end: h(17) }])).toEqual([
      { start: h(14), end: h(16) },
      { start: h(17), end: h(20) },
    ])
  })

  it('un turno pegado al principio no deja un hueco de cero', () => {
    // Sin el chequeo, acá aparecería `{14:00, 14:00}` y la pantalla ofrecería
    // un turno de duración nula.
    expect(freeSpans(abierto, [{ start: h(14), end: h(15) }])).toEqual([
      { start: h(15), end: h(20) },
    ])
  })

  it('un turno que tapa todo no deja nada', () => {
    expect(freeSpans(abierto, [{ start: h(13), end: h(21) }])).toEqual([])
  })

  it('dos turnos que se pisan entre sí cuentan como uno', () => {
    // La base no deja que se pisen, pero esto recibe datos de la red y no
    // puede confiar en eso: dos rangos superpuestos mal restados dejan huecos
    // negativos.
    expect(
      freeSpans(abierto, [
        { start: h(16), end: h(18) },
        { start: h(17), end: h(19) },
      ]),
    ).toEqual([
      { start: h(14), end: h(16) },
      { start: h(19), end: h(20) },
    ])
  })

  it('un turno de otro día no toca este', () => {
    expect(freeSpans(abierto, [{ start: h(2), end: h(4) }])).toEqual(abierto)
  })

  it('los ocupados desordenados dan el mismo resultado', () => {
    const desordenados = [
      { start: h(18), end: h(19) },
      { start: h(15), end: h(16) },
    ]
    expect(freeSpans(abierto, desordenados)).toEqual([
      { start: h(14), end: h(15) },
      { start: h(16), end: h(18) },
      { start: h(19), end: h(20) },
    ])
  })
})

describe('qué horarios se ofrecen', () => {
  it('avanza de a un paso', () => {
    const libres = [{ start: h(14), end: h(16) }]
    expect(slotStarts(libres, 60, 30)).toEqual([h(14), h(14, 30), h(15)])
  })

  it('no ofrece un turno que no entra entero', () => {
    // 19:45 para algo de una hora en un tramo que cierra a las 20 es ofrecer un
    // turno que no existe. Es el error que se descubre con alguien esperando.
    const libres = [{ start: h(19), end: h(20) }]
    expect(slotStarts(libres, 90, 15)).toEqual([])
  })

  it('un hueco exacto ofrece un solo turno', () => {
    expect(slotStarts([{ start: h(14), end: h(15) }], 60, 30)).toEqual([h(14)])
  })

  it('alinea a la grilla del paso', () => {
    // Si no, un tramo que arranca a las 15:07 ofrecería 15:07, 15:37, 16:07 —
    // horarios que nadie elegiría escribir.
    const libres = [{ start: h(15, 7), end: h(17) }]
    expect(slotStarts(libres, 60, 30)).toEqual([h(15, 30), h(16)])
  })

  it('duración o paso inválidos no cuelgan el cálculo', () => {
    // Un `step` de cero sería un bucle infinito, y llega de la configuración.
    expect(slotStarts([{ start: h(14), end: h(20) }], 60, 0)).toEqual([])
    expect(slotStarts([{ start: h(14), end: h(20) }], 0, 30)).toEqual([])
  })
})

describe('de punta a punta', () => {
  it('un martes con dos turnos tomados', () => {
    const abierto = openSpans([TARDE], [], MARTES)
    const libres = freeSpans(abierto, [
      { start: h(14), end: h(16) },
      { start: h(18), end: h(19) },
    ])
    expect(slotStarts(libres, 60, 60)).toEqual([h(16), h(17), h(19)])
  })
})
