import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { AccountScreen } from './AccountScreen.tsx'
import { fetchAccount, updateAccount } from './queries.ts'

jest.mock('./queries.ts', () => ({
  fetchAccount: jest.fn(),
  updateAccount: jest.fn(),
  resolveLocationId: jest.fn().mockResolvedValue(null),
}))
jest.mock('@/features/settings/AnalyticsToggle.tsx', () => ({
  AnalyticsToggle: () => null,
}))
jest.mock('@/features/artist/queries.ts', () => ({
  fetchOwnedProfessional: jest.fn().mockResolvedValue(null),
  fetchCompletedAppointmentsCount: jest.fn().mockResolvedValue(0),
}))
jest.mock('@/features/saved/queries.ts', () => ({
  fetchSaved: jest.fn().mockResolvedValue([]),
}))

const fetchMock = fetchAccount as jest.Mock
const updateMock = updateAccount as jest.Mock

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const onOpenStudio = jest.fn()
  const onOpenConfiguracion = jest.fn()
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider locale="es-AR">
            <AccountScreen
              userId="u1"
              isAnonymous
              onOpenStudio={onOpenStudio}
              onOpenColecciones={jest.fn()}
              onOpenConfiguracion={onOpenConfiguracion}
              onOpenAvatarPicker={jest.fn()}
              onOpenLocationEditor={jest.fn()}
              onOpenArtist={jest.fn()}
            />
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
  return { onOpenStudio, onOpenConfiguracion }
}

beforeEach(() => {
  jest.clearAllMocks()
  updateMock.mockResolvedValue(undefined)
  fetchMock.mockResolvedValue({
    displayName: null,
    onboardingIntent: 'looking',
    adultConfirmedAt: null,
    createdAt: '2026-01-15T00:00:00.000Z',
    avatarUrl: null,
    cityLocationId: null,
    citySlug: null,
    cityLabel: null,
  })
})

describe('AccountScreen', () => {
  it('no ofrece un radio de búsqueda', async () => {
    // Estuvo y era mentira: se guardaba, se leía a sí mismo, y ninguna pantalla
    // lo usaba desde D-010. Un control que no cambia nada es peor que la
    // ausencia del control — enseña a no confiar en los que sí funcionan.
    // Desde dónde se mira se elige en Inicio, donde se ve el efecto.
    renderScreen()
    await waitFor(() =>
      expect(screen.getByTestId('account-content')).toBeTruthy(),
    )
    expect(screen.queryByTestId('account-radius-null')).toBeNull()
    expect(screen.queryByText(/radio|hasta dónde/i)).toBeNull()
  })

  it('guardar el nombre queda deshabilitado hasta que cambia', async () => {
    renderScreen()
    await waitFor(() =>
      expect(screen.getByTestId('account-content')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('account-edit-toggle'))
    await waitFor(() =>
      expect(screen.getByTestId('account-header-edit')).toBeTruthy(),
    )

    expect(
      screen.getByTestId('account-edit-save').props.accessibilityState.disabled,
    ).toBe(true)

    fireEvent.changeText(screen.getByTestId('account-edit-name'), 'Pablo')
    expect(
      screen.getByTestId('account-edit-save').props.accessibilityState.disabled,
    ).toBe(false)
  })

  it('cancelar la edición descarta el cambio sin red', async () => {
    renderScreen()
    await waitFor(() =>
      expect(screen.getByTestId('account-content')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('account-edit-toggle'))
    fireEvent.changeText(screen.getByTestId('account-edit-name'), 'Pablo')
    fireEvent.press(screen.getByTestId('account-edit-cancel'))

    await waitFor(() =>
      expect(screen.getByTestId('account-header')).toBeTruthy(),
    )
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('ofrece el estudio aunque la persona haya entrado buscando', async () => {
    // Los roles no son excluyentes: alguien que entró buscando puede recibir
    // su código de artista después.
    renderScreen()
    await waitFor(() =>
      expect(screen.getByTestId('account-studio')).toBeTruthy(),
    )
  })

  it('lleva al estudio y a configuración', async () => {
    const { onOpenStudio, onOpenConfiguracion } = renderScreen()
    await waitFor(() =>
      expect(screen.getByTestId('account-content')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('account-studio'))
    expect(onOpenStudio).toHaveBeenCalled()

    fireEvent.press(screen.getByTestId('account-configuracion'))
    expect(onOpenConfiguracion).toHaveBeenCalled()
  })

  it('un error ofrece reintentar en vez de una pantalla vacía', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    renderScreen()
    await waitFor(() =>
      expect(screen.getByTestId('account-error')).toBeTruthy(),
    )
  })
})
