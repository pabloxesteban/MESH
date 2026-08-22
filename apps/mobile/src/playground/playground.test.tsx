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

const BUILT_IDS = [
  // Las cuatro direcciones visuales candidatas. Ver
  // docs/design/MESH-DESIGN-DECISIONS.md — se quedan después de elegir, como
  // registro de qué se consideró.
  'direction-editorial-dark',
  'direction-warm-gallery',
  'direction-spatial-apple',
  'direction-creative-minimal',
  'swipe-physics',
  'bottom-sheet',
  'taste-map',
  // La transición obra → artista. Ver D-007, que decidió construirla a mano, y
  // D-011, que la implementó.
  'shared-grow',
  // El efecto de foco del carrusel de obra de ArtistCard. Paso 1 de la
  // verificación que pide la spec de interaction-designer, con fotos reales.
  'carousel-peek',
]

describe('PLAYGROUND_ENTRIES', () => {
  it('solo los prototipos construidos tienen componente', () => {
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
