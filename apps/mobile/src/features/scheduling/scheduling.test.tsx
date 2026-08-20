/**
 * El almanaque, del lado de la pantalla.
 *
 * Lo que se testea acá no se ve en una captura y es lo que sostiene la promesa
 * de ADR-018:
 *
 * 1. **Un hueco tomado no se ofrece.** La base lo rechaza igual —para eso está
 *    la restricción de exclusión— pero ofrecer un horario que va a fallar es
 *    hacerle perder el turno al artista delante del cliente.
 * 2. **El cliente no puede dar un turno.** El botón es del dueño de la agenda.
 * 3. **El almanaque público dice cuántos huecos, nunca cuáles.** Ver el
 *    almanaque no es ver la agenda.
 *
 * Las fechas se calculan a partir de hoy en vez de fijar el reloj: el cálculo
 * de huecos ya tiene sus tests puros con fechas fijas en `day.test.ts`, y acá
 * lo que importa es que la pantalla y el cálculo hablen el mismo idioma.
 */

import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'
import { ChatScreen } from '@/features/chat/ChatScreen.tsx'

import { AvailabilityEditor } from './AvailabilityEditor.tsx'
import { PublicCalendar } from './PublicCalendar.tsx'
import { ScheduleFromChat } from './ScheduleFromChat.tsx'
import { atMinutes, isoDate } from './day.ts'
import {
  addWeeklyRule,
  fetchAppointments,
  fetchBusySlots,
  fetchExceptions,
  fetchOwnProfessionalForConversation,
  fetchWeeklyRules,
  scheduleAppointment,
} from './queries.ts'

jest.mock('./queries.ts', () => ({
  ...jest.requireActual('./queries.ts'),
  fetchWeeklyRules: jest.fn(),
  fetchExceptions: jest.fn(),
  fetchBusySlots: jest.fn(),
  fetchAppointments: jest.fn(),
  fetchOwnProfessionalForConversation: jest.fn(),
  addWeeklyRule: jest.fn(),
  removeWeeklyRule: jest.fn(),
  closeDay: jest.fn(),
  removeException: jest.fn(),
  scheduleAppointment: jest.fn(),
  cancelAppointment: jest.fn(),
}))

jest.mock('@/features/chat/queries.ts', () => ({
  fetchMessages: jest.fn().mockResolvedValue([]),
  sendMessage: jest.fn().mockResolvedValue(undefined),
  markConversationRead: jest.fn().mockResolvedValue(undefined),
  subscribeToMessages: jest.fn().mockReturnValue(() => undefined),
}))

const reglas = fetchWeeklyRules as jest.Mock
const excepciones = fetchExceptions as jest.Mock
const ocupados = fetchBusySlots as jest.Mock
const turnos = fetchAppointments as jest.Mock
const duenoDeLaAgenda = fetchOwnProfessionalForConversation as jest.Mock
const agregarRegla = addWeeklyRule as jest.Mock
const agendar = scheduleAppointment as jest.Mock

/**
 * Pasado mañana y un día más. Dos condiciones que lo fijan: **no puede ser
 * hoy**, porque el cálculo tapa las horas ya pasadas y el resultado dependería
 * de a qué hora corra el test; y tiene que caer **dentro de los siete días** que
 * muestra el almanaque del perfil.
 */
const DIA = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d
})()

