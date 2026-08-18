import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { Professional } from '@mesh/domain'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { MatchesScreen } from './MatchesScreen.tsx'

jest.mock('./queries.ts', () => ({
  fetchCatalog: jest.fn(),
  persistMatches: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../taste/queries.ts', () => ({
  fetchTasteSource: jest.fn(),
  persistTaste: jest.fn().mockResolvedValue(undefined),
  fetchCategoryId: jest.fn().mockResolvedValue('cat-1'),
  resetTaste: jest.fn().mockResolvedValue(undefined),
}))

import { fetchCatalog, persistMatches } from './queries.ts'
import { fetchTasteSource } from '../taste/queries.ts'

const catalogMock = fetchCatalog as jest.MockedFunction<typeof fetchCatalog>
const tasteMock = fetchTasteSource as jest.MockedFunction<
  typeof fetchTasteSource
>

const HOY = '2026-08-18'

function artist(id: string, styleSlugs: readonly string[]): Professional {
  return {
    id,
    slug: id,
    categorySlug: 'tattoo',
    displayName: `${id}`,
    bio: null,
    location: null,
    travels: false,
    styles: styleSlugs.map((styleSlug) => ({
      styleSlug,
      proficiency: 1,
      isPrimary: true,
    })),
    price: null,
    availability: null,
    instagramHandle: id,
    whatsappE164: null,
    isFixture: true,
  }
}

/** n interacciones repartidas entre los estilos dados. */
function tasteSource(count: number, styleSlugs: readonly string[]) {
  const interactions = Array.from({ length: count }, (_, index) => ({
    portfolioItemId: `p${index}`,
    verdict: 'like' as const,
    isSaved: false,
    source: 'discover' as const,
  }))
  const pieces = new Map(
    interactions.map((interaction, index) => [
      interaction.portfolioItemId,
      {
        portfolioItemId: interaction.portfolioItemId,
        styles: [
          {
            styleSlug: styleSlugs[index % styleSlugs.length] as string,
            weight: 1,
          },
        ],
      },
    ]),
  )
  return { interactions, pieces }
}

function render() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const onExplore = jest.fn()
  const onOpenProfile = jest.fn()
  renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">
        <MatchesScreen
          userId="user-1"
          today={HOY}
          onExplore={onExplore}
          onOpenProfile={onOpenProfile}
        />
      </I18nProvider>
    </QueryClientProvider>,
  )
  return { onExplore, onOpenProfile }
}

beforeEach(() => {
  jest.clearAllMocks()
  catalogMock.mockResolvedValue([])
})

