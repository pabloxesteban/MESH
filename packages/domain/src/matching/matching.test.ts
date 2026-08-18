/**
 * Tests del motor de match.
 *
 * La lista viene de docs/product/matching.md §8. Cambiar un valor esperado
 * requiere subir `MATCHING_VERSION` y una justificación documentada.
 */

import { describe, expect, it } from 'vitest'

import type { Professional, TasteProfile } from '../types/core.ts'
import { MATCHING_VERSION } from '../version.ts'
import { SCORE_FLOOR } from './config.ts'
import {
  availabilityComponent,
  bandFor,
  blendProjectStyles,
  daysBetween,
  deriveReasons,
  matchProfessionals,
  priceComponent,
  scoreProfessional,
  type MatchContext,
} from './matching.ts'

const HOY = '2026-08-18'

function artist(
  overrides: Partial<Professional> & { id: string },
): Professional {
  return {
    slug: overrides.id,
    categorySlug: 'tattoo',
    displayName: overrides.id,
    bio: null,
    location: null,
    travels: false,
    styles: [],
    price: null,
    availability: null,
    instagramHandle: 'x',
    whatsappE164: null,
    isFixture: true,
    ...overrides,
  }
}

function styles(
  ...entries: ReadonlyArray<readonly [string, number, boolean?]>
) {
  return entries.map(([styleSlug, proficiency, isPrimary = false]) => ({
    styleSlug,
    proficiency,
    isPrimary,
  }))
}

function taste(
  scores: Record<string, number>,
  aversion: Record<string, number> = {},
): Pick<TasteProfile, 'scores' | 'aversion'> {
  return { scores, aversion }
}

function context(overrides: Partial<MatchContext> = {}): MatchContext {
  return { taste: taste({}), today: HOY, ...overrides }
}

const CABA = {
  id: 'loc-caba',
  slug: 'caba',
  city: 'Buenos Aires',
  adminArea: 'Ciudad Autónoma de Buenos Aires',
  countryCode: 'AR',
  metroKey: 'amba',
}
const LA_PLATA = {
  ...CABA,
  id: 'loc-lp',
  slug: 'la-plata',
  city: 'La Plata',
  metroKey: 'la-plata',
}
const VICENTE_LOPEZ = {
  ...CABA,
  id: 'loc-vl',
  slug: 'vicente-lopez',
  city: 'Vicente López',
}
const PALERMO = { ...CABA, id: 'loc-pal', slug: 'palermo' }
const CHACARITA = { ...CABA, id: 'loc-cha', slug: 'chacarita' }
/** Comuna 15, la misma que Chacarita. */
const VILLA_CRESPO = { ...CABA, id: 'loc-vc', slug: 'villa-crespo' }
/** Comuna 8, al otro extremo de la ciudad. */
const VILLA_LUGANO = { ...CABA, id: 'loc-lug', slug: 'villa-lugano' }

describe('componente de estilo', () => {
  it('coincidencia exacta da puntaje alto y banda fuerte', () => {
    const result = scoreProfessional(
      context({ taste: taste({ 'fine-line': 0.8, minimalist: 0.6 }) }),
      artist({
        id: 'a',
        styles: styles(['fine-line', 1, true], ['minimalist', 1, true]),
      }),
    )
    expect(result.score).toBeCloseTo(1, 10)
    expect(bandFor(result.score)).toBe('strong')
  })

  it('coincidencia parcial da un puntaje intermedio', () => {
    const result = scoreProfessional(
      context({ taste: taste({ 'fine-line': 0.8, blackwork: 0.8 }) }),
      artist({ id: 'a', styles: styles(['fine-line', 1, true]) }),
    )
    expect(result.score).toBeCloseTo(0.5, 10)
  })

  it('sin solapamiento cae por debajo del piso y no se devuelve', () => {
    const matches = matchProfessionals(
      context({ taste: taste({ 'fine-line': 0.8 }) }),
      [artist({ id: 'a', styles: styles(['japanese', 1, true]) })],
    )
    expect(matches).toEqual([])
  })

  it('la aversión resta a la mitad, no entera', () => {
    // Preferimos mostrar un artista levemente equivocado antes que suprimir en
    // silencio uno bueno.
    const conAversion = scoreProfessional(
      context({ taste: taste({ 'fine-line': 1 }, { blackwork: 1 }) }),
      artist({
        id: 'a',
        styles: styles(['fine-line', 1, true], ['blackwork', 1]),
      }),
    )
    expect(conAversion.components.style).toBeCloseTo(0.5, 10)
  })
})

