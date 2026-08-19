import { describe, expect, it } from 'vitest'

import { haversineKm, roundDistanceKm } from './distance.ts'

describe('haversineKm', () => {
  it('es cero para el mismo punto', () => {
    const point = { lat: -34.5875, lng: -58.4371 }
    expect(haversineKm(point, point)).toBe(0)
  })

  it('es simétrica', () => {
    const a = { lat: -34.5875, lng: -58.4371 }
    const b = { lat: -34.6037, lng: -58.3816 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10)
  })

  it('coincide con una distancia real conocida (Palermo → Obelisco)', () => {
    // ~5,4 km en línea recta (Google Maps "distancia" en modo a pie).
    const palermo = { lat: -34.5875, lng: -58.4371 }
    const obelisco = { lat: -34.6037, lng: -58.3816 }
    expect(haversineKm(palermo, obelisco)).toBeCloseTo(5.4, 0)
  })

  it('un grado de latitud en el ecuador son ~111 km', () => {
    const a = { lat: 0, lng: 0 }
    const b = { lat: 1, lng: 0 }
    expect(haversineKm(a, b)).toBeCloseTo(111.2, 0)
  })

  it('nunca es negativa', () => {
    const a = { lat: 10, lng: 10 }
    const b = { lat: -10, lng: -10 }
    expect(haversineKm(a, b)).toBeGreaterThan(0)
  })
})

describe('roundDistanceKm', () => {
  it('redondea a un decimal por debajo de 10 km', () => {
    expect(roundDistanceKm(3.24)).toBe(3.2)
    expect(roundDistanceKm(0.049)).toBe(0)
    expect(roundDistanceKm(9.96)).toBe(10)
  })

  it('redondea a entero desde 10 km', () => {
    expect(roundDistanceKm(14.7)).toBe(15)
    expect(roundDistanceKm(10.0)).toBe(10)
  })
})
