/**
 * Tests del motor de gusto.
 *
 * La lista viene de docs/product/matching.md §8. Cada valor esperado está
 * commiteado: cambiar uno requiere subir `TASTE_VERSION` y una justificación
 * documentada.
 */

import { describe, expect, it } from 'vitest'

import type { Interaction } from '../types/core.ts'
import { SATURATION_K } from './config.ts'
import { computeTaste, saturate, valueOf, type PieceStyles } from './taste.ts'

function piece(
  id: string,
  ...styles: ReadonlyArray<readonly [string, number]>
): PieceStyles {
  return {
    portfolioItemId: id,
    styles: styles.map(([styleSlug, weight]) => ({ styleSlug, weight })),
  }
}

function like(id: string, isSaved = false): Interaction {
  return { portfolioItemId: id, verdict: 'like', isSaved, source: 'discover' }
}

function pass(id: string): Interaction {
  return {
    portfolioItemId: id,
    verdict: 'pass',
    isSaved: false,
    source: 'discover',
  }
}

function run(
  interactions: readonly Interaction[],
  pieces: readonly PieceStyles[],
) {
  return computeTaste({
    categorySlug: 'tattoo',
    interactions,
    pieces: new Map(pieces.map((p) => [p.portfolioItemId, p])),
  })
}

describe('valores de interacción', () => {
  it('guardar pesa exactamente 1,5 veces un me gusta', () => {
    expect(valueOf(like('a', true)) / valueOf(like('a'))).toBe(1.5)
  })

  it('un paso vale un cuarto de un me gusta, en negativo', () => {
    expect(valueOf(pass('a'))).toBe(-0.25)
  })
})

describe('acumulación y normalización', () => {
  it('un me gusta sobre una pieza de un solo estilo da t_s exacto', () => {
    const result = run([like('p1')], [piece('p1', ['fine-line', 1])])
    // raw = 1,0 → 1 / (1 + 3) = 0,25
    expect(result.scores['fine-line']).toBeCloseTo(1 / (1 + SATURATION_K), 10)
    expect(result.scores['fine-line']).toBeCloseTo(0.25, 10)
  })

  it('una pieza multi-estilo se reparte y no pesa más que una enfocada', () => {
    // Es la razón por la que los pesos suman 1 por pieza: si no, etiquetar de
    // más sería una forma de inflar el gusto.
    const multi = run(
      [like('p1')],
      [piece('p1', ['fine-line', 0.6], ['dotwork', 0.4])],
    )
    const focused = run([like('p2')], [piece('p2', ['fine-line', 1])])

    const totalMulti =
      (multi.scores['fine-line'] ?? 0) + (multi.scores['dotwork'] ?? 0)
    expect(multi.scores['fine-line']).toBeLessThan(
      focused.scores['fine-line'] ?? 0,
    )
    expect(totalMulti).toBeLessThan(2 * (focused.scores['fine-line'] ?? 0))
  })

  it('los pasos bajan el puntaje pero nunca lo hacen negativo', () => {
    const result = run(
      [like('p1'), pass('p2'), pass('p3'), pass('p4'), pass('p5'), pass('p6')],
      [1, 2, 3, 4, 5, 6].map((n) => piece(`p${n}`, ['fine-line', 1])),
    )
    // raw = 1,0 − 5 × 0,25 = −0,25 → el positivo se recorta en 0.
    expect(result.scores['fine-line']).toBeUndefined()
    expect(result.aversion['fine-line']).toBeGreaterThan(0)
  })

  it('la aversión sube cuando la evidencia neta es negativa', () => {
    const result = run(
      [pass('p1'), pass('p2'), pass('p3')],
      [1, 2, 3].map((n) => piece(`p${n}`, ['blackwork', 1])),
    )
    expect(result.aversion['blackwork']).toBeCloseTo(saturate(0.75), 10)
    expect(result.scores['blackwork']).toBeUndefined()
  })

  it('deshacer devuelve el vector exactamente al estado anterior', () => {
    // Es la propiedad que hace que deshacer sea trivial. Si esto fuera un
    // acumulador incremental haría falta un evento compensatorio.
    const pieces = [1, 2, 3].map((n) => piece(`p${n}`, ['fine-line', 1]))
    const antes = run([like('p1'), like('p2')], pieces)
    const conMas = run([like('p1'), like('p2'), like('p3')], pieces)
    const deshecho = run([like('p1'), like('p2')], pieces)

    expect(deshecho).toEqual(antes)
    expect(conMas).not.toEqual(antes)
  })

  it('un conjunto vacío da un vector cero, no NaN', () => {
    const result = run([], [])
    expect(result.scores).toEqual({})
    expect(result.aversion).toEqual({})
    expect(result.decisiveCount).toBe(0)
    expect(result.isReady).toBe(false)
    expect(Number.isNaN(result.interactionsToReady)).toBe(false)
  })

  it('ignora interacciones sobre piezas que no conocemos', () => {
    // Pasa si el catálogo cambió debajo de una cola offline. Contarlas
    // inflaría `n`, que es la mitad del umbral de listo.
    const result = run([like('fantasma')], [])
    expect(result.decisiveCount).toBe(0)
  })
})

