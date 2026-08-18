import { formatDate, formatMoney, isAvailabilityStale } from './format.ts'

describe('formatMoney', () => {
  it('muestra pesos sin centavos', () => {
    // Nadie cotiza un tatuaje en $60.000,00.
    const formatted = formatMoney(6_000_000, 'ARS', 'es-AR')
    expect(formatted).not.toMatch(/[.,]\d\d$/)
    expect(formatted).toMatch(/60\.000/)
  })
})

describe('formatDate', () => {
  it('convierte una fecha ISO en texto legible', () => {
    expect(formatDate('2026-08-01', 'es-AR')).toMatch(/agosto/i)
  })

  it('no reinterpreta la fecha por zona horaria', () => {
    // Sin `timeZone: 'UTC'`, un 1 de agosto se muestra como 31 de julio al oeste
    // de Greenwich. Es el bug clásico de fechas sin hora.
    expect(formatDate('2026-08-01', 'es-AR')).toMatch(/\b1\b/)
  })

  it('devuelve el original si no parsea, en vez de "Invalid Date"', () => {
    expect(formatDate('ayer', 'es-AR')).toBe('ayer')
  })
})

describe('isAvailabilityStale', () => {
  it('es falsa dentro de los 45 días', () => {
    expect(isAvailabilityStale('2026-08-01', '2026-08-18')).toBe(false)
  })

  it('es verdadera pasados los 45 días', () => {
    // Misma regla que aplica el motor de match, que directamente omite el
    // componente. MESH no afirma una disponibilidad que no puede sostener.
    expect(isAvailabilityStale('2026-01-01', '2026-08-18')).toBe(true)
  })

  it('trata una fecha inválida como vieja', () => {
    expect(isAvailabilityStale('', '2026-08-18')).toBe(true)
  })
})
