import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { Professional } from '@mesh/domain'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import {
  __resetArtworkHandoff,
  offerArtwork,
} from '@/features/transitions/sharedArtwork.ts'

import { ProfileScreen } from './ProfileScreen.tsx'
import type { PortfolioPiece, ProfileData } from './queries.ts'

jest.mock('./queries.ts', () => ({ fetchProfile: jest.fn() }))
jest.mock('@/features/discovery/queries.ts', () => ({
  mediaUrl: (path: string, size: string) =>
    `https://ejemplo.test/${path}/${size}`,
}))

import { fetchProfile } from './queries.ts'
const fetchMock = fetchProfile as jest.MockedFunction<typeof fetchProfile>

const HOY = '2026-08-18'

function professional(overrides: Partial<Professional> = {}): Professional {
  return {
    id: 'p1',
    slug: 'aguja-fina',
    categorySlug: 'tattoo',
    displayName: 'Aguja Fina',
    bio: null,
    location: null,
    travels: false,
    styles: [],
    price: null,
    availability: null,
    instagramHandle: 'aguja',
    whatsappE164: null,
    studioCoordinates: null,
    isFixture: true,
    ...overrides,
  }
}

function data(
  overrides: Partial<Professional> = {},
  pieces: ProfileData['pieces'] = [],
): ProfileData {
  return { professional: professional(overrides), pieces, canChat: false }
}

function render() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const onContact = jest.fn()
  const onBack = jest.fn()
  renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">
        <ProfileScreen
          slug="aguja-fina"
          today={HOY}
          onBack={onBack}
          onContact={onContact}
        />
      </I18nProvider>
    </QueryClientProvider>,
  )
  return { onContact, onBack }
}

function pieza(
  id: string,
  overrides: Partial<PortfolioPiece> = {},
): PortfolioPiece {
  return {
    id,
    mediaPath: `aguja-fina/${id}/lg.webp`,
    blurhash: null,
    width: 800,
    height: 1000,
    caption: null,
    year: null,
    isFeatured: false,
    styles: [],
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  __resetArtworkHandoff()
})

describe('ProfileScreen', () => {
  it('no renderiza nada donde falta un dato', async () => {
    // Sin "a consultar", sin guiones. Un placeholder ocupa el lugar de un dato
    // y enseña a leer ausencia como presencia.
    fetchMock.mockResolvedValue(data())
    render()

    await waitFor(() =>
      expect(screen.getByTestId('profile-content')).toBeTruthy(),
    )
    expect(screen.queryByText('Rango de precio')).toBeNull()
    expect(screen.queryByText('Agenda')).toBeNull()
    expect(screen.queryByText(/consultar/i)).toBeNull()
    expect(screen.queryByText('—')).toBeNull()
  })

  it('muestra precio y disponibilidad con su fecha cuando existen', async () => {
    // Una disponibilidad sin fecha no es información.
    fetchMock.mockResolvedValue(
      data({
        price: {
          minCents: 6_000_000,
          maxCents: 18_000_000,
          currency: 'ARS',
          pricedAt: '2026-08-01',
        },
        availability: { status: 'open', updatedAt: '2026-08-10' },
      }),
    )
    render()

    await waitFor(() =>
      expect(screen.getByTestId('profile-content')).toBeTruthy(),
    )
    expect(screen.getByText('Tomando turnos')).toBeTruthy()
    expect(screen.getByText(/Según el artista, el .*agosto/)).toBeTruthy()
    expect(screen.getByText(/Declarado el .*agosto/)).toBeTruthy()
  })

  it('rotula una disponibilidad vieja como vieja en vez de afirmarla', async () => {
    fetchMock.mockResolvedValue(
      data({ availability: { status: 'open', updatedAt: '2026-01-01' } }),
    )
    render()

    await waitFor(() =>
      expect(screen.getByTestId('profile-content')).toBeTruthy(),
    )
    expect(screen.getByText(/Sin novedades desde/)).toBeTruthy()
  })

  it('marca los fixtures en pantalla, no solo en la base', async () => {
    fetchMock.mockResolvedValue(data())
    render()
    await waitFor(() =>
      expect(screen.getByTestId('profile-fixture-badge')).toBeTruthy(),
    )
  })

  it('nunca muestra reseñas, seguidores ni estadísticas de reserva', async () => {
    // No es información que tengamos. Fabricarla sería inventar credibilidad
    // ajena. Ver CLAUDE.md, innegociable #2.
    fetchMock.mockResolvedValue(
      data({
        bio: 'Registro sintético.',
        styles: [{ styleSlug: 'fine-line', proficiency: 1, isPrimary: true }],
      }),
    )
    render()

    await waitFor(() =>
      expect(screen.getByTestId('profile-content')).toBeTruthy(),
    )
    for (const prohibido of [
      /reseñ/i,
      /seguidor/i,
      /valoraci/i,
      /estrellas?/i,
      /\d+ reserv/i,
      /rating/i,
    ]) {
      expect(screen.queryByText(prohibido)).toBeNull()
    }
  })

  it('trata "no existe" y "no publicado" igual', async () => {
    // Decir "no tenés permiso" confirmaría que el artista existe. Ver
    // threat-model §T7.
    fetchMock.mockResolvedValue(null)
    render()
    await waitFor(() =>
      expect(screen.getByTestId('profile-not-found')).toBeTruthy(),
    )
    expect(screen.getByText('No encontramos esto')).toBeTruthy()
  })

  it('muestra error con reintentar y salida, sin el mensaje crudo', async () => {
    fetchMock.mockRejectedValue({
      code: '42501',
      message: 'permission denied for table professionals',
    })
    render()
    await waitFor(() =>
      expect(screen.getByTestId('profile-error')).toBeTruthy(),
    )
    expect(screen.queryByText(/permission denied/i)).toBeNull()
    expect(screen.getByText('Volver')).toBeTruthy()
  })
})

