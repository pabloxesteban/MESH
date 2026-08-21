/**
 * La bandeja de avisos, del lado de la pantalla.
 *
 * Lo que se testea acá es lo que evita que esto se vuelva la cosa que le pide a
 * alguien que vuelva:
 *
 * 1. **Sin avisos, la sección no existe.** Una bandeja vacía permanente enseña
 *    a mirar ahí todos los días.
 * 2. **No hay número.** El no leído es un punto, no un contador creciendo.
 * 3. **La frase la arma la app**, y dice la verdad sobre la denuncia sin contar
 *    qué medida se tomó sobre la otra persona.
 * 4. **Se marcan leídos al abrir**, no al salir.
 *
 * Que un aviso no pueda tener texto libre lo garantiza el esquema, y se prueba
 * en `supabase/tests/58_notifications.sql`.
 */

import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { NotificationList } from './NotificationList.tsx'
import {
  dismissNotification,
  fetchNotifications,
  markNotificationsRead,
} from './queries.ts'

jest.mock('./queries.ts', () => ({
  fetchNotifications: jest.fn(),
  markNotificationsRead: jest.fn(),
  dismissNotification: jest.fn(),
}))

const leer = fetchNotifications as jest.Mock
const marcar = markNotificationsRead as jest.Mock
const sacar = dismissNotification as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  leer.mockResolvedValue([])
  marcar.mockResolvedValue(undefined)
  sacar.mockResolvedValue(undefined)
})

function render(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">{element}</I18nProvider>
    </QueryClientProvider>,
  )
}

const DENUNCIA_RESUELTA = {
  id: 'n1',
  kind: 'report_reviewed' as const,
  outcome: 'actioned' as const,
  createdAt: '2026-08-21T10:00:00.000Z',
  read: false,
}

describe('la bandeja', () => {
  it('no existe si no pasó nada', async () => {
    render(<NotificationList />)
    await waitFor(() => expect(leer).toHaveBeenCalled())
    expect(screen.queryByTestId('notification-list')).toBeNull()
  })

  it('no dibuja ningún número', async () => {
    leer.mockResolvedValue([
      DENUNCIA_RESUELTA,
      { ...DENUNCIA_RESUELTA, id: 'n2' },
      { ...DENUNCIA_RESUELTA, id: 'n3' },
    ])
    render(<NotificationList />)

    await waitFor(() =>
      expect(screen.getByTestId('notification-list')).toBeTruthy(),
    )
    // Un contador creciendo es exactamente el número cuyo propósito es que
    // alguien vuelva a entrar. El no leído es un punto.
    expect(screen.queryByText('3')).toBeNull()
    expect(screen.getAllByText('•').length).toBe(3)
  })

  it('cierra el hueco de ADR-023: dice que la denuncia se miró', async () => {
    leer.mockResolvedValue([DENUNCIA_RESUELTA])
    render(<NotificationList />)

    await waitFor(() =>
      expect(screen.getByText(/tomamos una medida/i)).toBeTruthy(),
    )
    // Qué medida, no. Sería contar una sanción sobre otra persona.
    expect(screen.queryByText(/despublic|cerr(ó|amos)|bloque/i)).toBeNull()
  })

  it('distingue una denuncia desestimada, sin disfrazarla', async () => {
    leer.mockResolvedValue([
      { ...DENUNCIA_RESUELTA, outcome: 'dismissed' as const },
    ])
    render(<NotificationList />)

    await waitFor(() =>
      expect(screen.getByText(/no encontramos motivo/i)).toBeTruthy(),
    )
  })

  it('marca leído al abrir, no al salir', async () => {
    leer.mockResolvedValue([DENUNCIA_RESUELTA])
    render(<NotificationList />)

    // Si la app se cierra de golpe, lo que ya se vio no debería seguir
    // contando como pendiente.
    await waitFor(() => expect(marcar).toHaveBeenCalled())
  })

  it('no vuelve a marcar si ya estaba todo leído', async () => {
    leer.mockResolvedValue([{ ...DENUNCIA_RESUELTA, read: true }])
    render(<NotificationList />)

    await waitFor(() =>
      expect(screen.getByTestId('notification-list')).toBeTruthy(),
    )
    expect(marcar).not.toHaveBeenCalled()
  })

  it('deja sacar uno, con el aviso en la etiqueta accesible', async () => {
    leer.mockResolvedValue([DENUNCIA_RESUELTA])
    render(<NotificationList />)

    await waitFor(() =>
      expect(screen.getByTestId('notification-dismiss-n1')).toBeTruthy(),
    )
    // Sin esto, un lector de pantalla anuncia tres botones "Sacar" idénticos.
    expect(
      screen.getByLabelText(/Sacar el aviso: Miramos lo que denunciaste/i),
    ).toBeTruthy()

    fireEvent.press(screen.getByTestId('notification-dismiss-n1'))
    await waitFor(() => expect(sacar).toHaveBeenCalledWith('n1'))
  })
})
