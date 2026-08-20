import { describe, expect, it } from 'vitest'
import {
  CATEGORIES,
  STYLES,
  TRAITS,
  TRAIT_DIMENSIONS,
  findStyle,
  isKnownCategory,
  isKnownStyle,
  stylesForCategory,
  traitsOf,
} from './taxonomy.ts'

describe('taxonomía', () => {
  it('no tiene slugs de estilo duplicados dentro de una categoría', () => {
    const keys = STYLES.map((s) => `${s.categorySlug}/${s.slug}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('usa slugs estables en minúscula y con guiones', () => {
    for (const style of STYLES) {
      expect(style.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
    for (const category of CATEGORIES) {
      expect(category.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it('nombra cada estilo por clave de i18n, nunca por texto visible', () => {
    for (const style of STYLES) {
      expect(style.nameKey).toBe(`style.${style.categorySlug}.${style.slug}`)
      expect(style.descriptionKey).toBe(`${style.nameKey}.description`)
    }
  })

  it('asocia cada estilo a una categoría existente', () => {
    for (const style of STYLES) {
      expect(isKnownCategory(style.categorySlug)).toBe(true)
    }
  })

  it('no tiene órdenes de presentación duplicados dentro de una categoría', () => {
    for (const category of CATEGORIES) {
      const orders = stylesForCategory(category.slug).map((s) => s.sortOrder)
      expect(new Set(orders).size).toBe(orders.length)
    }
  })

  it('incluye fileteado-porteño, que es específico de Buenos Aires', () => {
    expect(isKnownStyle('tattoo', 'fileteado-porteno')).toBe(true)
  })

  it('resuelve un estilo conocido y rechaza uno desconocido', () => {
    expect(findStyle('tattoo', 'fine-line')?.sortOrder).toBe(1)
    expect(findStyle('tattoo', 'no-existe')).toBeUndefined()
    expect(isKnownStyle('tattoo', 'no-existe')).toBe(false)
  })

  it('no filtra alias dentro de los slugs — los alias son datos aparte', () => {
    const slugs = new Set(STYLES.map((s) => s.slug))
    for (const style of STYLES) {
      for (const alias of style.aliases) {
        expect(slugs.has(alias)).toBe(false)
      }
    }
  })
})

describe('rasgos del brief', () => {
  it('no repite un slug dentro de una categoría, aunque cambie la dimensión', () => {
    // Es la restricción `unique (category_id, slug)` de la tabla, y existe
    // porque la pantalla del brief muestra las tres dimensiones juntas: si
    // "chico" fuera un tamaño y también una zona, no habría forma de saber cuál
    // eligió alguien.
    const vistos = new Set<string>()
    for (const trait of TRAITS) {
      const clave = `${trait.categorySlug}/${trait.slug}`
      expect(vistos.has(clave)).toBe(false)
      vistos.add(clave)
    }
  })

  it('nombra cada rasgo por clave de i18n, nunca por texto visible', () => {
    for (const trait of TRAITS) {
      expect(trait.nameKey).toBe(`trait.tattoo.${trait.slug}`)
    }
  })

  it('usa slugs estables en minúscula y con guiones', () => {
    for (const trait of TRAITS) {
      expect(trait.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it('llena las tres dimensiones, y `traitsOf` devuelve solo la pedida', () => {
    for (const dimension of TRAIT_DIMENSIONS) {
      const rasgos = traitsOf(dimension)
      expect(rasgos.length).toBeGreaterThan(0)
      expect(rasgos.every((trait) => trait.dimension === dimension)).toBe(true)
    }
  })

  it('ordena cada dimensión sin empates', () => {
    for (const dimension of TRAIT_DIMENSIONS) {
      const ordenes = traitsOf(dimension).map((trait) => trait.sortOrder)
      expect(new Set(ordenes).size).toBe(ordenes.length)
    }
  })

  it('mantiene corta la lista de zonas: con treinta opciones nadie elige', () => {
    expect(traitsOf('body_area').length).toBeLessThanOrEqual(12)
  })
})
