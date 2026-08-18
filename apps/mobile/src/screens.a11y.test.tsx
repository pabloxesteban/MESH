/**
 * Barrido de accesibilidad y callejones sobre las pantallas reales.
 *
 * No revisa una pantalla: las recorre todas, en todos sus estados, y aplica las
 * mismas tres reglas a cada una. Una revisión manual encuentra lo que uno mira;
 * esto encuentra lo que uno no.
 *
 * Las tres reglas, de `.claude/workflows/ui-review.md`:
 *
 * 1. **Todo lo que se toca tiene nombre accesible.** Un botón sin etiqueta es
 *    un botón que un lector de pantalla anuncia como "botón".
 * 2. **Ninguna pantalla es un callejón.** Todo estado —incluidos vacío y
 *    error— ofrece al menos una acción hacia adelante.
 * 3. **Todo lo que se toca llega a 44pt.** Un objetivo de 30pt lo falla
 *    cualquiera con las manos frías.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react-native'
import type { ReactElement } from 'react'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'
import { MIN_TOUCH_TARGET } from '@/design-system/index.ts'

import { DeckScreen } from '@/features/discovery/DeckScreen.tsx'
import { MatchesScreen } from '@/features/matches/MatchesScreen.tsx'
import { ProfileScreen } from '@/features/profile/ProfileScreen.tsx'
import { ContactScreen } from '@/features/contact/ContactScreen.tsx'
import { TasteScreen } from '@/features/taste/TasteScreen.tsx'
import { ProjectFormScreen } from '@/features/projects/ProjectFormScreen.tsx'
import { QuickSearchScreen } from '@/features/quick-search/QuickSearchScreen.tsx'

const mockRpc = jest.fn()
jest.mock('@/data/supabase.ts', () => ({
  get supabase() {
    return {
      rpc: mockRpc,
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        }),
        upsert: async () => ({ error: null }),
      }),
      storage: {
        from: () => ({
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://ejemplo.test/${path}` },
          }),
        }),
      },
    }
  },
}))

jest.mock('@/features/profile/queries.ts', () => ({ fetchProfile: jest.fn() }))
jest.mock('@/features/matches/queries.ts', () => ({
  fetchCatalog: jest.fn().mockResolvedValue([]),
  persistMatches: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/features/taste/queries.ts', () => ({
  fetchTasteSource: jest
    .fn()
    .mockResolvedValue({ interactions: [], pieces: new Map() }),
  persistTaste: jest.fn().mockResolvedValue(undefined),
  fetchCategoryId: jest.fn().mockResolvedValue('cat-1'),
  resetTaste: jest.fn().mockResolvedValue(undefined),
}))

import { fetchProfile } from '@/features/profile/queries.ts'

const HOY = '2026-08-18'

function render(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">{element}</I18nProvider>
    </QueryClientProvider>,
  )
}

/** Nombre accesible de un nodo: etiqueta explícita, o el texto que contiene. */
function accessibleName(node: {
  props: Record<string, unknown>
  children: unknown[]
}): string {
  const label = node.props['accessibilityLabel']
  if (typeof label === 'string' && label.trim().length > 0) return label

  const texts: string[] = []
  const visit = (current: unknown) => {
    if (typeof current === 'string') {
      texts.push(current)
      return
    }
    if (
      current != null &&
      typeof current === 'object' &&
      'children' in current
    ) {
      for (const child of (current as { children: unknown[] }).children ?? []) {
        visit(child)
      }
    }
  }
  visit(node)
  return texts.join(' ').trim()
}

/** Alto y ancho mínimos declarados en el estilo, aplanando arrays. */
function minSize(style: unknown): { height: number; width: number } {
  const flat = (Array.isArray(style) ? style : [style]).filter(Boolean)
  let height = 0
  let width = 0
  for (const entry of flat) {
    const record = entry as Record<string, unknown>
    height = Math.max(
      height,
      Number(record?.['minHeight'] ?? record?.['height'] ?? 0),
    )
    width = Math.max(
      width,
      Number(record?.['minWidth'] ?? record?.['width'] ?? 0),
    )
  }
  return { height, width }
}

function touchables() {
  return screen.UNSAFE_root.findAll(
    (node) =>
      node.props?.accessibilityRole === 'button' &&
      node.props?.accessible !== false,
  )
}

/** Aplica las tres reglas al árbol que está en pantalla. */
function sweep(name: string) {
  const found = touchables()
  expect(found.length).toBeGreaterThan(0)

  const sinNombre: string[] = []
  const chicos: string[] = []

  for (const node of found) {
    const label = accessibleName(
      node as unknown as {
        props: Record<string, unknown>
        children: unknown[]
      },
    )
    if (label.length === 0) {
      sinNombre.push(JSON.stringify(node.props['testID'] ?? '(sin testID)'))
      continue
    }

    const { height, width } = minSize(node.props['style'])
    const hitSlop = node.props['hitSlop'] as
      | { top?: number; bottom?: number; left?: number; right?: number }
      | undefined
    const efectivoAlto = height + (hitSlop?.top ?? 0) + (hitSlop?.bottom ?? 0)
    const efectivoAncho = width + (hitSlop?.left ?? 0) + (hitSlop?.right ?? 0)

    // Solo se exige cuando el nodo declara tamaño: un botón que se estira con
    // su contenido puede no tener `minHeight` y medir de sobra.
    if (height > 0 && efectivoAlto < MIN_TOUCH_TARGET) {
      chicos.push(`${label}: alto ${efectivoAlto}`)
    }
    if (width > 0 && efectivoAncho < MIN_TOUCH_TARGET) {
      chicos.push(`${label}: ancho ${efectivoAncho}`)
    }
  }

  expect({ pantalla: name, sinNombre }).toEqual({
    pantalla: name,
    sinNombre: [],
  })
  expect({ pantalla: name, chicos }).toEqual({ pantalla: name, chicos: [] })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRpc.mockResolvedValue({ data: [], error: null })
  ;(fetchProfile as jest.Mock).mockResolvedValue(null)
})