describe('componente de ubicación', () => {
  const ctx = (locationSlug: string) =>
    context({
      taste: taste({ 'fine-line': 1 }),
      locationSlug,
      locationDiscriminates: true,
    })

  it('misma ciudad puntúa más que misma área metropolitana', () => {
    const misma = scoreProfessional(
      ctx('caba'),
      artist({
        id: 'a',
        location: CABA,
        styles: styles(['fine-line', 1, true]),
      }),
    )
    const metro = scoreProfessional(
      ctx('caba'),
      artist({
        id: 'b',
        location: VICENTE_LOPEZ,
        styles: styles(['fine-line', 1, true]),
      }),
    )
    expect(misma.components.location).toBe(1)
    expect(metro.components.location).toBe(0.55)
    expect(misma.score).toBeGreaterThan(metro.score)
  })

  it('el barrio ordena adentro de la ciudad', () => {
    // Es el punto entero de tener barrios: en una V1 que es toda CABA, "misma
    // ciudad" es constante y no discrimina nada.
    //
    // Desde Chacarita: Villa Crespo es la misma comuna (la 15), Palermo y
    // Villa Lugano son otras comunas, y Vicente López es otro partido.
    const escalon = (location: typeof PALERMO) =>
      scoreProfessional(
        ctx('chacarita'),
        artist({ id: 'a', location, styles: styles(['fine-line', 1, true]) }),
      ).components.location

    expect(escalon(CHACARITA)).toBe(1)
    expect(escalon(VILLA_CRESPO)).toBe(0.85)
    expect(escalon(PALERMO)).toBe(0.7)
    expect(escalon(VILLA_LUGANO)).toBe(0.7)
    expect(escalon(VICENTE_LOPEZ)).toBe(0.55)
  })

  it('no castiga al que no declaró barrio', () => {
    // Si el artista dijo "Palermo" y la persona solo "CABA", lo más preciso que
    // se puede afirmar es "misma ciudad" — y eso no es una mala noticia sobre
    // la distancia, es falta de dato. Bajarle el puntaje sería premiar a quien
    // no lo da.
    expect(
      scoreProfessional(
        ctx('caba'),
        artist({
          id: 'a',
          location: PALERMO,
          styles: styles(['fine-line', 1, true]),
        }),
      ).components.location,
    ).toBe(1)
  })

  it('la razón nombra el barrio, no la ciudad', () => {
    // "Trabaja en Palermo" le dice más a alguien de Buenos Aires que "trabaja
    // en Ciudad Autónoma de Buenos Aires", y entra en una línea.
    const contexto = ctx('palermo')
    const profesional = artist({
      id: 'a',
      location: PALERMO,
      styles: styles(['fine-line', 1, true]),
    })
    const razones = deriveReasons(
      contexto,
      profesional,
      scoreProfessional(contexto, profesional),
    )
    const razon = razones.find((r) => r.component === 'location')
    expect(razon?.terms).toEqual(['Palermo'])
  })

  it('otra ciudad: viajar vale más que no viajar', () => {
    const viaja = scoreProfessional(
      ctx('caba'),
      artist({
        id: 'a',
        location: LA_PLATA,
        travels: true,
        styles: styles(['fine-line', 1, true]),
      }),
    )
    const noViaja = scoreProfessional(
      ctx('caba'),
      artist({
        id: 'b',
        location: LA_PLATA,
        travels: false,
        styles: styles(['fine-line', 1, true]),
      }),
    )
    expect(viaja.components.location).toBe(0.4)
    expect(noViaja.components.location).toBe(0)
  })

  it('se omite cuando no discrimina', () => {
    // En V1 todos los artistas están en CABA: ubicación es constante y no aporta
    // señal de ranking. Ver matching.md §4.2.
    const result = scoreProfessional(
      context({
        taste: taste({ 'fine-line': 1 }),
        locationSlug: 'caba',
        locationDiscriminates: false,
      }),
      artist({
        id: 'a',
        location: CABA,
        styles: styles(['fine-line', 1, true]),
      }),
    )
    expect(result.components.location).toBeUndefined()
  })
})