beforeEach(() => {
  jest.clearAllMocks()
  reglas.mockResolvedValue([])
  excepciones.mockResolvedValue([])
  ocupados.mockResolvedValue([])
  turnos.mockResolvedValue([])
  duenoDeLaAgenda.mockResolvedValue(null)
  agregarRegla.mockResolvedValue(undefined)
  agendar.mockResolvedValue({ ok: true })
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

describe('dar un turno desde el chat', () => {
  async function abrirLaHoja() {
    render(
      <ScheduleFromChat
        conversationId="c1"
        professionalId="p1"
        onScheduled={jest.fn()}
      />,
    )
    fireEvent.press(screen.getByTestId('schedule-open'))
    await waitFor(() =>
      expect(screen.getByTestId(`schedule-day-${isoDate(DIA)}`)).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId(`schedule-day-${isoDate(DIA)}`))
  }

  it('no ofrece un horario que ya está tomado', async () => {
    reglas.mockResolvedValue([
      { id: 'r1', weekday: DIA.getDay(), startsAt: '14:00', endsAt: '20:00' },
    ])
    // Ocupado de 16 a 18. Con dos horas de turno, eso deja 14:00 y 18:00 y
    // nada en el medio: a las 14:30 el turno se metería adentro de lo tomado.
    ocupados.mockResolvedValue([
      {
        startsAt: atMinutes(DIA, 16 * 60).toISOString(),
        endsAt: atMinutes(DIA, 18 * 60).toISOString(),
      },
    ])

    await abrirLaHoja()

    await waitFor(() =>
      expect(screen.getByTestId('schedule-slot-14:00')).toBeTruthy(),
    )
    expect(screen.getByTestId('schedule-slot-18:00')).toBeTruthy()
    expect(screen.queryByTestId('schedule-slot-16:00')).toBeNull()
    expect(screen.queryByTestId('schedule-slot-14:30')).toBeNull()
  })

  it('un día sin horario cargado no ofrece nada, y lo dice', async () => {
    reglas.mockResolvedValue([])
    await abrirLaHoja()
    await waitFor(() =>
      expect(screen.getByTestId('schedule-no-slots')).toBeTruthy(),
    )
  })

  it('si alguien lo tomó recién, lo dice y la hoja queda abierta', async () => {
    reglas.mockResolvedValue([
      { id: 'r1', weekday: DIA.getDay(), startsAt: '14:00', endsAt: '20:00' },
    ])
    agendar.mockResolvedValue({ ok: false, reason: 'taken' })

    await abrirLaHoja()
    await waitFor(() =>
      expect(screen.getByTestId('schedule-slot-14:00')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('schedule-slot-14:00'))

    await waitFor(() =>
      expect(
        screen.getByText('Ese horario ya está ocupado. Elegí otro.'),
      ).toBeTruthy(),
    )
    // Sigue abierta: cerrarla obligaría a volver a elegir día y duración por un
    // error que no cometió quien está mirando.
    expect(screen.getByTestId('schedule-sheet')).toBeTruthy()
  })

  it('el horario elegido se manda en hora local, no corrido tres horas', async () => {
    reglas.mockResolvedValue([
      { id: 'r1', weekday: DIA.getDay(), startsAt: '14:00', endsAt: '20:00' },
    ])

    await abrirLaHoja()
    await waitFor(() =>
      expect(screen.getByTestId('schedule-slot-14:00')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('schedule-slot-14:00'))

    await waitFor(() => expect(agendar).toHaveBeenCalled())
    const [, desde, hasta] = agendar.mock.calls[0] as [
      string,
      Date,
      Date,
      string | null,
    ]
    expect(desde.getHours()).toBe(14)
    expect(hasta.getHours()).toBe(16)
    expect(isoDate(desde)).toBe(isoDate(DIA))
  })
})

describe('quién puede dar un turno', () => {
  it('el cliente no ve el botón', async () => {
    duenoDeLaAgenda.mockResolvedValue(null)
    render(
      <ChatScreen
        conversationId="c1"
        userId="u1"
        title="Aguja Fina"
        onBack={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('chat-messages')).toBeTruthy(),
    )
    expect(screen.queryByTestId('schedule-open')).toBeNull()
  })

  it('el dueño de la agenda sí', async () => {
    duenoDeLaAgenda.mockResolvedValue('p1')
    render(
      <ChatScreen
        conversationId="c1"
        userId="u1"
        title="Alguien"
        onBack={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('schedule-open')).toBeTruthy(),
    )
  })

  it('el turno de OTRA conversación no aparece en esta', async () => {
    turnos.mockResolvedValue([
      {
        id: 'a1',
        startsAt: atMinutes(DIA, 17 * 60).toISOString(),
        endsAt: atMinutes(DIA, 19 * 60).toISOString(),
        status: 'scheduled',
        note: null,
        professionalId: 'p1',
        conversationId: 'otra',
      },
    ])
    render(
      <ChatScreen
        conversationId="c1"
        userId="u1"
        title="Aguja Fina"
        onBack={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('chat-messages')).toBeTruthy(),
    )
    expect(screen.queryByTestId('appointment-a1')).toBeNull()
  })
})

describe('el almanaque del perfil', () => {
  it('dice cuántos huecos quedan, nunca a qué hora', async () => {
    reglas.mockResolvedValue([
      { id: 'r1', weekday: DIA.getDay(), startsAt: '10:00', endsAt: '14:00' },
    ])

    render(<PublicCalendar professionalId="p1" />)
    await waitFor(() =>
      expect(screen.getByTestId('public-calendar')).toBeTruthy(),
    )

    expect(screen.getByTestId(`calendar-${isoDate(DIA)}`)).toBeTruthy()
    // Con 10 a 14 y turnos de dos horas hay tres comienzos posibles: 10, 11 y
    // 12. Se muestra el tres; los horarios se acuerdan hablando.
    expect(screen.getByText('3 libres')).toBeTruthy()
    expect(screen.queryByText('10:00')).toBeNull()
    expect(screen.queryByText('12:00')).toBeNull()
  })

  it('sin horario cargado no muestra una semana vacía, avisa', async () => {
    reglas.mockResolvedValue([])
    render(<PublicCalendar professionalId="p1" />)
    await waitFor(() =>
      expect(screen.getByTestId('public-calendar-empty')).toBeTruthy(),
    )
    expect(screen.queryByTestId('public-calendar')).toBeNull()
  })
})

describe('cargar el horario semanal', () => {
  it('elegido el desde, solo se ofrecen horas posteriores', async () => {
    render(<AvailabilityEditor professionalId="p1" />)
    await waitFor(() =>
      expect(screen.getByTestId('availability-editor')).toBeTruthy(),
    )

    expect(screen.getByTestId('availability-hour-08:00')).toBeTruthy()
    fireEvent.press(screen.getByTestId('availability-hour-14:00'))

    // Un "hasta" anterior al "desde" no se puede elegir porque no está.
    expect(screen.queryByTestId('availability-hour-08:00')).toBeNull()
    expect(screen.queryByTestId('availability-hour-14:00')).toBeNull()
    expect(screen.getByTestId('availability-hour-20:00')).toBeTruthy()
  })

  it('el segundo toque guarda el tramo', async () => {
    render(<AvailabilityEditor professionalId="p1" />)
    await waitFor(() =>
      expect(screen.getByTestId('availability-editor')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('availability-hour-14:00'))
    fireEvent.press(screen.getByTestId('availability-hour-20:00'))

    // Lunes, que es el día que arranca elegido.
    await waitFor(() =>
      expect(agregarRegla).toHaveBeenCalledWith('p1', 1, '14:00', '20:00'),
    )
  })
})
