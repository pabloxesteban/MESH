/**
 * El puente entre la base y el cálculo de huecos.
 *
 * El cálculo ya está testeado en `packages/domain`. Lo que se prueba acá es lo
 * que ese cálculo no toca y es donde se pierden los turnos: **la conversión**.
 * Un turno de las 14 que se muestra a las 11 no es un error de aritmética, es
 * un error de zona horaria, y solo aparece en esta capa.
 */

import { atMinutes, freeStartsFor, isoDate, toHm, toMinutes } from './day.ts'

const MARTES = new Date(2026, 7, 25, 12, 0, 0) // 25/8/2026, martes

const REGLA = [{ id: 'r1', weekday: 2, startsAt: '14:00', endsAt: '20:00' }]

describe('conversión', () => {
  it('ida y vuelta entre HH:MM y minutos', () => {
    expect(toMinutes('14:30')).toBe(870)
    expect(toHm(870)).toBe('14:30')
  })

  it('la medianoche lleva el cero adelante', () => {
    // '9:05' en vez de '09:05' se ordena mal y se lee peor.
    expect(toHm(545)).toBe('09:05')
  })

  it('`atMinutes` arma la hora LOCAL, no UTC', () => {
    // Es el test que atrapa el turno corrido: si se armara con un string ISO,
    // las 14 del artista serían las 14 UTC y en Buenos Aires se verían a las 11.
    const cuando = atMinutes(MARTES, 14 * 60)
    expect(cuando.getHours()).toBe(14)
    expect(cuando.getDate()).toBe(25)
  })

  it('`isoDate` usa el día local', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('los horarios que se ofrecen', () => {
  it('sale de la regla del día', () => {
    const libres = freeStartsFor({
      day: MARTES,
      rules: REGLA,
      exceptions: [],
      busy: [],
      duration: 120,
      step: 60,
    })
    expect(libres.map(toHm)).toEqual([
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
    ])
  })

  it('un día cerrado no ofrece nada, aunque la regla diga que sí', () => {
    const libres = freeStartsFor({
      day: MARTES,
      rules: REGLA,
      exceptions: [
        {
          id: 'e1',
          onDate: '2026-08-25',
          isOpen: false,
          startsAt: null,
          endsAt: null,
        },
      ],
      busy: [],
      duration: 60,
      step: 60,
    })
    expect(libres).toEqual([])
  })

  it('una excepción de OTRO día no toca este', () => {
    // El filtro por fecha es fácil de olvidar y el síntoma sería que cerrar un
    // feriado cierra toda la semana.
    const libres = freeStartsFor({
      day: MARTES,
      rules: REGLA,
      exceptions: [
        {
          id: 'e1',
          onDate: '2026-08-26',
          isOpen: false,
          startsAt: null,
          endsAt: null,
        },
      ],
      busy: [],
      duration: 120,
      step: 120,
    })
    expect(libres.length).toBeGreaterThan(0)
  })

  it('un turno tomado saca sus horas', () => {
    const libres = freeStartsFor({
      day: MARTES,
      rules: REGLA,
      exceptions: [],
      busy: [
        {
          startsAt: new Date(2026, 7, 25, 15, 0).toISOString(),
          endsAt: new Date(2026, 7, 25, 17, 0).toISOString(),
        },
      ],
      duration: 60,
      step: 60,
    })
    expect(libres.map(toHm)).toEqual(['14:00', '17:00', '18:00', '19:00'])
  })

  it('hoy, lo que ya pasó no se ofrece', () => {
    // Son las 17 y la regla abre a las 14: ofrecer las 14 sería ofrecer un
    // turno imposible, y es el error que se descubre con alguien preguntando.
    const libres = freeStartsFor({
      day: MARTES,
      rules: REGLA,
      exceptions: [],
      busy: [],
      duration: 60,
      step: 60,
      now: new Date(2026, 7, 25, 17, 0),
    })
    expect(libres.map(toHm)).toEqual(['17:00', '18:00', '19:00'])
  })

  it('un día sin regla no ofrece nada', () => {
    const domingo = new Date(2026, 7, 23, 12, 0)
    expect(
      freeStartsFor({
        day: domingo,
        rules: REGLA,
        exceptions: [],
        busy: [],
        duration: 60,
        step: 60,
      }),
    ).toEqual([])
  })
})
