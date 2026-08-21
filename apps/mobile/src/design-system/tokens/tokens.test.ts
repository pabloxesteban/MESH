/**
 * Las reglas del sistema, impuestas.
 *
 * Cada una de estas está escrita en docs/design/visual-language.md. Un
 * documento no impide que alguien agregue un token que la rompa; un test sí.
 */

import { MAX_DURATION, duration, easing, spring } from './motion.ts'
import { MIN_TOUCH_TARGET, radius, spacing } from './layout.ts'
import { fontFamily, textRoles } from './typography.ts'

// Los dos cortes de Fraunces (Regular y, desde ADR-031, SemiBold) son la
// misma familia serif a efectos de esta regla: lo que la mantiene en su rol
// es el corte tipográfico, no el peso.
const SERIF_FAMILIES: ReadonlyArray<string> = [
  fontFamily.serif,
  fontFamily.serifDisplay,
]

describe('tipografía', () => {
  it.each(Object.entries(textRoles))(
    'el rol %s respeta el rango de su familia',
    (_name, role) => {
      // Serif nunca por debajo de 24, sans nunca por encima de 20. Esa única
      // restricción las mantiene en su rol sin discutirlo en cada pantalla.
      if (SERIF_FAMILIES.includes(role.fontFamily)) {
        expect(role.fontSize).toBeGreaterThanOrEqual(24)
      } else {
        expect(role.fontSize).toBeLessThanOrEqual(20)
      }
    },
  )

  it('solo usa familias que efectivamente se empaquetan', () => {
    const bundled = Object.values(fontFamily)
    for (const role of Object.values(textRoles)) {
      expect(bundled).toContain(role.fontFamily)
    }
  })

  it.each(Object.entries(textRoles))(
    'el rol %s tiene interlínea al menos igual al tamaño',
    (_name, role) => {
      expect(role.lineHeight).toBeGreaterThanOrEqual(role.fontSize)
    },
  )
})

describe('movimiento', () => {
  it.each(Object.entries(duration))(
    'la duración %s no supera el techo',
    (_name, value) => {
      expect(value).toBeLessThanOrEqual(MAX_DURATION)
    },
  )

  it('expresa los easings como puntos de control, sin dependencias', () => {
    // Los tokens son datos puros a propósito: importar Reanimated acá
    // arrastraba su stack nativo a cualquier archivo que tocara un token.
    for (const curve of Object.values(easing)) {
      expect(curve).toHaveLength(4)
      for (const point of curve) {
        expect(typeof point).toBe('number')
      }
    }
  })

  it.each(Object.entries(spring))(
    'el resorte %s define damping, stiffness y masa',
    (_name, config) => {
      expect(config.damping).toBeGreaterThan(0)
      expect(config.stiffness).toBeGreaterThan(0)
      expect(config.mass).toBeGreaterThan(0)
    },
  )
})

describe('layout', () => {
  it.each(Object.entries(spacing))(
    'el espaciado %s (=%s) cae en la grilla de 4pt',
    (_name, value) => {
      // La escala documentada es 4 8 12 16 24 32 48 64: ritmo de 8pt sobre una
      // grilla de 4pt. 12 y 20 existen porque hacen falta; lo que no puede
      // haber es un valor fuera de la grilla.
      expect(value % 4).toBe(0)
    },
  )

  it('ordena el espaciado de menor a mayor', () => {
    const values = Object.values(spacing)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
  })

  it('fija el área táctil mínima en 44pt', () => {
    // No es una recomendación. Todo control llega a esto, expandiendo con
    // hitSlop cuando el elemento visual es más chico.
    expect(MIN_TOUCH_TARGET).toBe(44)
  })

  it('ordena los radios de menor a mayor', () => {
    const values = Object.values(radius)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
  })
})