describe('la entrada desde una obra', () => {
  const DESTACADA = pieza('destacada', { isFeatured: true })
  const TOCADA = pieza('tocada')

  function llegarTocando(portfolioItemId: string) {
    offerArtwork({
      portfolioItemId,
      professionalSlug: 'aguja-fina',
      scope: 'explore',
      mediaPath: `aguja-fina/${portfolioItemId}/lg.webp`,
      blurhash: null,
      aspectRatio: 0.8,
      from: { x: 20, y: 500, width: 175, height: 219 },
      at: Date.now(),
    })
  }

  it('la obra que se tocó es la que queda de hero, no la destacada', async () => {
    // Es la promesa de la transición: si crece una obra y arriba aparece otra,
    // la animación contó una mentira sobre qué se estaba abriendo.
    fetchMock.mockResolvedValue(data({}, [DESTACADA, TOCADA]))
    llegarTocando('tocada')
    render()

    await waitFor(() => expect(screen.getByTestId('profile-content')).toBeTruthy())

    const hero = screen.UNSAFE_getAllByProps({ contentFit: 'cover' })[0]
    expect(hero?.props.source).toContain('tocada')
  })

  it('llegando de otro lado manda la destacada, como siempre', async () => {
    fetchMock.mockResolvedValue(data({}, [TOCADA, DESTACADA]))
    render()

    await waitFor(() => expect(screen.getByTestId('profile-content')).toBeTruthy())

    const hero = screen.UNSAFE_getAllByProps({ contentFit: 'cover' })[0]
    expect(hero?.props.source).toContain('destacada')
  })

  it('si la obra tocada ya no está publicada, manda la destacada', async () => {
    // El artista pudo bajarla entre la grilla y el perfil. Mejor la regla de
    // siempre que un hero vacío.
    fetchMock.mockResolvedValue(data({}, [DESTACADA]))
    llegarTocando('una-que-ya-no-esta')
    render()

    await waitFor(() => expect(screen.getByTestId('profile-content')).toBeTruthy())

    const hero = screen.UNSAFE_getAllByProps({ contentFit: 'cover' })[0]
    expect(hero?.props.source).toContain('destacada')
  })

  it('el pasamanos de otro artista no se hereda', async () => {
    offerArtwork({
      portfolioItemId: 'tocada',
      professionalSlug: 'otro-artista',
      scope: 'explore',
      mediaPath: 'otro-artista/tocada/lg.webp',
      blurhash: null,
      aspectRatio: 0.8,
      from: { x: 20, y: 500, width: 175, height: 219 },
      at: Date.now(),
    })
    fetchMock.mockResolvedValue(data({}, [DESTACADA, TOCADA]))
    render()

    await waitFor(() => expect(screen.getByTestId('profile-content')).toBeTruthy())

    const hero = screen.UNSAFE_getAllByProps({ contentFit: 'cover' })[0]
    expect(hero?.props.source).toContain('destacada')
    expect(
      screen.queryByTestId('profile-growing-artwork', {
        includeHiddenElements: true,
      }),
    ).toBeNull()
  })
})

describe('la salida del perfil', () => {
  it('tiene una salida visible, no solo el gesto del sistema', async () => {
    // navigation.md §6: una pantalla cuya única salida es el gesto del sistema
    // operativo es un defecto. El perfil se abre a pantalla completa y sin
    // barra, así que la salida tiene que estar en la pantalla.
    fetchMock.mockResolvedValue(data({}, [pieza('una')]))
    const { onBack } = render()

    await waitFor(() =>
      expect(screen.getByTestId('profile-content')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('profile-back'))
    expect(onBack).toHaveBeenCalled()
  })

  it('no duplica la salida cuando el error ya trae la suya', async () => {
    fetchMock.mockRejectedValue(new Error('permission denied for table'))
    render()

    await waitFor(() =>
      expect(screen.getByTestId('profile-error')).toBeTruthy(),
    )
    // Dos "Volver" no son dos salidas: son una pregunta sobre cuál hace qué.
    expect(screen.queryByTestId('profile-back')).toBeNull()
  })
})
