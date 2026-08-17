import { describe, expect, it } from 'vitest'
import {
  artistSchema,
  portfolioItemSchema,
  portfolioSchema,
  validatePortfolioStyles,
} from './schemas.ts'

const validArtist = {
  slug: 'luna-vera',
  display_name: 'Luna Vera',
  category: 'tattoo',
  location: 'caba',
  bio: 'Fine line y botánico, en negro.',
  styles: [
    { slug: 'fine-line', proficiency: 1, primary: true },
    { slug: 'minimalist', proficiency: 0.6, primary: false },
  ],
  contact: { instagram: 'lunavera.tattoo', whatsapp: '+5491155551234' },
}

describe('artistSchema', () => {
  it('acepta un artista válido', () => {
    expect(artistSchema.safeParse(validArtist).success).toBe(true)
  })

  it('rechaza un slug de estilo que no está en la taxonomía', () => {
    const result = artistSchema.safeParse({
      ...validArtist,
      styles: [{ slug: 'cyberpunk', proficiency: 1, primary: true }],
    })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('cyberpunk')
  })

  it('exige al menos un canal de contacto', () => {
    const result = artistSchema.safeParse({ ...validArtist, contact: {} })
    expect(result.success).toBe(false)
  })

  it('rechaza un WhatsApp que no está en E.164', () => {
    for (const whatsapp of [
      '11 5555-1234',
      '5491155551234',
      '+0491155551234',
    ]) {
      const result = artistSchema.safeParse({
        ...validArtist,
        contact: { whatsapp },
      })
      expect(result.success, whatsapp).toBe(false)
    }
  })

  it('rechaza una URL de Instagram — pide el handle pelado', () => {
    const result = artistSchema.safeParse({
      ...validArtist,
      contact: { instagram: 'https://instagram.com/lunavera.tattoo' },
    })
    expect(result.success).toBe(false)
  })

  it('exige priced_at cuando hay precio', () => {
    const withoutDate = artistSchema.safeParse({
      ...validArtist,
      price: { min_cents: 45000, max_cents: 120000, currency: 'ARS' },
    })
    expect(withoutDate.success).toBe(false)

    const withDate = artistSchema.safeParse({
      ...validArtist,
      price: {
        min_cents: 45000,
        max_cents: 120000,
        currency: 'ARS',
        priced_at: '2026-08-10',
      },
    })
    expect(withDate.success).toBe(true)
  })

  it('rechaza un precio mínimo mayor que el máximo', () => {
    const result = artistSchema.safeParse({
      ...validArtist,
      price: {
        min_cents: 120000,
        max_cents: 45000,
        currency: 'ARS',
        priced_at: '2026-08-10',
      },
    })
    expect(result.success).toBe(false)
  })

  it('exige updated_at cuando hay disponibilidad', () => {
    const result = artistSchema.safeParse({
      ...validArtist,
      availability: { status: 'open' },
    })
    expect(result.success).toBe(false)
  })

  it('exige al menos un estilo primario y como mucho tres', () => {
    const none = artistSchema.safeParse({
      ...validArtist,
      styles: [{ slug: 'fine-line', proficiency: 1, primary: false }],
    })
    expect(none.success).toBe(false)

    const tooMany = artistSchema.safeParse({
      ...validArtist,
      styles: [
        { slug: 'fine-line', proficiency: 1, primary: true },
        { slug: 'blackwork', proficiency: 1, primary: true },
        { slug: 'dotwork', proficiency: 1, primary: true },
        { slug: 'realism', proficiency: 1, primary: true },
      ],
    })
    expect(tooMany.success).toBe(false)
  })

  it('rechaza estilos duplicados', () => {
    const result = artistSchema.safeParse({
      ...validArtist,
      styles: [
        { slug: 'fine-line', proficiency: 1, primary: true },
        { slug: 'fine-line', proficiency: 0.6, primary: false },
      ],
    })
    expect(result.success).toBe(false)
  })
})

describe('portfolioItemSchema', () => {
  it('acepta pesos de estilo que suman 1', () => {
    const result = portfolioItemSchema.safeParse({
      file: 'pieza-01.jpg',
      styles: [
        { slug: 'fine-line', weight: 0.6 },
        { slug: 'minimalist', weight: 0.4 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rechaza pesos que no suman 1', () => {
    const result = portfolioItemSchema.safeParse({
      file: 'pieza-01.jpg',
      styles: [
        { slug: 'fine-line', weight: 0.6 },
        { slug: 'minimalist', weight: 0.6 },
      ],
    })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('1.200')
  })

  it('tolera error de punto flotante dentro de ±0,001', () => {
    const result = portfolioItemSchema.safeParse({
      file: 'pieza-01.jpg',
      styles: [
        { slug: 'fine-line', weight: 1 / 3 },
        { slug: 'minimalist', weight: 1 / 3 },
        { slug: 'dotwork', weight: 1 / 3 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rechaza un peso de cero', () => {
    const result = portfolioItemSchema.safeParse({
      file: 'pieza-01.jpg',
      styles: [
        { slug: 'fine-line', weight: 1 },
        { slug: 'minimalist', weight: 0 },
      ],
    })
    expect(result.success).toBe(false)
  })
})

describe('validatePortfolioStyles', () => {
  it('no reporta nada cuando todos los estilos existen', () => {
    const portfolio = portfolioSchema.parse({
      items: [{ file: 'a.jpg', styles: [{ slug: 'fine-line', weight: 1 }] }],
    })
    expect(validatePortfolioStyles(portfolio, 'tattoo')).toEqual([])
  })

  it('reporta el archivo y el slug de un estilo desconocido', () => {
    const portfolio = portfolioSchema.parse({
      items: [{ file: 'b.jpg', styles: [{ slug: 'vaporwave', weight: 1 }] }],
    })
    const errors = validatePortfolioStyles(portfolio, 'tattoo')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('b.jpg')
    expect(errors[0]).toContain('vaporwave')
  })
})
