/**
 * Buscar a alguien por nombre.
 *
 * Lo que hay que verificar acá no es que el filtro filtre —eso lo hace la base
 * y lo prueba `supabase/tests/61_search_by_name.sql`— sino las cuatro cosas
 * que la pantalla promete y podría romper en silencio:
 *
 * · Que **una letra sola no salga a la red**. Es el piso que evita que
 *   escribir un nombre sean siete consultas de las que seis sobran.
 * · Que mientras se busca **no se prometa un orden por cercanía**: el
 *   encabezado de ubicación se va, y las tarjetas no muestran kilómetros.
 * · Que borrar el campo **devuelva la grilla enseguida**, sin dejar el
 *   resultado viejo colgado un cuarto de segundo.
 * · Que el vacío diga a quién se buscó y tenga una salida.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { ArtistsScreen } from './ArtistsScreen.tsx'
import {
  fetchArtistGrid,
  searchArtists,
  type ArtistCardData,
} from './queries.ts'

jest.mock('./queries.ts', () => ({
  ...jest.requireActual('./queries.ts'),
  fetchArtistGrid: jest.fn(),
  searchArtists: jest.fn(),
  avatarUrl: (path: string) => `https://ejemplo.test/${path}`,
  mediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))

jest.mock('@/features/location/useDeviceLocation.ts', () => ({
  useDeviceLocation: () => ({
    status: 'granted',
    location: {
      coordinates: { lat: -34.5875, lng: -58.4371 },
      neighborhoodSlug: 'palermo',
    },
    request: jest.fn(),
  }),
}))

jest.mock('@/features/location/useSearchLocation.ts', () => ({
  ...jest.requireActual('@/features/location/useSearchLocation.ts'),
  useSearchLocation: () => ({
    value: { mode: 'device', neighborhoodSlug: null },
    isLoading: false,
    set: jest.fn(),
  }),
}))

const gridMock = fetchArtistGrid as jest.Mock
const searchMock = searchArtists as jest.Mock

function artista(
  slug: string,
  patch: Partial<ArtistCardData> = {},
): ArtistCardData {
  return {
    professionalId: `pro-${slug}`,
    slug,
    displayName: `Artista ${slug}`,
    isFixture: false,
    avatarPath: null,
    neighborhoodSlug: 'palermo',
    studioCoordinates: { lat: -34.6212, lng: -58.3731 },
    pieces: [
      {
        id: `${slug}-1`,
        mediaPath: `${slug}/lg.jpg`,
        width: 800,
        height: 1000,
        blurhash: null,
      },
    ],
    ...patch,
  }
}

function renderArtists(onExplore = jest.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider locale="es-AR">
            <ArtistsScreen
              categorySlug="tattoo"
              userId="u1"
              onOpenArtist={jest.fn()}
              onExplore={onExplore}
              onChangeLocation={jest.fn()}
            />
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
  return onExplore
}

/** Adelanta el reloj más allá del freno del campo. */
async function despuesDelFreno() {
  await act(async () => {
    jest.advanceTimersByTime(400)
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  gridMock.mockResolvedValue([artista('uno')])
  searchMock.mockResolvedValue([artista('roig')])
})

afterEach(() => {
  jest.useRealTimers()
})

describe('buscar por nombre', () => {
  it('una sola letra no sale a la red', async () => {
    renderArtists()
    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    fireEvent.changeText(screen.getByTestId('artists-search'), 'r')
    await despuesDelFreno()

    expect(searchMock).not.toHaveBeenCalled()
    // Y la grilla sigue ahí: no pasó nada, así que no cambió nada.
    expect(screen.getByTestId('artists-list')).toBeTruthy()
  })

  it('con dos letras busca, y muestra lo que vuelve', async () => {
    renderArtists()
    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    fireEvent.changeText(screen.getByTestId('artists-search'), 'ro')
    await despuesDelFreno()

    await waitFor(() =>
      expect(screen.getByTestId('artists-search-results')).toBeTruthy(),
    )
    expect(searchMock).toHaveBeenCalledWith('tattoo', 'ro')
    expect(screen.getByTestId('artist-roig')).toBeTruthy()
    expect(screen.queryByTestId('artists-list')).toBeNull()
  })

  it('mientras se busca no promete un orden por cercanía', async () => {
    renderArtists()
    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())
    // El encabezado dice desde dónde se mide: existe antes de buscar.
    expect(screen.getByTestId('search-location-header')).toBeTruthy()

    fireEvent.changeText(screen.getByTestId('artists-search'), 'roig')
    await despuesDelFreno()
    await waitFor(() =>
      expect(screen.getByTestId('artists-search-results')).toBeTruthy(),
    )

    expect(screen.queryByTestId('search-location-header')).toBeNull()
    // Y la tarjeta no anota kilómetros, aunque el artista tenga coordenadas y
    // el GPS esté prendido: el orden no salió de ahí.
    expect(screen.queryByText(/km/)).toBeNull()
  })

  it('borrar el campo devuelve la grilla en el acto', async () => {
    renderArtists()
    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    fireEvent.changeText(screen.getByTestId('artists-search'), 'roig')
    await despuesDelFreno()
    await waitFor(() =>
      expect(screen.getByTestId('artists-search-results')).toBeTruthy(),
    )

    // Sin adelantar el reloj: lo que decide qué se muestra es el texto crudo,
    // no el frenado. Si dependiera del frenado, acá seguiría el resultado
    // viejo con el campo ya vacío.
    fireEvent.press(screen.getByTestId('artists-search-clear'))

    expect(screen.getByTestId('artists-list')).toBeTruthy()
    expect(screen.queryByTestId('artists-search-results')).toBeNull()
  })

  it('cuando no hay nadie con ese nombre lo dice, y ofrece Explorar', async () => {
    searchMock.mockResolvedValue([])
    const onExplore = renderArtists()
    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    fireEvent.changeText(screen.getByTestId('artists-search'), 'zzz')
    await despuesDelFreno()

    await waitFor(() =>
      expect(screen.getByTestId('artists-search-empty')).toBeTruthy(),
    )
    fireEvent.press(screen.getByText('Ir a explorar'))
    expect(onExplore).toHaveBeenCalled()
  })

  it('a quien no subió obra se lo encuentra igual, y la tarjeta lo dice', async () => {
    // La grilla lo esconde a propósito —su tarjeta saldría vacía—; la
    // búsqueda por nombre no, porque preguntaron por esa persona.
    searchMock.mockResolvedValue([artista('nuevo', { pieces: [] })])
    renderArtists()
    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    fireEvent.changeText(screen.getByTestId('artists-search'), 'nuevo')
    await despuesDelFreno()

    await waitFor(() =>
      expect(screen.getByTestId('artist-nuevo')).toBeTruthy(),
    )
    expect(screen.getByTestId('artist-nuevo-no-work')).toBeTruthy()
    expect(screen.getByText('Todavía no subió obra')).toBeTruthy()
    // Y sigue siendo tocable: llegar a la persona es el punto.
    expect(screen.getByTestId('artist-nuevo-identity')).toBeTruthy()
  })

  it('si la búsqueda falla se puede reintentar, sin perder la grilla', async () => {
    searchMock.mockRejectedValue(new Error('sin red'))
    renderArtists()
    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    fireEvent.changeText(screen.getByTestId('artists-search'), 'roig')
    await despuesDelFreno()

    await waitFor(() =>
      expect(screen.getByTestId('artists-search-error')).toBeTruthy(),
    )
    expect(screen.queryByTestId('artists-error')).toBeNull()
  })
})
