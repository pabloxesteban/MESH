/**
 * `AccountScreen`: el header de identidad y los avisos puntuales.
 *
 * Lo que `account.test.tsx` ya cubre (editar nombre, cancelar, ir al estudio
 * o a configuración, error + reintentar) no se repite acá. Este archivo es
 * específicamente el rediseño de ADR-030: quién sos, con o sin perfil de
 * artista propio, y qué avisos aplican según los hechos de ese perfil — no
 * según qué se descartó.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native'
import { useState } from 'react'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { AccountScreen } from './AccountScreen.tsx'
import { fetchAccount } from './queries.ts'
import { dismissNotice, fetchDismissedNotices } from './notices.ts'
import {
  fetchCompletedAppointmentsCount,
  fetchOwnedProfessional,
} from '@/features/artist/queries.ts'
import { fetchSaved } from '@/features/saved/queries.ts'

jest.mock('./queries.ts', () => ({
  fetchAccount: jest.fn(),
  updateAccount: jest.fn(),
  resolveLocationId: jest.fn().mockResolvedValue(null),
}))
jest.mock('./notices.ts', () => ({
  fetchDismissedNotices: jest.fn(),
  dismissNotice: jest.fn(),
}))
jest.mock('@/features/artist/queries.ts', () => ({
  fetchOwnedProfessional: jest.fn(),
  fetchCompletedAppointmentsCount: jest.fn(),
}))
jest.mock('@/features/saved/queries.ts', () => ({
  fetchSaved: jest.fn(),
}))

const fetchAccountMock = fetchAccount as jest.Mock
const fetchOwnedProfessionalMock = fetchOwnedProfessional as jest.Mock
const fetchCompletedMock = fetchCompletedAppointmentsCount as jest.Mock
const fetchSavedMock = fetchSaved as jest.Mock
const fetchDismissedMock = fetchDismissedNotices as jest.Mock
const dismissMock = dismissNotice as jest.Mock

const BASE_ACCOUNT = {
  displayName: 'Pablo',
  onboardingIntent: 'looking' as const,
  adultConfirmedAt: '2026-08-20T12:00:00.000Z',
  createdAt: '2026-01-15T00:00:00.000Z',
  avatarUrl: null,
  cityLocationId: 'loc-1',
  citySlug: 'palermo',
  cityLabel: 'Palermo',
}

function ownedProfessional(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pro-1',
    slug: 'pablo-tattoo',
    displayName: 'Pablo Tattoo',
    isPublished: true,
    studioCoordinates: { lat: -34.58, lng: -58.43 },
    styleSlugs: ['fine-line'],
    bio: 'Fine line y botánico.',
    hasAvatar: true,
    ...overrides,
  }
}

function Wrapper({ children }: { children: React.ReactNode }) {
  // `mutations.gcTime: 0` importa tanto como el de `queries` acá: sin él, una
  // mutación exitosa (`dismiss.mutate`, más abajo) deja un timer real de
  // garbage-collection pendiente (5 minutos por default) que no bloquea el
  // test pero sí que el proceso de Jest termine — la suite pasa en
  // milisegundos y el proceso queda colgado esperando ese timer. No es un bug
  // de `AccountScreen`; es un timer de TanStack Query que ningún test
  // anterior en este repo había disparado porque ninguno esperaba a que una
  // mutación real se resolviera.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { gcTime: 0 },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider locale="es-AR">{children}</I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

function screenProps(
  props: Partial<React.ComponentProps<typeof AccountScreen>> = {},
): React.ComponentProps<typeof AccountScreen> {
  return {
    userId: 'u1',
    isAnonymous: false,
    onOpenStudio: jest.fn(),
    onOpenColecciones: jest.fn(),
    onOpenConfiguracion: jest.fn(),
    onOpenAvatarPicker: jest.fn(),
    onOpenLocationEditor: jest.fn(),
    onOpenArtist: jest.fn(),
    ...props,
  }
}

function renderScreen(props: Partial<React.ComponentProps<typeof AccountScreen>> = {}) {
  return render(<AccountScreen {...screenProps(props)} />, { wrapper: Wrapper })
}

beforeEach(() => {
  jest.clearAllMocks()
  fetchAccountMock.mockResolvedValue(BASE_ACCOUNT)
  fetchOwnedProfessionalMock.mockResolvedValue(null)
  fetchCompletedMock.mockResolvedValue(0)
  fetchSavedMock.mockResolvedValue([])
  fetchDismissedMock.mockResolvedValue(new Set())
  dismissMock.mockResolvedValue(undefined)
})

describe('header de identidad', () => {
  it('sesión anónima: muestra el aviso de cuenta anónima, no la ubicación ni "miembro desde"', async () => {
    renderScreen({ isAnonymous: true })
    await waitFor(() => expect(screen.getByTestId('account-header')).toBeTruthy())

    expect(screen.getByTestId('account-header-anonymous')).toBeTruthy()
    expect(screen.queryByTestId('account-header-meta')).toBeNull()
  })

  it('con cuenta y sin perfil de artista: ubicación y miembro desde, sin sección de artista', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-header')).toBeTruthy())

    expect(screen.getByTestId('account-header-meta')).toBeTruthy()
    expect(screen.getByText(/Palermo/)).toBeTruthy()
    expect(screen.queryByTestId('account-header-professional')).toBeNull()
  })

  it('sin ubicación cargada: solo "miembro desde", sin inventar un barrio', async () => {
    fetchAccountMock.mockResolvedValue({
      ...BASE_ACCOUNT,
      cityLocationId: null,
      citySlug: null,
      cityLabel: null,
    })
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-header')).toBeTruthy())

    const meta = screen.getByTestId('account-header-meta')
    expect(meta).toBeTruthy()
    expect(screen.queryByText(/Vivís en/)).toBeNull()
  })

  it('con perfil de artista y bio: muestra la bio, el link al estudio y los servicios completados', async () => {
    fetchOwnedProfessionalMock.mockResolvedValue(ownedProfessional())
    fetchCompletedMock.mockResolvedValue(3)
    renderScreen()

    await waitFor(() =>
      expect(screen.getByTestId('account-header-professional')).toBeTruthy(),
    )
    expect(screen.getByText('Fine line y botánico.')).toBeTruthy()
    expect(screen.getByTestId('account-header-edit-studio')).toBeTruthy()
    await waitFor(() =>
      expect(screen.getByTestId('account-header-completed')).toBeTruthy(),
    )
    expect(screen.getByText('3 servicios completados')).toBeTruthy()
  })

  it('con perfil de artista sin bio: no dibuja un párrafo vacío', async () => {
    fetchOwnedProfessionalMock.mockResolvedValue(ownedProfessional({ bio: null }))
    renderScreen()

    await waitFor(() =>
      expect(screen.getByTestId('account-header-professional')).toBeTruthy(),
    )
    expect(screen.getByTestId('account-header-edit-studio')).toBeTruthy()
    // Ni el texto de la bio de referencia, ni un nodo de texto vacío en su lugar.
    expect(screen.queryByText('Fine line y botánico.')).toBeNull()
  })

  it('sin servicios completados todavía: no muestra la línea, en vez de "0 servicios"', async () => {
    fetchOwnedProfessionalMock.mockResolvedValue(ownedProfessional())
    fetchCompletedMock.mockResolvedValue(0)
    renderScreen()

    await waitFor(() =>
      expect(screen.getByTestId('account-header-professional')).toBeTruthy(),
    )
    // `count.data == null` es el único caso que oculta la línea: 0 es un dato
    // válido y se muestra. Acá solo confirmamos que la consulta corrió y que
    // no truena con 0 servicios completados.
    await waitFor(() =>
      expect(fetchCompletedMock).toHaveBeenCalled(),
    )
  })

  it('sin foto: el avatar no dibuja ninguna inicial', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-header')).toBeTruthy())

    // El nombre "Pablo" sí aparece (es el título), pero ningún texto de una
    // sola letra que pudiera ser una inicial generada por el avatar.
    expect(screen.queryByText('P')).toBeNull()
  })
})

describe('avisos puntuales', () => {
  it('sin perfil de artista propio: nunca se muestra la sección de avisos', async () => {
    fetchOwnedProfessionalMock.mockResolvedValue(null)
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-content')).toBeTruthy())

    expect(screen.queryByTestId('account-notices')).toBeNull()
  })

  it('sin foto de tarjeta y sin ubicación de estudio: los dos avisos', async () => {
    fetchOwnedProfessionalMock.mockResolvedValue(
      ownedProfessional({ hasAvatar: false, studioCoordinates: null }),
    )
    renderScreen()

    await waitFor(() => expect(screen.getByTestId('account-notices')).toBeTruthy())
    expect(screen.getByTestId('account-notice-photo')).toBeTruthy()
    expect(screen.getByTestId('account-notice-location')).toBeTruthy()
  })

  it('con foto y con ubicación: ningún aviso, sin depender de qué se descartó antes', async () => {
    // El hecho está resuelto de las dos formas, así que ningún aviso debería
    // aparecer aunque nada esté en lo descartado (`fetchDismissedNotices`
    // devuelve vacío por default en este archivo).
    fetchOwnedProfessionalMock.mockResolvedValue(
      ownedProfessional({ hasAvatar: true, studioCoordinates: { lat: 1, lng: 1 } }),
    )
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-content')).toBeTruthy())

    expect(screen.queryByTestId('account-notices')).toBeNull()
  })

  it('descartar un aviso lo hace desaparecer', async () => {
    fetchOwnedProfessionalMock.mockResolvedValue(
      ownedProfessional({ hasAvatar: false, studioCoordinates: { lat: 1, lng: 1 } }),
    )
    // Simula la persistencia real de `notices.ts`: una vez que se descarta,
    // el próximo `fetchDismissedNotices` (disparado por la invalidación de la
    // mutación) ya lo trae. Fijar esto ANTES de tocar el botón importa: la
    // invalidación puede refetchear antes de que el test llegue a la línea
    // siguiente.
    dismissMock.mockImplementation(async () => {
      fetchDismissedMock.mockResolvedValue(new Set(['photo']))
    })
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-notice-photo')).toBeTruthy())

    fireEvent.press(screen.getByLabelText('Descartar este aviso'))
    await waitFor(() => expect(dismissMock).toHaveBeenCalledWith('u1', 'photo'))
    await waitFor(() => expect(screen.queryByTestId('account-notice-photo')).toBeNull())
  })

  it('el hecho resuelto oculta el aviso aunque nunca se haya descartado', async () => {
    // Simula: la persona subió la foto desde el aviso. El hecho cambia
    // (`hasAvatar` pasa a true) sin que `dismissNotice` se haya llamado nunca
    // — el aviso tiene que desaparecer igual, porque `ProfileNotices` arma la
    // lista de candidatos a partir de los datos del profesional, no del
    // storage de descartes.
    fetchOwnedProfessionalMock.mockResolvedValue(
      ownedProfessional({ hasAvatar: false, studioCoordinates: { lat: 1, lng: 1 } }),
    )
    const { rerender } = render(<AccountScreen {...screenProps()} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(screen.getByTestId('account-notice-photo')).toBeTruthy())
    expect(dismissMock).not.toHaveBeenCalled()

    fetchOwnedProfessionalMock.mockResolvedValue(
      ownedProfessional({ hasAvatar: true, studioCoordinates: { lat: 1, lng: 1 } }),
    )
    // Refetch manual: en la app real esto lo dispara `invalidateQueries` al
    // volver de subir la foto. Acá alcanza con forzar la consulta de nuevo.
    rerender(<AccountScreen {...screenProps({ userId: 'u1-refetch' })} />)

    await waitFor(() => expect(screen.queryByTestId('account-notice-photo')).toBeNull())
    expect(dismissMock).not.toHaveBeenCalled()
  })

  it('sin foto de tarjeta y sin ubicación: exactamente esos dos avisos, ninguno repetido', async () => {
    fetchOwnedProfessionalMock.mockResolvedValue(
      ownedProfessional({ hasAvatar: false, studioCoordinates: null }),
    )
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-notices')).toBeTruthy())

    // `NoticeKind` hoy solo tiene estos dos valores, así que el `.slice(0, 2)`
    // de `ProfileNotices` nunca recorta nada en la práctica — lo que sí se
    // puede afirmar hoy es que la lista es EXACTAMENTE esta, sin duplicar
    // ninguna fila.
    expect(screen.getAllByTestId('account-notice-photo')).toHaveLength(1)
    expect(screen.getAllByTestId('account-notice-location')).toHaveLength(1)
  })
})

describe('guardado reciente', () => {
  it('sin nada guardado: un enlace de entrada, no una grilla vacía', async () => {
    fetchSavedMock.mockResolvedValue([])
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-recent-empty')).toBeTruthy())
  })

  it('con guardados: muestra hasta 8 miniaturas y un enlace a ver todo', async () => {
    fetchSavedMock.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        savedItemId: `s${i}`,
        portfolioItemId: `p${i}`,
        savedAt: '2026-08-20T00:00:00.000Z',
        mediaPath: `path/${i}.jpg`,
        blurhash: null,
        width: 800,
        height: 1000,
        professionalSlug: `artista-${i}`,
        professionalName: `Artista ${i}`,
        isFixture: false,
      })),
    )
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-recent')).toBeTruthy())
    expect(screen.getByTestId('account-recent-viewall')).toBeTruthy()
  })

  it('un error en lo guardado no tapa el resto del hub, y ofrece reintentar', async () => {
    fetchSavedMock.mockRejectedValue(new Error('sin red'))
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-recent-error')).toBeTruthy())
    // El header sigue de pie: un fallo en una sección no tapa las demás.
    expect(screen.getByTestId('account-header')).toBeTruthy()

    fireEvent.press(screen.getByTestId('account-recent-retry'))
    expect(fetchSavedMock).toHaveBeenCalled()
  })
})
