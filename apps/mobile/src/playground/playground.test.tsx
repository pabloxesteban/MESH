/**
 * Tests del índice del playground.
 *
 * Lo único que importa verificar acá: que la tabla de "construido / sin
 * construir" en el código coincida con la que describe
 * docs/research/MESH-UX-STRATEGY.md, y que un prototipo "sin construir" nunca
 * tenga un componente colgado por error — sería exactamente el tipo de
 * inconsistencia silenciosa que hace que un documento deje de ser confiable.
 */

import { PLAYGROUND_ENTRIES } from './index.ts'

const BUILT_IDS = ['swipe-physics', 'bottom-sheet', 'taste-map']

describe('PLAYGROUND_ENTRIES', () => {
  it('solo los tres prototipos construidos tienen componente', () => {
    for (const entry of PLAYGROUND_ENTRIES) {
      if (BUILT_IDS.includes(entry.id)) {
        expect(entry.component).toBeDefined()
      } else {
        expect(entry.component).toBeUndefined()
      }
    }
  })

  it('cada entrada sin construir dice por qué en las notas', () => {
    for (const entry of PLAYGROUND_ENTRIES) {
      if (entry.component == null) {
        expect(entry.notes.length).toBeGreaterThan(0)
      }
    }
  })

  it('no hay ids repetidos', () => {
    const ids = PLAYGROUND_ENTRIES.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
