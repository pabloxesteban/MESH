/**
 * Explorar: la grilla de toda la obra.
 *
 * Lo que importa verificar acá no es cómo se ve. Es que la grilla pida el feed
 * **con lo ya visto** —esconderlo haría que quien marcó obra no la encuentre—,
 * que cada obra termine en una persona, y que el filtro por estilo tenga
 * salida. El resto es composición.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { ExploreScreen } from './ExploreScreen.tsx'
import { COLUMNS, driftAt, phaseOf, splitIntoColumns } from './ArtworkGrid.tsx'
import { fetchDiscoveryFeed, type FeedItem } from './queries.ts'

jest.mock('./queries.ts', () => ({
  ...jest.requireActual('./queries.ts'),
  fetchDiscoveryFeed: jest.fn(),
  mediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))

const feedMock = fetchDiscoveryFeed as jest.Mock

function obra(id: string, patch: Partial<FeedItem> = {}): FeedItem {
  return {
    cursor: id,
    portfolioItemId: id,
    professionalId: `pro-${id}`,
    professionalSlug: `artista-${id}`,
    professionalName: `Artista ${id}`,
    isFixture: false,
    caption: null,
    year: null,
    mediaBucket: 'portfolio',
    mediaPath: `${id}/lg.jpg`,
    mediaWidth: 800,
    mediaHeight: 1000,
    blurhash: null,
    styles: [{ slug: 'fine-line', weight: 1 }],
    ...patch,
  }
}

function renderExplore(onOpenProfile = jest.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider locale="es-AR">
            <ExploreScreen
              categorySlug="tattoo"
              userId="u1"
              onOpenArtist={onOpenProfile}
            />
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
  return onOpenProfile
}

beforeEach(() => {
  jest.clearAllMocks()
  feedMock.mockResolvedValue({
    items: [obra('a'), obra('b')],
    nextCursor: null,
  })
})

describe('splitIntoColumns', () => {
  it('son tres columnas', () => {
    expect(COLUMNS).toBe(3)
    expect(splitIntoColumns([obra('a')])).toHaveLength(3)
  })

  it('no pierde ni repite ninguna obra', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => obra(id))
    const ids = splitIntoColumns(items)
      .flat()
      .map((item) => item.portfolioItemId)
      .sort()
    expect(ids).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  })

  it('reparte a la columna más corta, no alternando', () => {
    // Una obra muy alta y después bajas: alternar dejaría una columna mucho
    // más larga que las otras, que es exactamente lo que se ve mal.
    const items = [
      obra('alta', { mediaWidth: 400, mediaHeight: 1600 }),
      obra('b1', { mediaWidth: 1000, mediaHeight: 500 }),
      obra('b2', { mediaWidth: 1000, mediaHeight: 500 }),
      obra('b3', { mediaWidth: 1000, mediaHeight: 500 }),
    ]
    const [primera, segunda, tercera] = splitIntoColumns(items)
    expect(primera?.map((i) => i.portfolioItemId)).toEqual(['alta'])
    expect(segunda?.map((i) => i.portfolioItemId)).toEqual(['b1', 'b3'])
    expect(tercera?.map((i) => i.portfolioItemId)).toEqual(['b2'])
  })

  it('una obra sin medidas no rompe el reparto', () => {
    const columnas = splitIntoColumns([
      obra('x', { mediaWidth: null, mediaHeight: null }),
    ])
    expect(columnas.flat()).toHaveLength(1)
  })
})

describe('el vaivén de las columnas', () => {
  it('las tres están repartidas en el ciclo, no juntas', () => {
    // Si dos columnas compartieran fase se moverían pegadas y no habría
    // desfasaje que ver. Un tercio de vuelta cada una es lo más separado que
    // se puede con tres.
    expect([0, 1, 2].map((i) => phaseOf(i))).toEqual([0, 1 / 3, 2 / 3])
  })

  it('nunca se corre más de lo permitido', () => {
    // El techo es lo que hace que esto sea un detalle y no un problema: la
    // grilla nunca se ve descolgada, y la transición obra → artista arranca
    // como mucho a ocho puntos de donde estaba la obra.
    let maximo = 0
    for (let paso = 0; paso <= 200; paso++) {
      for (const columna of [0, 1, 2]) {
        maximo = Math.max(maximo, Math.abs(driftAt(paso / 200, columna)))
      }
    }
    expect(maximo).toBeLessThanOrEqual(8.001)
  })

  it('el ciclo cierra sin salto', () => {
    // Es la razón de usar una sinusoide: al volver de 1 a 0 el valor tiene que
    // ser el mismo, o cada vuelta se vería un tirón.
    for (const columna of [0, 1, 2]) {
      expect(driftAt(1, columna)).toBeCloseTo(driftAt(0, columna), 10)
    }
  })

  it('se mueve de verdad a lo largo del ciclo', () => {
    // Un test que solo mirara el techo pasaría con una función que devuelve
    // siempre cero.
    const recorrido = [0, 0.25, 0.5, 0.75].map((p) => driftAt(p, 0))
    expect(Math.max(...recorrido) - Math.min(...recorrido)).toBeGreaterThan(10)
  })

  it('en un mismo instante las columnas están en lugares distintos', () => {
    const enUnMomento = [0, 1, 2].map((i) => driftAt(0.1, i))
    expect(new Set(enUnMomento.map((v) => v.toFixed(3))).size).toBe(3)
  })
})

describe('Explorar', () => {
  it('pide el feed CON lo ya visto', async () => {
    renderExplore()
    await waitFor(() => expect(feedMock).toHaveBeenCalled())

    // Sin esto, quien marcó treinta obras abre Descubrir y no encuentra
    // ninguna de ellas.
    expect(feedMock.mock.calls[0]?.[2]).toEqual({ includeSeen: true })
  })

  it('tocar una obra lleva a su artista', async () => {
    const onOpenProfile = renderExplore()
    await waitFor(() =>
      expect(screen.getByTestId('discovery-tile-a')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('discovery-tile-a'))

    // Ninguna superficie de MESH termina en una obra: todas terminan en una
    // persona.
    expect(onOpenProfile).toHaveBeenCalledWith('artista-a')
  })

  it('la obra no muestra el nombre del artista, pero sí lo anuncia', async () => {
    renderExplore()
    await waitFor(() =>
      expect(screen.getByTestId('discovery-tile-a')).toBeTruthy(),
    )

    // Con un pie por obra la grilla se vuelve una lista de gente. Ver
    // MESH-VISUAL-DIRECTION-2 §4.
    expect(screen.queryByText('Artista a')).toBeNull()
    // Pero un lector de pantalla no puede "tocar para ver".
    expect(
      screen.getByTestId('discovery-tile-a').props.accessibilityLabel,
    ).toContain('Artista a')
  })

  it('filtrar por un estilo que no está deja una salida, no un callejón', async () => {
    feedMock.mockResolvedValue({
      items: [
        obra('a', { styles: [{ slug: 'fine-line', weight: 1 }] }),
        obra('b', { styles: [{ slug: 'blackwork', weight: 1 }] }),
      ],
      nextCursor: null,
    })
    renderExplore()
    await waitFor(() =>
      expect(screen.getByTestId('explore-filter-blackwork')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('explore-filter-blackwork'))
    await waitFor(() =>
      expect(screen.getByTestId('discovery-tile-b')).toBeTruthy(),
    )
    expect(screen.queryByTestId('discovery-tile-a')).toBeNull()
  })

  it('solo ofrece filtros de estilos que existen en lo que bajó', async () => {
    feedMock.mockResolvedValue({
      items: [obra('a', { styles: [{ slug: 'fine-line', weight: 1 }] })],
      nextCursor: null,
    })
    renderExplore()
    await waitFor(() =>
      expect(screen.getByTestId('explore-filter-fine-line')).toBeTruthy(),
    )
    // Un chip que no filtra nada es una promesa vacía.
    expect(screen.queryByTestId('explore-filter-blackwork')).toBeNull()
  })

  it('sin catálogo ofrece una salida', async () => {
    feedMock.mockResolvedValue({ items: [], nextCursor: null })
    renderExplore()
    await waitFor(() =>
      expect(screen.getByTestId('explore-empty')).toBeTruthy(),
    )
  })

  it('abre filtrado cuando llega desde buscar con una foto', async () => {
    feedMock.mockResolvedValue({
      items: [
        obra('a', { styles: [{ slug: 'fine-line', weight: 1 }] }),
        obra('b', { styles: [{ slug: 'blackwork', weight: 1 }] }),
      ],
      nextCursor: null,
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <MotionProvider>
            <I18nProvider locale="es-AR">
              <ExploreScreen
                categorySlug="tattoo"
                userId="u1"
                onOpenArtist={jest.fn()}
                initialStyle="blackwork"
              />
            </I18nProvider>
          </MotionProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    )

    // Es a dónde termina el camino con IA: la referencia se clasificó y
    // Explorar abre mostrando eso, no una lista de encajes.
    await waitFor(() =>
      expect(screen.getByTestId('discovery-tile-b')).toBeTruthy(),
    )
    expect(screen.queryByTestId('discovery-tile-a')).toBeNull()
  })
})
