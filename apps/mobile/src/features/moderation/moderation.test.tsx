/**
 * Denunciar y bloquear, del lado de la pantalla.
 *
 * Lo que se testea acá es lo que hace que estas dos cosas sirvan:
 *
 * 1. **Se dice qué pasa después, antes de mandar.** Denunciar sin saber a dónde
 *    va se siente como tirar un papel a un pozo, y la gente deja de hacerlo.
 * 2. **No se manda una denuncia sin motivo.** El botón arranca apagado.
 * 3. **"Ya lo denunciaste" es un mensaje, no un error rojo.** La base lo impide
 *    con un índice único; sin traducirlo, eso vuelve como un fallo genérico.
 * 4. **Bloquear se deshace con el mismo botón**, sin confirmación: es
 *    reversible, inmediato y de nadie más.
 *
 * Lo que NO se puede testear acá: que el bloqueo corte de verdad. Eso lo
 * garantizan las políticas, y está en `supabase/tests/55_moderation.sql`.
 */

import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { SafetyRow } from './SafetyRow.tsx'
import { BlockedList } from './BlockedList.tsx'
import {
  blockProfessional,
  fetchBlockedProfessionals,
  isProfessionalBlocked,
  sendReport,
  unblock,
  unblockProfessional,
} from './queries.ts'

jest.mock('./queries.ts', () => {
  class AlreadyReportedError extends Error {}
  return {
    AlreadyReportedError,
    REPORT_REASONS: [
      'stolen_work',
      'impersonation',
      'harassment',
      'explicit',
      'spam',
      'off_platform',
      'other',
    ],
    sendReport: jest.fn(),
    blockProfessional: jest.fn(),
    unblockProfessional: jest.fn(),
    isProfessionalBlocked: jest.fn(),
    fetchBlockedProfessionals: jest.fn(),
    unblock: jest.fn(),
    blockUser: jest.fn(),
  }
})

const denunciar = sendReport as jest.Mock
const bloquear = blockProfessional as jest.Mock
const desbloquear = unblockProfessional as jest.Mock
const estaBloqueado = isProfessionalBlocked as jest.Mock
const listaBloqueados = fetchBlockedProfessionals as jest.Mock
const quitar = unblock as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  denunciar.mockResolvedValue(undefined)
  bloquear.mockResolvedValue(undefined)
  desbloquear.mockResolvedValue(undefined)
  estaBloqueado.mockResolvedValue(false)
  listaBloqueados.mockResolvedValue([])
  quitar.mockResolvedValue(undefined)
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

function fila(userId: string | null = 'u1') {
  return render(
    <SafetyRow
      userId={userId}
      target={{ kind: 'professional', professionalId: 'p1' }}
      blockProfessionalId="p1"
    />,
  )
}

describe('denunciar', () => {
  it('no ofrece nada sin sesión: sería un botón que la base rechaza', async () => {
    fila(null)
    expect(screen.queryByTestId('safety-row')).toBeNull()
  })

  it('dice qué pasa después antes de mandar', async () => {
    fila()
    fireEvent.press(screen.getByTestId('safety-report'))

    // Las tres cosas que la gente necesita saber para animarse: lo mira una
    // persona, no es automático, y al otro no le llega un aviso.
    const aviso = screen.getByText(/Lo mira alguien del equipo/i)
    expect(aviso.props.children).toMatch(/no es automático/i)
    expect(aviso.props.children).toMatch(/no le llega ningún aviso/i)
  })

  it('no manda una denuncia sin motivo', async () => {
    fila()
    fireEvent.press(screen.getByTestId('safety-report'))

    fireEvent.press(screen.getByTestId('report-submit'))
    expect(denunciar).not.toHaveBeenCalled()

    fireEvent.press(screen.getByTestId('report-reason-stolen_work'))
    fireEvent.press(screen.getByTestId('report-submit'))

    await waitFor(() => {
      expect(denunciar).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'stolen_work', note: null }),
      )
    })
  })

  it('traduce "ya lo denunciaste" en vez de mostrar un error genérico', async () => {
    const { AlreadyReportedError } = jest.requireMock('./queries.ts') as {
      AlreadyReportedError: new (message: string) => Error
    }
    denunciar.mockRejectedValue(new AlreadyReportedError('duplicado'))

    fila()
    fireEvent.press(screen.getByTestId('safety-report'))
    fireEvent.press(screen.getByTestId('report-reason-spam'))
    fireEvent.press(screen.getByTestId('report-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('report-error')).toBeTruthy()
    })
    expect(screen.getByText(/Con una vez alcanza/i)).toBeTruthy()
  })
})

describe('bloquear', () => {
  it('bloquea y deshace con el mismo botón, sin confirmación', async () => {
    fila()

    await waitFor(() => {
      expect(screen.getByTestId('safety-block')).toBeTruthy()
    })

    fireEvent.press(screen.getByTestId('safety-block'))
    await waitFor(() => {
      expect(bloquear).toHaveBeenCalledWith('u1', 'p1')
    })

    estaBloqueado.mockResolvedValue(true)
    fila()

    await waitFor(() => {
      expect(
        screen.getAllByTestId('safety-blocked-note').length,
      ).toBeGreaterThan(0)
    })
  })

  it('dice qué se corta, no solo que está bloqueado', async () => {
    estaBloqueado.mockResolvedValue(true)
    fila()

    await waitFor(() => {
      expect(screen.getByTestId('safety-blocked-note')).toBeTruthy()
    })
    const texto = screen.getByTestId('safety-blocked-note').props.children
    expect(texto).toMatch(/no se escriben/i)
    expect(texto).toMatch(/no puede responder a tus búsquedas/i)
  })
})

describe('la lista de bloqueados', () => {
  it('no existe si no bloqueaste a nadie', async () => {
    render(<BlockedList />)
    await waitFor(() => {
      expect(listaBloqueados).toHaveBeenCalled()
    })
    expect(screen.queryByTestId('blocked-list')).toBeNull()
  })

  it('deja desbloquear, con el nombre en la etiqueta accesible', async () => {
    listaBloqueados.mockResolvedValue([
      {
        blockId: 'b1',
        professionalId: 'p1',
        slug: 'tinta-vieja',
        displayName: 'Tinta Vieja',
      },
    ])
    render(<BlockedList />)

    await waitFor(() => {
      expect(screen.getByTestId('blocked-tinta-vieja')).toBeTruthy()
    })

    // Sin el nombre, un lector de pantalla anuncia tres botones idénticos.
    expect(screen.getByLabelText('Desbloquear a Tinta Vieja')).toBeTruthy()

    fireEvent.press(screen.getByTestId('blocked-undo-tinta-vieja'))
    await waitFor(() => {
      expect(quitar).toHaveBeenCalledWith('b1')
    })
  })
})
