/**
 * La ventana del ranking.
 *
 * Es la única parte donde un error no se ve: una ventana de siete días que en
 * realidad son ocho devuelve un ranking verosímil y equivocado, y nadie lo nota
 * hasta que alguien pregunta por qué una obra de hace nueve días sigue en "esta
 * semana".
 */

import { windowStart, type RankingWindow } from './ranking.ts'

const AHORA = new Date('2026-08-20T15:30:00.000Z')

function dias(window: RankingWindow): number {
  const desde = windowStart(window, AHORA)
  return (AHORA.getTime() - desde.getTime()) / 86_400_000
}

describe('desde cuándo cuenta cada ventana', () => {
  it('la semana son siete días, no ocho', () => {
    expect(dias('week')).toBe(7)
  })

  it('el mes son treinta', () => {
    expect(dias('month')).toBe(30)
  })

  it('no toca la hora: la ventana es móvil, no calendaria', () => {
    // Si se truncara a medianoche, "esta semana" cambiaría de contenido de
    // golpe a las 00:00 y una obra saldría del ranking mientras alguien la
    // mira. Móvil significa que se desliza de a un segundo.
    expect(windowStart('week', AHORA).toISOString()).toBe(
      '2026-08-13T15:30:00.000Z',
    )
  })

  it('no muta el `now` que recibe', () => {
    // `setUTCDate` muta, y `now` puede venir de quien llama. Sin la copia, el
    // segundo llamado partiría de una fecha ya corrida.
    const now = new Date('2026-08-20T15:30:00.000Z')
    windowStart('week', now)
    windowStart('month', now)
    expect(now.toISOString()).toBe('2026-08-20T15:30:00.000Z')
  })

  it('cruza el fin de mes sin romperse', () => {
    expect(
      windowStart('week', new Date('2026-03-03T10:00:00.000Z')).toISOString(),
    ).toBe('2026-02-24T10:00:00.000Z')
  })
})