describe('componente de precio', () => {
  const budget = { minCents: 5_000_00, maxCents: 15_000_00 }
  const price = (minCents: number, maxCents: number) => ({
    minCents,
    maxCents,
    currency: 'ARS',
    pricedAt: '2026-08-01',
  })

  it('solapado cubre la fracción correspondiente de la banda', () => {
    const value = priceComponent(
      context({ budget }),
      artist({ id: 'a', price: price(10_000_00, 20_000_00) }),
    )
    // Solapa de 10.000 a 15.000 sobre una banda de 10.000 → 0,5.
    expect(value).toBeCloseTo(0.5, 10)
  })

  it('contiguo pero disjunto da cero', () => {
    expect(
      priceComponent(
        context({ budget }),
        artist({ id: 'a', price: price(15_000_00, 30_000_00) }),
      ),
    ).toBeCloseTo(0, 10)
  })

  it('completamente disjunto da cero, no negativo', () => {
    expect(
      priceComponent(
        context({ budget }),
        artist({ id: 'a', price: price(40_000_00, 60_000_00) }),
      ),
    ).toBe(0)
  })

  it('se omite sin presupuesto o sin precio publicado', () => {
    expect(
      priceComponent(context({ budget }), artist({ id: 'a' })),
    ).toBeUndefined()
    expect(
      priceComponent(context({}), artist({ id: 'a', price: price(1, 2) })),
    ).toBeUndefined()
  })
})

describe('componente de disponibilidad', () => {
  const withAvailability = (status: 'open' | 'closed', updatedAt: string) =>
    artist({ id: 'a', availability: { status, updatedAt } })

  it('fresca y abierta vale 1', () => {
    expect(
      availabilityComponent(context(), withAvailability('open', '2026-08-10')),
    ).toBe(1)
  })

  it('fresca y cerrada vale 0,2 — no se omite', () => {
    expect(
      availabilityComponent(
        context(),
        withAvailability('closed', '2026-08-10'),
      ),
    ).toBe(0.2)
  })

  it('vieja se OMITE', () => {
    // MESH no afirma una disponibilidad que no puede sostener.
    expect(
      availabilityComponent(context(), withAvailability('open', '2026-01-01')),
    ).toBeUndefined()
  })

  it('una disponibilidad vieja no penaliza frente a no tener ninguna', () => {
    // Es el test explícito de matching.md §8: de los dos sabemos lo mismo, que
    // es nada, así que tienen que puntuar idéntico.
    const base = { styles: styles(['fine-line', 1, true]) }
    const vieja = scoreProfessional(
      context({ taste: taste({ 'fine-line': 1 }) }),
      artist({
        id: 'a',
        ...base,
        availability: { status: 'open', updatedAt: '2025-01-01' },
      }),
    )
    const ninguna = scoreProfessional(
      context({ taste: taste({ 'fine-line': 1 }) }),
      artist({ id: 'b', ...base }),
    )
    expect(vieja.score).toBe(ninguna.score)
  })
})

describe('renormalización por omisión', () => {
  it('un artista con solo estilo puntúa igual que uno con estilo perfecto y el resto desconocido', () => {
    // La regla que define el carácter del motor: un dato faltante nunca puede
    // parecer una mala respuesta.
    const soloEstilo = scoreProfessional(
      context({ taste: taste({ 'fine-line': 1 }) }),
      artist({ id: 'a', styles: styles(['fine-line', 1, true]) }),
    )
    expect(soloEstilo.score).toBe(1)
  })

  it('un componente omitido no arrastra el puntaje hacia abajo', () => {
    const conPrecio = scoreProfessional(
      context({
        taste: taste({ 'fine-line': 1 }),
        budget: { minCents: 100, maxCents: 200 },
      }),
      artist({
        id: 'a',
        styles: styles(['fine-line', 1, true]),
        price: {
          minCents: 100,
          maxCents: 200,
          currency: 'ARS',
          pricedAt: '2026-08-01',
        },
      }),
    )
    const sinPrecio = scoreProfessional(
      context({
        taste: taste({ 'fine-line': 1 }),
        budget: { minCents: 100, maxCents: 200 },
      }),
      artist({ id: 'b', styles: styles(['fine-line', 1, true]) }),
    )
    expect(sinPrecio.score).toBe(conPrecio.score)
  })

  it('sin ningún componente conocido el puntaje es 0, no NaN', () => {
    const result = scoreProfessional(context(), artist({ id: 'a' }))
    expect(result.score).toBe(0)
    expect(Number.isNaN(result.score)).toBe(false)
  })
})

describe('bandas', () => {
  it('respeta los límites de ADR-005', () => {
    expect(bandFor(0.75)).toBe('strong')
    expect(bandFor(0.7499)).toBe('good')
    expect(bandFor(0.55)).toBe('good')
    expect(bandFor(0.5499)).toBe('possible')
  })

  it('nada por debajo del piso llega a la lista', () => {
    const matches = matchProfessionals(
      context({ taste: taste({ 'fine-line': 1, japanese: 1, blackwork: 1 }) }),
      [artist({ id: 'a', styles: styles(['fine-line', 0.5]) })],
    )
    for (const match of matches)
      expect(match.score).toBeGreaterThanOrEqual(SCORE_FLOOR)
  })
})