describe('umbral de listo', () => {
  /** n interacciones repartidas entre `styles` estilos. */
  function spread(n: number, styles: readonly string[]) {
    const pieces = Array.from({ length: n }, (_, index) =>
      piece(`p${index}`, [styles[index % styles.length] as string, 1]),
    )
    return run(
      pieces.map((p) => like(p.portfolioItemId)),
      pieces,
    )
  }

  it('es falso con 11 interacciones y verdadero con 12', () => {
    const styles = ['fine-line', 'dotwork', 'blackwork']
    expect(spread(11, styles).isReady).toBe(false)
    expect(spread(12, styles).isReady).toBe(true)
  })

  it('es falso con 20 interacciones repartidas entre 20 estilos', () => {
    // Doce interacciones repartidas parejo entre doce estilos no son un gusto,
    // son ruido. Por eso hay dos condiciones y no una.
    const styles = Array.from({ length: 20 }, (_, index) => `estilo-${index}`)
    const result = spread(20, styles)
    expect(result.decisiveCount).toBe(20)
    expect(result.isReady).toBe(false)
  })

  it('informa cuántas faltan, y cero cuando ya llegó', () => {
    expect(spread(5, ['fine-line']).interactionsToReady).toBe(7)
    expect(
      spread(12, ['fine-line', 'dotwork', 'blackwork']).interactionsToReady,
    ).toBe(0)
  })
})

describe('filtro de visualización', () => {
  it('esconde un estilo sostenido por una sola interacción', () => {
    const result = run(
      [like('p1', true), like('p2', true), like('p3', true), like('p4')],
      [
        piece('p1', ['fine-line', 1]),
        piece('p2', ['fine-line', 1]),
        piece('p3', ['fine-line', 1]),
        piece('p4', ['japanese', 1]),
      ],
    )
    const slugs = result.visible.map((entry) => entry.styleSlug)
    expect(slugs).toContain('fine-line')
    expect(slugs).not.toContain('japanese')
  })

  it('nunca muestra aversión', () => {
    // Un paso es evidencia débil, y presentarla como un juicio sobre el gusto
    // de alguien es incorrecto.
    const result = run(
      [pass('p1'), pass('p2'), pass('p3')],
      [1, 2, 3].map((n) => piece(`p${n}`, ['blackwork', 1])),
    )
    expect(result.visible).toEqual([])
    expect(Object.keys(result.aversion)).toContain('blackwork')
  })

  it('ordena por puntaje y desempata de forma estable', () => {
    const pieces = [
      piece('p1', ['aaa', 1]),
      piece('p2', ['aaa', 1]),
      piece('p3', ['bbb', 1]),
      piece('p4', ['bbb', 1]),
    ]
    const primera = run(
      pieces.map((p) => like(p.portfolioItemId)),
      pieces,
    )
    const segunda = run(
      [...pieces].reverse().map((p) => like(p.portfolioItemId)),
      pieces,
    )
    expect(primera.visible.map((v) => v.styleSlug)).toEqual(
      segunda.visible.map((v) => v.styleSlug),
    )
  })

  it('cuenta la evidencia por tipo, para poder mostrarla', () => {
    const result = run(
      [like('p1'), like('p2', true), pass('p3')],
      [1, 2, 3].map((n) => piece(`p${n}`, ['fine-line', 1])),
    )
    const fineLine = result.visible.find((v) => v.styleSlug === 'fine-line')
    expect(fineLine).toMatchObject({
      likes: 1,
      saves: 1,
      passes: 1,
      support: 3,
    })
  })
})

describe('propiedades', () => {
  it('todo puntaje cae en [0, 1)', () => {
    const pieces = Array.from({ length: 50 }, (_, index) =>
      piece(`p${index}`, ['fine-line', 1]),
    )
    const result = run(
      pieces.map((p) => like(p.portfolioItemId, true)),
      pieces,
    )
    const score = result.scores['fine-line'] ?? 0
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })

  it('agregar un me gusta nunca baja el puntaje de ese estilo', () => {
    const pieces = Array.from({ length: 10 }, (_, index) =>
      piece(`p${index}`, ['fine-line', 1]),
    )
    let previous = 0
    for (let n = 1; n <= 10; n += 1) {
      const result = run(
        pieces.slice(0, n).map((p) => like(p.portfolioItemId)),
        pieces,
      )
      const score = result.scores['fine-line'] ?? 0
      expect(score).toBeGreaterThanOrEqual(previous)
      previous = score
    }
  })

  it('el orden de las interacciones no cambia el resultado', () => {
    const pieces = [
      piece('p1', ['fine-line', 0.5], ['dotwork', 0.5]),
      piece('p2', ['blackwork', 1]),
      piece('p3', ['fine-line', 1]),
    ]
    const interactions = [like('p1'), like('p2', true), pass('p3')]
    const a = run(interactions, pieces)
    const b = run([...interactions].reverse(), pieces)
    expect(a.scores).toEqual(b.scores)
    expect(a.aversion).toEqual(b.aversion)
  })
})
