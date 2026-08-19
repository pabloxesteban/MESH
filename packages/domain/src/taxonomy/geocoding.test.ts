import { describe, expect, it } from 'vitest'

import { matchNeighborhood } from './geocoding.ts'

describe('matchNeighborhood', () => {
  it('resuelve un nombre exacto', () => {
    expect(matchNeighborhood(['Palermo'], 'caba')?.slug).toBe('palermo')
  })

  it('ignora acentos y mayúsculas — iOS y Android no coinciden entre sí', () => {
    expect(matchNeighborhood(['NÚÑEZ'], 'caba')?.slug).toBe('nunez')
    expect(matchNeighborhood(['nunez'], 'caba')?.slug).toBe('nunez')
  })

  it('acepta el slug tal cual, además del nombre para mostrar', () => {
    expect(matchNeighborhood(['villa-crespo'], 'caba')?.slug).toBe(
      'villa-crespo',
    )
  })

  it('prueba los candidatos en orden y gana el primero que coincide', () => {
    // El geocoder pone el barrio en un campo distinto según la plataforma, así
    // que se le pasan varios. `Buenos Aires` no es un barrio: sigue de largo.
    expect(
      matchNeighborhood([null, '', 'Buenos Aires', 'Chacarita'], 'caba')?.slug,
    ).toBe('chacarita')
  })

  it('devuelve null antes que adivinar', () => {
    // Un barrio equivocado es peor que ninguno: subiría en el ranking a gente
    // que queda lejos.
    expect(matchNeighborhood(['Barrio Que No Existe'], 'caba')).toBeNull()
    expect(matchNeighborhood([], 'caba')).toBeNull()
    expect(matchNeighborhood([null, undefined, '  '], 'caba')).toBeNull()
  })

  it('no cruza de ciudad: un barrio de CABA no aparece buscando en otra', () => {
    expect(matchNeighborhood(['Palermo'], 'la-plata')).toBeNull()
  })
})
