/**
 * Mapeo de filas de Supabase a los tipos que consume la pantalla.
 *
 * Solo `toPiece` (vía `fetchProfile`): es la parte con reglas —un campo
 * ausente no inventa nada— y por eso se testea aparte de la pantalla. Ver
 * ADR-034 para `isOriginalDesign` / `sizeLabel` / `price`.
 */

const mockFrom = jest.fn()

jest.mock('../../data/supabase.ts', () => ({
  get supabase() {
    return { from: mockFrom }
  },
}))

import { fetchProfile } from './queries.ts'

/** Cadena `.select().eq()...` que termina en el resultado dado. */
function chain(result: { data: unknown; error: null }) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: async () => result,
    maybeSingle: async () => result,
  }
  return builder
}

const PROFESSIONAL_ROW = {
  id: 'p1',
  slug: 'aguja-fina',
  display_name: 'Aguja Fina',
  bio: null,
  travels: false,
  price_min_cents: null,
  price_max_cents: null,
  price_currency: null,
  priced_at: null,
  availability_status: null,
  availability_updated_at: null,
  instagram_handle: null,
  whatsapp_e164: null,
  studio_lat: null,
  studio_lng: null,
  owner_user_id: null,
  is_fixture: false,
  locations: null,
  professional_styles: [],
}

function pieceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pieza-1',
    caption: null,
    year: null,
    is_featured: false,
    is_original_design: false,
    size_label: null,
    price_cents: null,
    price_currency: null,
    priced_at: null,
    media_assets: null,
    portfolio_item_styles: [],
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('fetchProfile — mapeo de piezas', () => {
  it('mapea diseño propio con tamaño y precio', async () => {
    mockFrom.mockImplementation((table: string) =>
      table === 'professionals'
        ? chain({ data: PROFESSIONAL_ROW, error: null })
        : chain({
            data: [
              pieceRow({
                id: 'flash-1',
                is_original_design: true,
                size_label: '8x10cm',
                price_cents: 5_000_000,
                price_currency: 'ARS',
                priced_at: '2026-08-01',
              }),
            ],
            error: null,
          }),
    )

    const data = await fetchProfile('aguja-fina')

    expect(data?.pieces[0]).toMatchObject({
      isOriginalDesign: true,
      sizeLabel: '8x10cm',
      price: { cents: 5_000_000, currency: 'ARS', pricedAt: '2026-08-01' },
    })
  })

  it('price es null cuando price_cents es null, aun con is_original_design en false', async () => {
    mockFrom.mockImplementation((table: string) =>
      table === 'professionals'
        ? chain({ data: PROFESSIONAL_ROW, error: null })
        : chain({ data: [pieceRow()], error: null }),
    )

    const data = await fetchProfile('aguja-fina')

    expect(data?.pieces[0]).toMatchObject({
      isOriginalDesign: false,
      sizeLabel: null,
      price: null,
    })
  })

  it('diseño propio a medias — tamaño declarado, precio todavía sin completar', async () => {
    // La base no obliga a completar los tres campos juntos cuando
    // is_original_design es true (ADR-034, "Lo que NO está"): un artista puede
    // subir el diseño y declarar el precio después. El mapeo no debe inventar
    // un precio que no está.
    mockFrom.mockImplementation((table: string) =>
      table === 'professionals'
        ? chain({ data: PROFESSIONAL_ROW, error: null })
        : chain({
            data: [
              pieceRow({
                id: 'flash-a-medias',
                is_original_design: true,
                size_label: 'mano chica',
              }),
            ],
            error: null,
          }),
    )

    const data = await fetchProfile('aguja-fina')

    expect(data?.pieces[0]).toMatchObject({
      isOriginalDesign: true,
      sizeLabel: 'mano chica',
      price: null,
    })
  })
})
