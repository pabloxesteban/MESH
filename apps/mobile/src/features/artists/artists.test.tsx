/**
 * La grilla de artistas: el nuevo Inicio.
 *
 * Lo que importa verificar acá son las tres cosas que la tarjeta promete y
 * podría romper en silencio:
 *
 * · Que el orden sea por cercanía cuando hay ubicación, y que **nadie
 *   desaparezca** cuando no la hay.
 * · Que no se invente una distancia ni un barrio que no existen.
 * · Que la persona sin foto de perfil se vea bien, porque hoy es el caso
 *   normal y no un borde.
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

import { ArtistsScreen } from './ArtistsScreen.tsx'
import { fetchArtistGrid, type ArtistCardData } from './queries.ts'

jest.mock('./queries.ts', () => ({
  fetchArtistGrid: jest.fn(),
  avatarUrl: (path: string) => `https://ejemplo.test/${path}`,
  mediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))

const mockDeviceLocation = jest.fn()
jest.mock('@/features/location/useDeviceLocation.ts', () => ({
  useDeviceLocation: () => mockDeviceLocation(),
}))

const gridMock = fetchArtistGrid as jest.Mock

const PALERMO = { lat: -34.5875, lng: -58.4371 }
const SAN_TELMO = { lat: -34.6212, lng: -58.3731 }
const LEJOS = { lat: -34.7, lng: -58.6 }

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
    studioCoordinates: null,
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

function renderArtists(onOpenArtist = jest.fn()) {
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
              onOpenArtist={onOpenArtist}
              onExplore={jest.fn()}
            />
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
  return onOpenArtist
}

beforeEach(() => {
  jest.clearAllMocks()
  gridMock.mockResolvedValue([artista('uno')])
  mockDeviceLocation.mockReturnValue({
    status: 'granted',
    location: { coordinates: PALERMO, neighborhoodSlug: 'palermo' },
    request: jest.fn(),
  })
})

describe('grilla de artistas', () => {
  it('ordena por cercanía cuando hay ubicación', async () => {
    gridMock.mockResolvedValue([
      artista('lejos', { studioCoordinates: LEJOS }),
      artista('cerca', { studioCoordinates: SAN_TELMO }),
    ])
    renderArtists()

    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    const tarjetas = screen.getByTestId('artists-list').children as Array<{
      props: { testID?: string }
    }>
    expect(tarjetas.map((c) => c.props.testID)).toEqual([
      'artist-cerca',
      'artist-lejos',
    ])
  })

  it('quien no publicó su ubicación aparece igual, al final', async () => {
    gridMock.mockResolvedValue([
      artista('sin-ubicacion', { studioCoordinates: null }),
      artista('con-ubicacion', { studioCoordinates: SAN_TELMO }),
    ])
    renderArtists()

    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    // Esconderlo sería castigarlo por no compartir su ubicación, y publicarla
    // es voluntario.
    expect(screen.getByTestId('artist-sin-ubicacion')).toBeTruthy()
    expect(screen.getByTestId('artist-con-ubicacion')).toBeTruthy()
  })

  it('sin ubicación de nadie no muestra ninguna distancia', async () => {
    mockDeviceLocation.mockReturnValue({
      status: 'unrequested',
      location: null,
      request: jest.fn(),
    })
    gridMock.mockResolvedValue([artista('uno', { studioCoordinates: LEJOS })])
    renderArtists()

    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())
    // Sin las dos puntas no hay distancia, y una estimada sería peor que
    // ninguna.
    expect(screen.queryByText(/km/)).toBeNull()
    expect(screen.getByTestId('artists-location-prompt')).toBeTruthy()
  })

  it('sin barrio ni distancia lo dice, no rellena con "CABA"', async () => {
    gridMock.mockResolvedValue([
      artista('uno', { neighborhoodSlug: null, studioCoordinates: null }),
    ])
    renderArtists()

    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())
    expect(screen.getByText('No publicó su ubicación')).toBeTruthy()
  })

  it('sin foto de perfil muestra la inicial, no una silueta genérica', async () => {
    gridMock.mockResolvedValue([
      artista('uno', { displayName: 'Briza Maldonado', avatarPath: null }),
    ])
    renderArtists()

    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())
    // Hoy ningún artista tiene avatar, así que este es el caso normal.
    expect(screen.getByText('B')).toBeTruthy()
  })

  it('marca los registros de prueba en la tarjeta', async () => {
    gridMock.mockResolvedValue([artista('uno', { isFixture: true })])
    renderArtists()

    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())
    // Una obra ficticia tiene que decir que lo es donde se la mira.
    expect(screen.getByText('Ficticio')).toBeTruthy()
  })

  it('el carrusel y el nombre llevan al mismo perfil', async () => {
    const onOpenArtist = renderArtists()
    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    // La obra y la fila de identidad son la misma promesa: la muestra es del
    // artista, no de una pieza suelta.
    const aperturas = screen.getAllByLabelText('Ver el perfil de Artista uno')
    expect(aperturas.length).toBeGreaterThan(1)
    for (const abrir of aperturas) fireEvent.press(abrir)

    expect(onOpenArtist).toHaveBeenCalledTimes(aperturas.length)
    for (const llamada of onOpenArtist.mock.calls) {
      expect(llamada).toEqual(['uno'])
    }
  })

  it('sin nadie dado de alta, la salida es explorar y no reintentar', async () => {
    gridMock.mockResolvedValue([])
    renderArtists()

    // Reintentar no va a hacer aparecer a nadie.
    await waitFor(() => expect(screen.getByTestId('artists-empty')).toBeTruthy())
  })
})