describe('razones', () => {
  it('nunca referencian un componente omitido', () => {
    // Es el innegociable #2. La base también lo verifica con un CHECK.
    const professional = artist({
      id: 'a',
      styles: styles(['fine-line', 1, true]),
    })
    const ctx = context({ taste: taste({ 'fine-line': 1 }) })
    const breakdown = scoreProfessional(ctx, professional)
    const reasons = deriveReasons(ctx, professional, breakdown)

    const known = new Set(Object.keys(breakdown.components))
    for (const reason of reasons) expect(known.has(reason.component)).toBe(true)
  })

  it('son como mucho tres', () => {
    const professional = artist({
      id: 'a',
      styles: styles(['fine-line', 1, true], ['minimalist', 1, true]),
      location: CABA,
      price: {
        minCents: 100,
        maxCents: 200,
        currency: 'ARS',
        pricedAt: '2026-08-01',
      },
      availability: { status: 'open', updatedAt: '2026-08-15' },
    })
    const ctx = context({
      taste: taste({ 'fine-line': 1, minimalist: 1 }),
      locationSlug: 'caba',
      locationDiscriminates: true,
      budget: { minCents: 100, maxCents: 200 },
    })
    const reasons = deriveReasons(
      ctx,
      professional,
      scoreProfessional(ctx, professional),
    )
    expect(reasons.length).toBeLessThanOrEqual(3)
  })

  it('vienen ordenadas por aporte', () => {
    const professional = artist({
      id: 'a',
      styles: styles(['fine-line', 1, true], ['minimalist', 1, true]),
      location: CABA,
      availability: { status: 'open', updatedAt: '2026-08-15' },
    })
    const ctx = context({
      taste: taste({ 'fine-line': 1, minimalist: 1 }),
      locationSlug: 'caba',
      locationDiscriminates: true,
    })
    const reasons = deriveReasons(
      ctx,
      professional,
      scoreProfessional(ctx, professional),
    )
    for (let index = 1; index < reasons.length; index += 1) {
      expect(reasons[index - 1]!.contribution).toBeGreaterThanOrEqual(
        reasons[index]!.contribution,
      )
    }
  })

  it('no dice "está tomando turnos" si no está abierto', () => {
    const professional = artist({
      id: 'a',
      styles: styles(['fine-line', 1, true]),
      availability: { status: 'waitlist', updatedAt: '2026-08-15' },
    })
    const ctx = context({ taste: taste({ 'fine-line': 1 }) })
    const reasons = deriveReasons(
      ctx,
      professional,
      scoreProfessional(ctx, professional),
    )
    expect(
      reasons.some((r) => r.templateKey === 'match.reason.availability'),
    ).toBe(false)
  })

  it('no dice nada del precio si el solapamiento es cero', () => {
    const professional = artist({
      id: 'a',
      styles: styles(['fine-line', 1, true]),
      price: {
        minCents: 900,
        maxCents: 1000,
        currency: 'ARS',
        pricedAt: '2026-08-01',
      },
    })
    const ctx = context({
      taste: taste({ 'fine-line': 1 }),
      budget: { minCents: 100, maxCents: 200 },
    })
    const reasons = deriveReasons(
      ctx,
      professional,
      scoreProfessional(ctx, professional),
    )
    expect(reasons.some((r) => r.component === 'price')).toBe(false)
  })

  it('un candidato sin ninguna razón no se devuelve', () => {
    // Si no podemos decir por qué, no lo recomendamos.
    const matches = matchProfessionals(
      context({ taste: taste({ 'fine-line': 0.2 }) }),
      [artist({ id: 'a', styles: styles(['fine-line', 1]) })],
    )
    for (const match of matches) expect(match.reasons.length).toBeGreaterThan(0)
  })
})

