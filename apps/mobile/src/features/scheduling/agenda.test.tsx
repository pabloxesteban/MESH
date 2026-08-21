/**
 * Tu semana, del lado de la pantalla.
 *
 * 1. **Sin turnos no se dibuja nada.** Un calendario vacío arriba del Estudio
 *    enseña a ignorar esa parte de la pantalla.
 * 2. **Se agrupa por día calendario del huso local**, no recortando el ISO: a
 *    las 22 de Buenos Aires, recortar el ISO pone el turno de esta noche en el
 *    día de mañana.
 * 3. **Si la otra parte no puso nombre, se dice.** Un nombre inventado sería
 *    peor que ninguno.
 * 4. **Reloj de 24 horas.** "02:30 p. m." no es como se lee una hora acá.
 *
 * Quién puede ver qué turno lo garantiza `get_my_appointments()`, y se prueba
 * en `supabase/tests/60_agenda.sql`.
 */

import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { Agenda } from './Agenda.tsx'
import { fetchAgenda } from './queries.ts'

jest.mock('./queries.ts', () => ({ fetchAgenda: jest.fn() }))

const leer = fetchAgenda as jest.Mock

/** Un jueves a las 15, y el mismo día a las 18. Fechas fijas, sin reloj real. */
function turno(id: string, iso: string, nombre: string | null) {
  const inicio = new Date(iso)
  const fin = new Date(inicio.getTime() + 2 * 60 * 60 * 1000)
  return {
    id,
    startsAt: inicio.toISOString(),
    endsAt: fin.toISOString(),
    note: null,
    conversationId: `c-${id}`,
    professionalId: 'p1',
    viewerIsProfessional: true,
    counterpartName: nombre,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  leer.mockResolvedValue([])
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

describe('tu semana', () => {
  it('no se dibuja si no hay turnos', async () => {
    render(<Agenda />)
    await waitFor(() => expect(leer).toHaveBeenCalled())
    expect(screen.queryByTestId('agenda')).toBeNull()
  })

  it('agrupa por día: dos del mismo día van juntos', async () => {
    leer.mockResolvedValue([
      turno('a', '2026-09-03T15:00:00-03:00', 'Ana'),
      turno('b', '2026-09-03T18:00:00-03:00', 'Bruno'),
      turno('c', '2026-09-04T11:00:00-03:00', 'Carla'),
    ])
    render(<Agenda />)

    await waitFor(() => expect(screen.getByTestId('agenda')).toBeTruthy())
    // Dos días, no tres filas sueltas.
    expect(screen.getAllByTestId(/^agenda-day-/).length).toBe(2)
    expect(screen.getByTestId('agenda-entry-a')).toBeTruthy()
    expect(screen.getByTestId('agenda-entry-c')).toBeTruthy()
  })

  it('dice que no hay nombre en vez de inventar uno', async () => {
    leer.mockResolvedValue([turno('a', '2026-09-03T15:00:00-03:00', null)])
    render(<Agenda />)

    await waitFor(() => expect(screen.getByTestId('agenda')).toBeTruthy())
    expect(screen.getByText('No puso su nombre')).toBeTruthy()
  })

  it('muestra la hora en reloj de 24', async () => {
    leer.mockResolvedValue([turno('a', '2026-09-03T15:00:00-03:00', 'Ana')])
    render(<Agenda />)

    await waitFor(() => expect(screen.getByTestId('agenda')).toBeTruthy())
    // El entorno de test corre en UTC, así que 15:00-03:00 son las 18:00.
    expect(screen.getByText('18:00 – 20:00')).toBeTruthy()
  })

  it('respeta el tope cuando se le pone uno', async () => {
    leer.mockResolvedValue([
      turno('a', '2026-09-03T15:00:00-03:00', 'Ana'),
      turno('b', '2026-09-04T15:00:00-03:00', 'Bruno'),
    ])
    render(<Agenda limit={1} />)

    await waitFor(() => expect(screen.getByTestId('agenda')).toBeTruthy())
    expect(screen.getByTestId('agenda-entry-a')).toBeTruthy()
    expect(screen.queryByTestId('agenda-entry-b')).toBeNull()
  })

  it('lleva al chat con el nombre, para que el encabezado no salga vacío', async () => {
    leer.mockResolvedValue([turno('a', '2026-09-03T15:00:00-03:00', 'Ana')])
    const abrir = jest.fn()
    render(<Agenda onOpenChat={abrir} />)

    await waitFor(() =>
      expect(screen.getByTestId('agenda-open-a')).toBeTruthy(),
    )
    // Sin el nombre en la etiqueta, un lector de pantalla anuncia cinco botones
    // "Abrir el chat" idénticos.
    expect(screen.getByLabelText('Abrir el chat con Ana')).toBeTruthy()

    fireEvent.press(screen.getByTestId('agenda-open-a'))
    expect(abrir).toHaveBeenCalledWith('c-a', 'Ana')
  })
})
