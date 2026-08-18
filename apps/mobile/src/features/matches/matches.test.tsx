import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import {
  MATCHING_VERSION,
  TASTE_VERSION,
  type Professional,
} from '@mesh/domain'

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

function artist(
  id: string,
  styleSlugs: readonly string[],
  location: Professional['location'] = null,
): Professional {
  return {
    id,
    slug: id,
    categorySlug: 'tattoo',
    displayName: `${id}`,
    bio: null,
    location,
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

function render(
  overrides: Partial<
    Pick<Parameters<typeof MatchesScreen>[0], 'project' | 'onSearchByPhotos'>
  > = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const onExplore = jest.fn()
  const onOpenProfile = jest.fn()
  const onSearchByPhotos = overrides.onSearchByPhotos ?? jest.fn()
  renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">
        <MatchesScreen
          userId="user-1"
          today={HOY}
          onExplore={onExplore}
          onOpenProfile={onOpenProfile}
          onSearchByPhotos={onSearchByPhotos}
          {...(overrides.project != null ? { project: overrides.project } : {})}
        />
      </I18nProvider>
    </QueryClientProvider>,
  )
  return { onExplore, onOpenProfile, onSearchByPhotos }
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
    // Contra las constantes y no contra una copia del string: una versión
    // pegada a mano deja pasar la próxima subida sin que nadie mire los
    // fixtures, que es justo lo que el versionado existe para forzar.
    expect(payload[0]).toMatchObject({
      matchingVersion: MATCHING_VERSION,
      tasteVersion: TASTE_VERSION,
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

  it('un proyecto con barrio hace que la ubicación discrimine — regresión del bug de useMatches', async () => {
    // useMatches.ts mandaba locationDiscriminates:false siempre, con un
    // comentario de cuando toda la ciudad era una sola ubicación. Con barrios
    // eso dejaba de tener sentido: un proyecto que declaró locationSlug tiene
    // que poder discriminar por ubicación. Este test falla si alguien vuelve a
    // hardcodear ese `false`.
    catalogMock.mockResolvedValue([
      artist('cerca', ['fine-line'], {
        id: 'loc-palermo',
        slug: 'palermo',
        city: 'Ciudad Autónoma de Buenos Aires',
        adminArea: 'Buenos Aires',
        countryCode: 'AR',
        metroKey: 'amba',
      }),
      artist('lejos', ['fine-line'], {
        id: 'loc-lugano',
        slug: 'villa-lugano',
        city: 'Ciudad Autónoma de Buenos Aires',
        adminArea: 'Buenos Aires',
        countryCode: 'AR',
        metroKey: 'amba',
      }),
    ])

    render({
      project: {
        id: 'proj-1',
        styles: [{ styleSlug: 'fine-line', weight: 1 }],
        locationSlug: 'palermo',
      },
    })

    await waitFor(() => expect(screen.getByTestId('matches-list')).toBeTruthy())
    // El de Palermo tiene que puntuar más alto que el de Villa Lugano — si la
    // ubicación se sigue omitiendo, los dos empatan solo por estilo.
    const cards = screen.getAllByTestId(/^match-/)
    expect(cards[0]?.props.testID).toBe('match-cerca')
  })

  it('la razón de ubicación muestra el barrio, no "undefined" — regresión de renderReason', async () => {
    // Bug real: renderReason adivinaba si un término era un slug de estilo
    // probando la traducción, y la prueba estaba rota — traducía CUALQUIER
    // término que no fuera un estilo como undefined. Nunca se vio en
    // producción porque hasta el fix de barrios ningún match generaba una
    // razón de ubicación de verdad.
    catalogMock.mockResolvedValue([
      artist('lejos', ['fine-line'], {
        id: 'loc-lugano',
        slug: 'villa-lugano',
        city: 'Ciudad Autónoma de Buenos Aires',
        adminArea: 'Buenos Aires',
        countryCode: 'AR',
        metroKey: 'amba',
      }),
    ])

    render({
      project: {
        id: 'proj-1',
        styles: [{ styleSlug: 'fine-line', weight: 1 }],
        locationSlug: 'palermo',
      },
    })

    await waitFor(() => expect(screen.getByTestId('matches-list')).toBeTruthy())
    expect(screen.getByText(/En Villa Lugano/)).toBeTruthy()
    expect(screen.queryByText(/undefined/i)).toBeNull()
  })

  it('ofrece "buscar por fotos" en los dos estados vacíos', async () => {
    tasteMock.mockResolvedValue(tasteSource(5, ['fine-line']))
    const { onSearchByPhotos } = render()
    await waitFor(() =>
      expect(screen.getByTestId('matches-not-ready')).toBeTruthy(),
    )
    fireEvent.press(screen.getByText('O buscá por fotos'))
    expect(onSearchByPhotos).toHaveBeenCalled()
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