describe('orden', () => {
  const catalog = [
    artist({ id: 'c', styles: styles(['fine-line', 1, true]) }),
    artist({ id: 'a', styles: styles(['fine-line', 1, true]) }),
    artist({
      id: 'b',
      styles: styles(['fine-line', 1, true], ['minimalist', 1, true]),
    }),
  ]
  const ctx = context({ taste: taste({ 'fine-line': 1, minimalist: 0.9 }) })

  it('es estable entre dos corridas idénticas', () => {
    const primera = matchProfessionals(ctx, catalog).map(
      (m) => m.professionalId,
    )
    const segunda = matchProfessionals(ctx, catalog).map(
      (m) => m.professionalId,
    )
    expect(primera).toEqual(segunda)
  })

  it('no depende del orden del array de entrada', () => {
    // Sin la clave final por id, dos corridas con el catálogo permutado darían
    // listas distintas y los tests E2E serían intermitentes.
    const normal = matchProfessionals(ctx, catalog).map((m) => m.professionalId)
    const permutado = matchProfessionals(ctx, [...catalog].reverse()).map(
      (m) => m.professionalId,
    )
    expect(normal).toEqual(permutado)
  })

  it('desempata por cantidad de estilos solapados', () => {
    const matches = matchProfessionals(
      context({ taste: taste({ 'fine-line': 1, minimalist: 1 }) }),
      [
        artist({
          id: 'z',
          styles: styles(['fine-line', 1, true], ['minimalist', 1, true]),
        }),
        artist({
          id: 'a',
          styles: styles(['fine-line', 1, true], ['minimalist', 1, true]),
        }),
      ],
    )
    expect(matches[0]?.professionalId).toBe('a')
  })
})

describe('matching por proyecto', () => {
  it('funciona con el perfil de gusto vacío', () => {
    // Alguien que llega con una idea clara no necesita deslizar primero.
    const blended = blendProjectStyles([{ styleSlug: 'japanese', weight: 1 }], {
      scores: {},
    })
    const matches = matchProfessionals(
      context({ taste: { scores: blended, aversion: {} } }),
      [artist({ id: 'a', styles: styles(['japanese', 1, true]) })],
    )
    expect(matches).toHaveLength(1)
    expect(matches[0]?.matchingVersion).toBe(MATCHING_VERSION)
  })

  it('el brief domina pero el gusto rompe empates', () => {
    const blended = blendProjectStyles([{ styleSlug: 'japanese', weight: 1 }], {
      scores: { 'fine-line': 1 },
    })
    expect(blended['japanese']).toBeCloseTo(0.75, 10)
    expect(blended['fine-line']).toBeCloseTo(0.25, 10)
  })

  it('normaliza los pesos declarados aunque no sumen 1', () => {
    const blended = blendProjectStyles(
      [
        { styleSlug: 'japanese', weight: 3 },
        { styleSlug: 'blackwork', weight: 1 },
      ],
      { scores: {} },
    )
    expect(blended['japanese']).toBeCloseTo(0.5625, 10)
    expect(blended['blackwork']).toBeCloseTo(0.1875, 10)
  })
})

describe('propiedades', () => {
  it('el puntaje siempre cae en [0, 1]', () => {
    const catalog = Array.from({ length: 20 }, (_, index) =>
      artist({
        id: `a${index}`,
        styles: styles(['fine-line', (index % 10) / 10 || 0.1]),
        travels: index % 2 === 0,
      }),
    )
    for (const professional of catalog) {
      const { score } = scoreProfessional(
        context({ taste: taste({ 'fine-line': 0.8 }, { blackwork: 0.4 }) }),
        professional,
      )
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })

  it('subir el gusto por un estilo nunca baja el puntaje de un artista de ese estilo', () => {
    const professional = artist({
      id: 'a',
      styles: styles(['fine-line', 1, true]),
    })
    let previous = 0
    for (const score of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const result = scoreProfessional(
        context({ taste: taste({ 'fine-line': score }) }),
        professional,
      )
      expect(result.score).toBeGreaterThanOrEqual(previous)
      previous = result.score
    }
  })

  it('las razones siempre son un subconjunto de los componentes con aporte', () => {
    const professional = artist({
      id: 'a',
      styles: styles(['fine-line', 1, true]),
      location: CABA,
      availability: { status: 'closed', updatedAt: '2026-08-15' },
    })
    const ctx = context({
      taste: taste({ 'fine-line': 1 }),
      locationSlug: 'caba',
      locationDiscriminates: true,
    })
    const breakdown = scoreProfessional(ctx, professional)
    for (const reason of deriveReasons(ctx, professional, breakdown)) {
      expect(breakdown.contributions[reason.component]).toBeGreaterThan(0)
    }
  })
})

describe('daysBetween', () => {
  it('cuenta días sin usar el reloj ni zonas horarias', () => {
    expect(daysBetween('2026-08-01', '2026-08-18')).toBe(17)
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365)
    // 2024 fue bisiesto.
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2)
  })

  it('devuelve null ante una fecha inválida', () => {
    expect(daysBetween('ayer', '2026-08-18')).toBeNull()
    expect(daysBetween('2026-13-01', '2026-08-18')).toBeNull()
  })
})
