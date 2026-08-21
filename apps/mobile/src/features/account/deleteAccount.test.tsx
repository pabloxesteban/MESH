/**
 * Borrar la cuenta, del lado de la pantalla.
 *
 * Tres cosas, y las tres son sobre no engañar a nadie en los dos sentidos: ni
 * que se borre sin querer, ni que crea que no se borró.
 *
 * 1. **No se borra con un toque distraído.** Hay que escribir una palabra.
 * 2. **Se dice qué se va, entero.** Y se dice qué NO se va, que es la parte que
 *    no conviene contar.
 * 3. **Después de borrar se sale de la pantalla**, porque la cuenta que muestra
 *    ya no existe.
 *
 * Que el borrado sea real no se prueba acá: eso vive en
 * `supabase/tests/56_account_deletion.sql`.
 */

import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { DeleteAccount } from './DeleteAccount.tsx'
import { deleteAccount } from './deleteAccount.ts'

jest.mock('./deleteAccount.ts', () => ({
  deleteAccount: jest.fn(),
  DeleteAccountError: class extends Error {},
}))

const borrar = deleteAccount as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  borrar.mockResolvedValue(undefined)
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

describe('borrar la cuenta', () => {
  it('no se borra con un toque distraído', async () => {
    render(<DeleteAccount onDeleted={jest.fn()} onCancel={jest.fn()} />)

    fireEvent.press(screen.getByTestId('delete-account-submit'))
    expect(borrar).not.toHaveBeenCalled()

    // Ni con una palabra parecida.
    fireEvent.changeText(screen.getByTestId('delete-account-confirm'), 'borra')
    fireEvent.press(screen.getByTestId('delete-account-submit'))
    expect(borrar).not.toHaveBeenCalled()
  })

  it('borra cuando la palabra está escrita, sin distinguir mayúsculas', async () => {
    const listo = jest.fn()
    render(<DeleteAccount onDeleted={listo} onCancel={jest.fn()} />)

    fireEvent.changeText(screen.getByTestId('delete-account-confirm'), 'BORRAR')
    fireEvent.press(screen.getByTestId('delete-account-submit'))

    await waitFor(() => {
      expect(borrar).toHaveBeenCalled()
      expect(listo).toHaveBeenCalled()
    })
  })

  it('dice qué se va, incluido el perfil de artista', async () => {
    render(<DeleteAccount onDeleted={jest.fn()} onCancel={jest.fn()} />)

    expect(screen.getByText(/Tus conversaciones/i)).toBeTruthy()
    expect(screen.getByText(/Las reseñas que escribiste/i)).toBeTruthy()
    expect(screen.getByText(/Tu perfil de artista/i)).toBeTruthy()
    expect(screen.getByText(/le contaste al asistente/i)).toBeTruthy()
  })

  it('y dice qué NO se va, que es la parte que no conviene contar', async () => {
    render(<DeleteAccount onDeleted={jest.fn()} onCancel={jest.fn()} />)

    const nota = screen.getByText(/Queda un solo registro/i)
    expect(nota.props.children).toMatch(/Sin tu mail/i)
  })

  it('no dice que borró si falló', async () => {
    borrar.mockRejectedValue(new Error('sin red'))
    const listo = jest.fn()
    render(<DeleteAccount onDeleted={listo} onCancel={jest.fn()} />)

    fireEvent.changeText(screen.getByTestId('delete-account-confirm'), 'borrar')
    fireEvent.press(screen.getByTestId('delete-account-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('delete-account-error')).toBeTruthy()
    })
    expect(listo).not.toHaveBeenCalled()
  })
})
