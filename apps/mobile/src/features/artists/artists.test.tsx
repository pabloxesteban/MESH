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
  ...jest.requireActual('./queries.ts'),
  fetchArtistGrid: jest.fn(),
  searchArtists: jest.fn(),
  avatarUrl: (path: string) => `https://ejemplo.test/${path}`,
  mediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))

const mockDeviceLocation = jest.fn()
jest.mock('@/features/location/useDeviceLocation.ts', () => ({
  useDeviceLocation: () => mockDeviceLocation(),
}))

const mockSearchLocation = jest.fn()
jest.mock('@/features/location/useSearchLocation.ts', () => ({
  ...jest.requireActual('@/features/location/useSearchLocation.ts'),
  useSearchLocation: () => mockSearchLocation(),
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
              onChangeLocation={jest.fn()}
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
  mockSearchLocation.mockReturnValue({
    value: { mode: 'device', neighborhoodSlug: null },
    isLoading: false,
    set: jest.fn(),
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

  it('un partido del conurbano se nombra, no se borra', async () => {
    // El bug que esto caza: la tarjeta leía `findLocation(slug).neighborhood`,
    // y los partidos del conurbano son `kind: 'city'` con `neighborhood: null`.
    // Resultado: la app anunciaba "no publicó su ubicación" sobre alguien que
    // sí la publicó. Decir algo falso de un artista es peor que no decir nada.
    gridMock.mockResolvedValue([
      artista('conurbano', { neighborhoodSlug: 'quilmes' }),
      artista('capital', { neighborhoodSlug: 'san-telmo' }),
    ])
    renderArtists()

    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())
    expect(screen.getByText('Quilmes')).toBeTruthy()
    expect(screen.getByText('San Telmo')).toBeTruthy()
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
    // Y **no** hay ningún cartel pidiendo el permiso: eso se pregunta una sola
    // vez, en el onboarding, y la respuesta se respeta. Ver ADR-030.
    expect(screen.queryByTestId('artists-location-prompt')).toBeNull()
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
    await waitFor(() =>
      expect(screen.getByTestId('artists-empty')).toBeTruthy(),
    )
  })
})

describe('desde dónde se mira', () => {
  it('el encabezado dice el barrio que resolvió el GPS', async () => {
    gridMock.mockResolvedValue([artista('uno')])
    renderArtists()

    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())
    expect(screen.getByTestId('search-location-label')).toHaveTextContent(
      'Cerca de Palermo',
    )
  })

  it('con un barrio elegido ordena por barrio y no muestra kilómetros', async () => {
    // Los barrios de la taxonomía no tienen coordenadas, y el centro de Palermo
    // tampoco sería donde está la persona. Ordenar sí; decir "a 2 km" no.
    mockSearchLocation.mockReturnValue({
      value: { mode: 'neighborhood', neighborhoodSlug: 'palermo' },
      isLoading: false,
      set: jest.fn(),
    })
    gridMock.mockResolvedValue([
      artista('lejos', {
        neighborhoodSlug: 'la-plata',
        studioCoordinates: SAN_TELMO,
      }),
      artista('mismo', {
        neighborhoodSlug: 'palermo',
        studioCoordinates: LEJOS,
      }),
    ])
    renderArtists()

    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    const tarjetas = screen.getByTestId('artists-list').children as Array<{
      props: { testID?: string }
    }>
    expect(tarjetas.map((c) => c.props.testID)).toEqual([
      'artist-mismo',
      'artist-lejos',
    ])
    // Aunque las dos tengan coordenadas: el modo elegido manda, y en ese modo
    // no hay distancia que decir.
    expect(screen.queryByText(/km/)).toBeNull()
    expect(screen.getByTestId('search-location-label')).toHaveTextContent(
      'Cerca de Palermo',
    )
  })

  it('sin ubicación conserva el orden del servidor y lo dice', async () => {
    mockSearchLocation.mockReturnValue({
      value: { mode: 'none', neighborhoodSlug: null },
      isLoading: false,
      set: jest.fn(),
    })
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
      'artist-lejos',
      'artist-cerca',
    ])
    expect(screen.getByTestId('search-location-label')).toHaveTextContent(
      'Sin ubicación',
    )
  })

  it('elegir el GPS sin permiso no finge que hay ubicación', async () => {
    // Es el caso que más se rompe en silencio: el modo dice "device" y la app
    // se comporta como si supiera dónde está.
    mockDeviceLocation.mockReturnValue({
      status: 'denied',
      location: null,
      request: jest.fn(),
    })
    gridMock.mockResolvedValue([
      artista('lejos', { studioCoordinates: LEJOS }),
      artista('cerca', { studioCoordinates: SAN_TELMO }),
    ])
    renderArtists()

    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())

    expect(screen.getByTestId('search-location-label')).toHaveTextContent(
      'Sin ubicación',
    )
    expect(screen.queryByText(/km/)).toBeNull()
    // El encabezado dice la verdad y ofrece cambiarla; lo que ya no hay es un
    // cartel insistiendo con el permiso en cada sesión. Ver ADR-030.
    expect(screen.queryByTestId('artists-location-prompt')).toBeNull()
  })

  it('ningún modo esconde a nadie', async () => {
    for (const value of [
      { mode: 'device' as const, neighborhoodSlug: null },
      { mode: 'neighborhood' as const, neighborhoodSlug: 'palermo' },
      { mode: 'none' as const, neighborhoodSlug: null },
    ]) {
      mockSearchLocation.mockReturnValue({
        value,
        isLoading: false,
        set: jest.fn(),
      })
      gridMock.mockResolvedValue([
        artista('lejisimos', {
          neighborhoodSlug: 'la-plata',
          studioCoordinates: LEJOS,
        }),
        artista('sin-nada', {
          neighborhoodSlug: null,
          studioCoordinates: null,
        }),
      ])
      renderArtists()

      await waitFor(() =>
        expect(screen.getByTestId('artists-list')).toBeTruthy(),
      )
      // La ubicación ordena y nunca filtra. En los tres modos.
      expect(screen.getAllByTestId('artist-lejisimos').length).toBeGreaterThan(
        0,
      )
      expect(screen.getAllByTestId('artist-sin-nada').length).toBeGreaterThan(0)
    }
  })
})
