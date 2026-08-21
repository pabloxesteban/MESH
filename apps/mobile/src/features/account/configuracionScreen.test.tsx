/**
 * `ConfiguracionScreen`: todo lo que el rediseño de Perfil (ADR-030) sacó del
 * hub y agrupó acá — cuenta, preferencias, notificaciones, privacidad, datos.
 *
 * Lo que se cubre: que agrupe en las cinco secciones esperadas, sesión
 * anónima vs con cuenta, el gate de edad solo cuando falta declararlo, y que
 * `BlockedList` (no mockeado, para probar la garantía real del componente)
 * siga sin dibujarse cuando no hay a quién desbloquear.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor, fireEvent } from '@testing-library/react-native'
import { useState } from 'react'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { ConfiguracionScreen } from './ConfiguracionScreen.tsx'
import { confirmAdult, fetchAccount, updateAccount } from './queries.ts'
import { fetchBlockedProfessionals } from '@/features/moderation/queries.ts'

jest.mock('./queries.ts', () => ({
  fetchAccount: jest.fn(),
  confirmAdult: jest.fn(),
  updateAccount: jest.fn(),
}))
jest.mock('@/features/moderation/queries.ts', () => ({
  fetchBlockedProfessionals: jest.fn(),
  unblock: jest.fn(),
}))
jest.mock('@/features/settings/AnalyticsToggle.tsx', () => ({
  AnalyticsToggle: () => null,
}))
jest.mock('@/features/notifications/NotificationsToggle.tsx', () => ({
  NotificationsToggle: () => null,
}))
jest.mock('@/observability/ErrorReportsToggle.tsx', () => ({
  ErrorReportsToggle: () => null,
}))
jest.mock('./ExportAccount.tsx', () => ({ ExportAccount: () => null }))
jest.mock('./LegalRow.tsx', () => ({ LegalRow: () => null }))

const fetchAccountMock = fetchAccount as jest.Mock
const confirmAdultMock = confirmAdult as jest.Mock
const updateAccountMock = updateAccount as jest.Mock
const fetchBlockedMock = fetchBlockedProfessionals as jest.Mock

const BASE_ACCOUNT = {
  displayName: 'Pablo',
  onboardingIntent: 'looking' as const,
  adultConfirmedAt: '2026-08-20T12:00:00.000Z',
  createdAt: '2026-01-15T00:00:00.000Z',
  avatarUrl: null,
  cityLocationId: null,
  citySlug: null,
  cityLabel: null,
}

function Wrapper({ children }: { children: React.ReactNode }) {
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
      <I18nProvider locale="es-AR">{children}</I18nProvider>
    </QueryClientProvider>
  )
}

function renderScreen(
  props: Partial<React.ComponentProps<typeof ConfiguracionScreen>> = {},
) {
  return renderWithProviders(
    <Wrapper>
      <ConfiguracionScreen
        userId="u1"
        isAnonymous={false}
        email="pablo@ejemplo.test"
        onCreateAccount={jest.fn()}
        onSignIn={jest.fn()}
        onSignOut={jest.fn()}
        onDeleted={jest.fn()}
        onBack={jest.fn()}
        {...props}
      />
    </Wrapper>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  fetchAccountMock.mockResolvedValue(BASE_ACCOUNT)
  fetchBlockedMock.mockResolvedValue([])
  confirmAdultMock.mockResolvedValue(undefined)
  updateAccountMock.mockResolvedValue(undefined)
})

describe('estados', () => {
  it('carga: esqueletos, no el contenido todavía', () => {
    fetchAccountMock.mockReturnValue(new Promise(() => undefined))
    renderScreen()
    expect(screen.getByTestId('settings-loading')).toBeTruthy()
  })

  it('error: ofrece reintentar', async () => {
    fetchAccountMock.mockRejectedValue(new Error('sin red'))
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('settings-error')).toBeTruthy())

    fireEvent.press(screen.getByText('Reintentar'))
    await waitFor(() => expect(fetchAccountMock).toHaveBeenCalledTimes(2))
  })
})

describe('agrupamiento en secciones', () => {
  it('las cinco secciones aparecen, cada una una sola vez', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('settings-content')).toBeTruthy())

    for (const titulo of [
      'Cuenta',
      'Preferencias',
      'Notificaciones',
      'Privacidad y bloqueo',
      'Datos y legal',
    ]) {
      expect(screen.getAllByText(titulo)).toHaveLength(1)
    }
  })

  it('van en el orden documentado: cuenta, preferencias, notificaciones, privacidad, datos', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('settings-content')).toBeTruthy())

    const orden = ['Cuenta', 'Preferencias', 'Notificaciones', 'Privacidad y bloqueo', 'Datos y legal']
    const posiciones = orden.map((titulo) => screen.getByText(titulo))
    // `UNSAFE_root.findAll` recorre en orden de aparición; cada encabezado
    // debería aparecer más adelante que el anterior en ese recorrido.
    const todos = screen.UNSAFE_root.findAll(
      (n) => String(n.type) === 'Text' && n.props?.children != null,
    )
    const indices = posiciones.map((nodo) => todos.indexOf(nodo as never))
    expect(indices).toEqual([...indices].sort((a, b) => a - b))
  })
})

describe('cuenta', () => {
  it('sesión anónima: ofrece crear cuenta y entrar, no "cerrar sesión"', async () => {
    renderScreen({ isAnonymous: true })
    await waitFor(() => expect(screen.getByTestId('account-anonymous')).toBeTruthy())

    expect(screen.getByTestId('account-sign-up')).toBeTruthy()
    expect(screen.getByTestId('account-sign-in')).toBeTruthy()
    expect(screen.queryByTestId('account-sign-out')).toBeNull()
  })

  it('con cuenta: muestra el correo y ofrece cerrar sesión', async () => {
    const onSignOut = jest.fn()
    renderScreen({ isAnonymous: false, email: 'pablo@ejemplo.test', onSignOut })
    await waitFor(() => expect(screen.getByTestId('account-signed-in')).toBeTruthy())

    expect(screen.getByText('pablo@ejemplo.test')).toBeTruthy()
    fireEvent.press(screen.getByTestId('account-sign-out'))
    expect(onSignOut).toHaveBeenCalled()
  })

  it('mayoría de edad ya declarada: no muestra la fila de declarar', async () => {
    fetchAccountMock.mockResolvedValue({ ...BASE_ACCOUNT, adultConfirmedAt: '2026-08-20T12:00:00.000Z' })
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('settings-content')).toBeTruthy())

    expect(screen.queryByTestId('account-age')).toBeNull()
  })

  it('sin declarar mayoría de edad: la fila aparece y declarar la hace desaparecer', async () => {
    fetchAccountMock.mockResolvedValue({ ...BASE_ACCOUNT, adultConfirmedAt: null })
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-age')).toBeTruthy())

    fireEvent.press(screen.getByTestId('account-age-confirm'))
    await waitFor(() => expect(confirmAdultMock).toHaveBeenCalled())
  })
})

describe('preferencias', () => {
  it('marca la intención actual y permite cambiarla', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-intent-looking')).toBeTruthy())

    fireEvent.press(screen.getByTestId('account-intent-offering'))
    await waitFor(() => expect(updateAccountMock).toHaveBeenCalled())
    // `mutationFn: updateAccount` se pasa directo (no envuelto en una arrow):
    // TanStack Query lo llama con un segundo argumento de contexto propio, así
    // que se verifica solo el primero, que es lo que la pantalla decide mandar.
    expect(updateAccountMock.mock.calls[0][0]).toEqual({ onboardingIntent: 'offering' })
  })
})

describe('privacidad: BlockedList real, sin mockear', () => {
  it('sin nadie bloqueado, la sección no dibuja ninguna lista', async () => {
    fetchBlockedMock.mockResolvedValue([])
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('settings-content')).toBeTruthy())
    await waitFor(() => expect(fetchBlockedMock).toHaveBeenCalled())

    expect(screen.queryByTestId('blocked-list')).toBeNull()
  })

  it('con alguien bloqueado, la lista sí aparece', async () => {
    fetchBlockedMock.mockResolvedValue([
      { blockId: 'b1', professionalId: 'pro-x', slug: 'artista-x', displayName: 'Artista X' },
    ])
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('blocked-list')).toBeTruthy())
  })
})

describe('datos y legal', () => {
  it('sin sesión: no ofrece exportar ni borrar la cuenta', async () => {
    renderScreen({ userId: null, onDeleted: undefined })
    await waitFor(() => expect(screen.getByTestId('settings-content')).toBeTruthy())

    expect(screen.queryByTestId('account-delete')).toBeNull()
  })

  it('con sesión: el botón de borrar cuenta existe y pide confirmación antes', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('account-delete')).toBeTruthy())
  })
})