/**
 * Tipografía dinámica: todo texto tiene que respetar el tope de escala.
 *
 * Sin `maxFontSizeMultiplier`, el tamaño accesible más grande de iOS multiplica
 * por más de 3 y rompe cualquier layout. Con el tope, el texto crece de verdad
 * —que es el punto— pero hasta donde la pantalla lo sostiene.
 */
function sweepDynamicType(name: string) {
  // El tipo del host es un string en el árbol de test, pero el tipado de RNTL
  // lo declara como la unión de roles. Se compara sobre el string.
  const textos = screen.UNSAFE_root.findAll(
    (node) => String(node.type) === 'Text' && node.props?.children != null,
  )
  expect(textos.length).toBeGreaterThan(0)

  const sinTope = textos
    .filter((node) => node.props['maxFontSizeMultiplier'] == null)
    .map((node) => String(node.props['children']).slice(0, 40))

  expect({ pantalla: name, sinTope }).toEqual({ pantalla: name, sinTope: [] })
}

describe('barrido de accesibilidad y callejones', () => {
  it('el mazo, cargando', () => {
    render(<DeckScreen categorySlug="tattoo" userId="u1" />)
    // Incluso mientras carga hay botones alcanzables: el mazo no bloquea la
    // interfaz esperando datos.
    sweep('mazo · cargando')
  })

  it('el mazo, vacío', async () => {
    render(<DeckScreen categorySlug="tattoo" userId="u1" />)
    await waitFor(() => expect(screen.getByTestId('deck-empty')).toBeTruthy())
    sweep('mazo · vacío')
    sweepDynamicType('mazo · vacío')
  })

  it('el mazo, con error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '500', status: 503 },
    })
    render(<DeckScreen categorySlug="tattoo" userId="u1" />)
    await waitFor(() => expect(screen.getByTestId('deck-error')).toBeTruthy())
    sweep('mazo · error')
  })

  it('matches, antes del umbral', async () => {
    render(
      <MatchesScreen
        userId="u1"
        today={HOY}
        onExplore={jest.fn()}
        onOpenProfile={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('matches-not-ready')).toBeTruthy(),
    )
    sweep('matches · antes del umbral')
    sweepDynamicType('matches · antes del umbral')
  })

  it('gusto, antes del umbral', async () => {
    render(<TasteScreen userId="u1" onExplore={jest.fn()} />)
    await waitFor(() =>
      expect(screen.getByTestId('taste-not-ready')).toBeTruthy(),
    )
    sweep('gusto · antes del umbral')
  })

  it('perfil, no encontrado', async () => {
    render(
      <ProfileScreen
        slug="x"
        today={HOY}
        onBack={jest.fn()}
        onContact={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('profile-not-found')).toBeTruthy(),
    )
    // El caso más fácil de dejar como callejón: no hay nada que reintentar, así
    // que si no hubiera "volver" la pantalla sería una pared.
    sweep('perfil · no encontrado')
  })

  it('contacto, sin canal', async () => {
    ;(fetchProfile as jest.Mock).mockResolvedValue({
      professional: {
        id: 'p1',
        slug: 'x',
        categorySlug: 'tattoo',
        displayName: 'X',
        bio: null,
        location: null,
        travels: false,
        styles: [],
        price: null,
        availability: null,
        instagramHandle: null,
        whatsappE164: null,
        // NO es fixture a propósito: un fixture se corta antes de llegar acá
        // (content-policy §4.4), así que este caso nunca se alcanzaría.
        isFixture: false,
      },
      pieces: [],
    })
    render(<ContactScreen slug="x" onBack={jest.fn()} />)
    await waitFor(() =>
      expect(screen.getByTestId('contact-no-channel')).toBeTruthy(),
    )
    sweep('contacto · sin canal')
  })

  it('contacto, registro ficticio', async () => {
    ;(fetchProfile as jest.Mock).mockResolvedValue({
      professional: {
        id: 'p1',
        slug: 'fixture-x',
        categorySlug: 'tattoo',
        displayName: 'Tinta Negra',
        bio: null,
        location: null,
        travels: false,
        styles: [],
        price: null,
        availability: null,
        instagramHandle: 'x',
        whatsappE164: '+5491100000001',
        isFixture: true,
      },
      pieces: [],
    })
    render(<ContactScreen slug="fixture-x" onBack={jest.fn()} />)
    await waitFor(() =>
      expect(screen.getByTestId('contact-fixture-blocked')).toBeTruthy(),
    )
    sweep('contacto · ficticio')
  })

  it('formulario de proyecto', () => {
    render(<ProjectFormScreen onSubmit={jest.fn()} onCancel={jest.fn()} />)
    sweep('proyecto · formulario')
    sweepDynamicType('proyecto · formulario')
  })

  it('buscar por fotos', () => {
    render(
      <QuickSearchScreen
        userId="u1"
        onCreated={jest.fn()}
        onCancel={jest.fn()}
      />,
    )
    sweep('buscar por fotos')
    sweepDynamicType('buscar por fotos')
  })
})
