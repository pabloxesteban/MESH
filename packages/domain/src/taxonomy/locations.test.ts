import { describe, expect, it } from 'vitest'

import {
  LOCATIONS,
  findLocation,
  isKnownLocation,
  isSameMetro,
} from './locations.ts'

describe('locations', () => {
  it('tiene slugs únicos', () => {
    const slugs = LOCATIONS.map((location) => location.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('usa slugs en minúscula con guiones, como la taxonomía de estilos', () => {
    for (const location of LOCATIONS) {
      expect(location.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it('es toda de Argentina en V1', () => {
    for (const location of LOCATIONS) {
      expect(location.countryCode).toBe('AR')
    }
  })

  it('resuelve una ubicación conocida y rechaza una desconocida', () => {
    expect(findLocation('caba')?.city).toBe('Buenos Aires')
    expect(findLocation('rosario')).toBeUndefined()
    expect(isKnownLocation('caba')).toBe(true)
    expect(isKnownLocation('rosario')).toBe(false)
  })

  it('agrupa CABA con el conurbano en el mismo metro', () => {
    expect(isSameMetro('caba', 'vicente-lopez')).toBe(true)
    expect(isSameMetro('caba', 'quilmes')).toBe(true)
  })

  it('deja La Plata en su propio metro', () => {
    // A 55 km. Tratarla como la misma ciudad sería mentirle a alguien sobre
    // cuánto tiene que viajar, que es justo lo que el componente de ubicación
    // del matching tiene que evitar afirmar.
    expect(isSameMetro('caba', 'la-plata')).toBe(false)
  })

  it('una ubicación desconocida nunca comparte metro con nada', () => {
    expect(isSameMetro('caba', 'no-existe')).toBe(false)
    expect(isSameMetro('no-existe', 'no-existe')).toBe(false)
  })
})
