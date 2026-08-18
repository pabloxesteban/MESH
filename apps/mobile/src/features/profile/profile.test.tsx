import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react-native'
import type { Professional } from '@mesh/domain'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { ProfileScreen } from './ProfileScreen.tsx'
import type { ProfileData } from './queries.ts'

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
    displayName: '[Fixture] Aguja Fina',
    bio: null,
    location: null,
    travels: false,
    styles: [],
    price: null,
    availability: null,
    instagramHandle: 'aguja',
    whatsappE164: null,
    isFixture: true,
    ...overrides,
  }
}

function data(
  overrides: Partial<Professional> = {},
  pieces: ProfileData['pieces'] = [],
): ProfileData {
  return { professional: professional(overrides), pieces }
}

function render() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const onContact = jest.fn()
  renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">
        <ProfileScreen
          slug="aguja-fina"
          today={HOY}
          onBack={jest.fn()}
          onContact={onContact}
        />
      </I18nProvider>
    </QueryClientProvider>,
  )
  return { onContact }
}

beforeEach(() => jest.clearAllMocks())

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