describe('MatchesScreen', () => {
  it('no muestra matches antes del umbral, y dice cuántas faltan', async () => {
    // Nada de una lista de "populares" disfrazada de recomendación mientras
    // tanto. Ver matching.md §6.
    tasteMock.mockResolvedValue(tasteSource(5, ['fine-line']))
    const { onExplore } = render()

    await waitFor(() =>
      expect(screen.getByTestId('matches-not-ready')).toBeTruthy(),
    )
    expect(screen.getByText(/7 decisiones/)).toBeTruthy()
    expect(catalogMock).not.toHaveBeenCalled()

    fireEvent.press(screen.getByText('Ir al mazo'))
    expect(onExplore).toHaveBeenCalled()
  })

  it('muestra el vacío honesto cuando nadie llega al piso', async () => {
    // Una lista corta y honesta le gana a una rellenada.
    tasteMock.mockResolvedValue(
      tasteSource(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    catalogMock.mockResolvedValue([artist('a', ['japanese'])])
    render()

    await waitFor(() =>
      expect(screen.getByTestId('matches-empty')).toBeTruthy(),
    )
    expect(screen.getByText('Seguir explorando')).toBeTruthy()
  })

  it('muestra la banda y nunca un porcentaje', async () => {
    tasteMock.mockResolvedValue(
      tasteSource(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    catalogMock.mockResolvedValue([
      artist('a', ['fine-line', 'dotwork', 'blackwork']),
    ])
    render()

    await waitFor(() => expect(screen.getByTestId('matches-list')).toBeTruthy())
    expect(screen.getByText('Encaje fuerte')).toBeTruthy()
    // Ver ADR-005.
    expect(screen.queryByText(/\d+\s*%/)).toBeNull()
    expect(screen.queryByText(/0[.,]\d\d/)).toBeNull()
  })

  it('muestra una razón por cada componente que aportó', async () => {
    tasteMock.mockResolvedValue(
      tasteSource(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    catalogMock.mockResolvedValue([artist('a', ['fine-line', 'dotwork'])])
    render()

    await waitFor(() => expect(screen.getByTestId('matches-list')).toBeTruthy())
    // La plantilla `worksBoth` con dos estilos primarios del top del usuario.
    expect(screen.getByText(/Trabaja .* y /)).toBeTruthy()
  })

  it('traduce los slugs de estilo dentro de la razón', async () => {
    tasteMock.mockResolvedValue(
      tasteSource(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    catalogMock.mockResolvedValue([artist('a', ['fine-line', 'dotwork'])])
    render()

    await waitFor(() => expect(screen.getByTestId('matches-list')).toBeTruthy())
    // "Línea fina", no "fine-line": el slug es estable, el nombre se traduce.
    expect(screen.queryByText(/fine-line/)).toBeNull()
    expect(screen.getByText(/Línea fina/)).toBeTruthy()
  })

  it('guarda los matches para poder auditarlos', async () => {
    tasteMock.mockResolvedValue(
      tasteSource(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    catalogMock.mockResolvedValue([
      artist('a', ['fine-line', 'dotwork', 'blackwork']),
    ])
    render()

    await waitFor(() => expect(persistMatches).toHaveBeenCalled())
    const [, payload] = (persistMatches as jest.Mock).mock.calls[0] ?? []
    expect(payload[0]).toMatchObject({
      matchingVersion: 'match/1',
      tasteVersion: 'taste/1',
    })
    // Toda razón guardada nombra un componente presente en `components`. La
    // base también lo verifica con un CHECK.
    for (const reason of payload[0].reasons) {
      expect(payload[0].components[reason.component]).toBeGreaterThan(0)
    }
  })

  it('abre el perfil al tocar una tarjeta', async () => {
    tasteMock.mockResolvedValue(
      tasteSource(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    catalogMock.mockResolvedValue([
      artist('a', ['fine-line', 'dotwork', 'blackwork']),
    ])
    const { onOpenProfile } = render()

    await waitFor(() => expect(screen.getByTestId('matches-list')).toBeTruthy())
    fireEvent(screen.getByTestId('match-a'), 'touchEnd')
    expect(onOpenProfile).toHaveBeenCalledWith('a')
  })

  it('marca los registros ficticios en la tarjeta de encaje', async () => {
    // Con el nombre ya sin prefijo, la insignia es lo único que distingue un
    // encaje de prueba de uno real. Ver content-policy §4.3.
    tasteMock.mockResolvedValue(
      tasteSource(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    catalogMock.mockResolvedValue([
      artist('a', ['fine-line', 'dotwork', 'blackwork']),
    ])
    render()
    await waitFor(() => expect(screen.getByTestId('matches-list')).toBeTruthy())
    expect(screen.getAllByTestId('match-fixture-badge').length).toBeGreaterThan(
      0,
    )
  })

  it('muestra error con reintentar y sin el mensaje crudo', async () => {
    tasteMock.mockRejectedValue({
      code: '42501',
      message: 'permission denied for table matches',
    })
    render()
    await waitFor(() =>
      expect(screen.getByTestId('matches-error')).toBeTruthy(),
    )
    expect(screen.queryByText(/permission denied/i)).toBeNull()
  })
})
