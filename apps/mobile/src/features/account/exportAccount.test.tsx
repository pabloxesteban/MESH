/**
 * Llevarte lo tuyo, del lado de la pantalla.
 *
 * 1. **Primero se cuenta qué hay adentro.** Un archivo que aparece sin decir
 *    qué trae no es acceso a nada.
 * 2. **Se dice qué NO trae**, antes de que alguien lo descubra abriéndolo.
 * 3. **Copiar solo aparece si no se pudo compartir.** En un teléfono la hoja ya
 *    resolvió el problema, y un segundo botón sería ruido.
 *
 * Que el export traiga lo tuyo y no lo que escribieron otros se prueba en
 * `supabase/tests/59_account_export.sql`.
 */

import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { ExportAccount } from './ExportAccount.tsx'
import { exportAccount } from './exportAccount.ts'

jest.mock('./exportAccount.ts', () => ({
  exportAccount: jest.fn(),
  ExportError: class extends Error {},
}))

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}))

const armar = exportAccount as jest.Mock

const JSON_DE_PRUEBA = JSON.stringify({
  busquedas: [{ titulo: 'a' }, { titulo: 'b' }],
  conversaciones: [{ con: 'x' }],
  turnos: [],
  resenas_que_escribiste: [],
  obra_guardada: [],
  asistente: [],
})

beforeEach(() => {
  jest.clearAllMocks()
  armar.mockResolvedValue({ json: JSON_DE_PRUEBA, shared: false })
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

describe('llevarte lo tuyo', () => {
  it('dice qué NO trae antes de armar nada', () => {
    render(<ExportAccount />)
    expect(
      screen.getByText(/Lo que escribieron otras personas no está/i),
    ).toBeTruthy()
  })

  it('cuenta qué hay adentro, y omite lo que está vacío', async () => {
    render(<ExportAccount />)
    fireEvent.press(screen.getByTestId('export-account-action'))

    await waitFor(() =>
      expect(screen.getByTestId('export-summary')).toBeTruthy(),
    )
    expect(screen.getByText('· 2 búsquedas')).toBeTruthy()
    // Singular de verdad: MESH no tiene motor de plurales, y "1 conversaciones"
    // es el bug que las variantes `.one` existen para evitar.
    expect(screen.getByText('· 1 conversación')).toBeTruthy()
    // Cero turnos no se dibuja: una lista de ceros no informa nada.
    expect(screen.queryByText(/0 turnos/)).toBeNull()
  })

  it('ofrece copiar cuando no hubo hoja para compartir', async () => {
    render(<ExportAccount />)
    fireEvent.press(screen.getByTestId('export-account-action'))

    await waitFor(() =>
      expect(screen.getByTestId('export-account-copy')).toBeTruthy(),
    )
  })

  it('y no lo ofrece cuando el archivo ya se compartió', async () => {
    // En un teléfono la hoja ya resolvió el problema: un segundo botón sería
    // ruido justo después de que la persona eligió a dónde mandarlo.
    armar.mockResolvedValue({ json: JSON_DE_PRUEBA, shared: true })
    render(<ExportAccount />)
    fireEvent.press(screen.getByTestId('export-account-action'))

    await waitFor(() =>
      expect(screen.getByTestId('export-summary')).toBeTruthy(),
    )
    expect(screen.queryByTestId('export-account-copy')).toBeNull()
  })

  it('no dice que está listo si falló', async () => {
    armar.mockRejectedValue(new Error('sin red'))
    render(<ExportAccount />)
    fireEvent.press(screen.getByTestId('export-account-action'))

    await waitFor(() => expect(screen.getByTestId('export-error')).toBeTruthy())
    expect(screen.queryByTestId('export-summary')).toBeNull()
  })
})
