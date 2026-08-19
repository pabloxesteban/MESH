/**
 * Tests del chat.
 *
 * Lo que NO se testea acá: si alguien puede leer un hilo ajeno. Eso lo decide
 * RLS, no el cliente, y está en supabase/tests/45_conversations.sql. Un test de
 * componente que "verifica" autorización solo verifica que el cliente se porta
 * bien cuando quiere.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'
import type { ReactElement } from 'react'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { ChatScreen } from './ChatScreen.tsx'
import { ChatsScreen } from './ChatsScreen.tsx'
import { ConversationList } from './ConversationList.tsx'
import {
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendMessage,
} from './queries.ts'

jest.mock('./queries.ts', () => ({
  fetchConversations: jest.fn(),
  fetchMessages: jest.fn(),
  sendMessage: jest.fn(),
  markConversationRead: jest.fn().mockResolvedValue(undefined),
  subscribeToMessages: jest.fn().mockReturnValue(() => undefined),
}))

const conversationsMock = fetchConversations as jest.Mock
const messagesMock = fetchMessages as jest.Mock
const sendMock = sendMessage as jest.Mock
const readMock = markConversationRead as jest.Mock

function renderScreen(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider locale="es-AR">{element}</I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  messagesMock.mockResolvedValue([])
  conversationsMock.mockResolvedValue([])
  sendMock.mockResolvedValue(undefined)
  readMock.mockResolvedValue(undefined)
})

describe('ConversationList', () => {
  it('no muestra nada cuando no hay hilos', async () => {
    renderScreen(<ConversationList onOpen={jest.fn()} />)
    await waitFor(() => expect(conversationsMock).toHaveBeenCalled())
    expect(screen.queryByTestId('conversation-list')).toBeNull()
  })

  it('marca el no leído sin contar mensajes pendientes', async () => {
    // Un número de pendientes es una cuenta que empuja a volver. Un punto dice
    // lo mismo sin presionar.
    conversationsMock.mockResolvedValue([
      {
        id: 'c1',
        professionalId: 'p1',
        professionalSlug: 'aguja-fina',
        professionalName: 'Aguja Fina',
        lastMessageAt: '2026-08-19T10:00:00Z',
        hasUnread: true,
      },
    ])
    renderScreen(<ConversationList onOpen={jest.fn()} />)

    await waitFor(() =>
      expect(screen.getByTestId('conversation-c1')).toBeTruthy(),
    )
    expect(screen.getByText('Aguja Fina')).toBeTruthy()
    expect(screen.queryByText(/^\d+$/)).toBeNull()
  })

  it('abrir un hilo pasa su id y el nombre', async () => {
    const onOpen = jest.fn()
    conversationsMock.mockResolvedValue([
      {
        id: 'c1',
        professionalId: 'p1',
        professionalSlug: 'aguja-fina',
        professionalName: 'Aguja Fina',
        lastMessageAt: null,
        hasUnread: false,
      },
    ])
    renderScreen(<ConversationList onOpen={onOpen} />)

    await waitFor(() =>
      expect(screen.getByTestId('conversation-c1')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('conversation-c1'))
    expect(onOpen).toHaveBeenCalledWith('c1', 'Aguja Fina')
  })
})

describe('ChatScreen', () => {
  function renderChat() {
    renderScreen(
      <ChatScreen
        conversationId="c1"
        userId="u1"
        title="Aguja Fina"
        onBack={jest.fn()}
      />,
    )
  }

  it('marca leído al abrir, no al salir', async () => {
    // Si la app se cierra de golpe, lo que la persona ya vio no debería seguir
    // contando como pendiente.
    renderChat()
    await waitFor(() => expect(readMock).toHaveBeenCalledWith('c1'))
  })

  it('separa los mensajes propios de los del otro', async () => {
    messagesMock.mockResolvedValue([
      {
        id: 'm1',
        senderUserId: 'u1',
        body: 'Hola',
        createdAt: '2026-08-19T10:00:00Z',
      },
      {
        id: 'm2',
        senderUserId: 'otro',
        body: 'Buenas',
        createdAt: '2026-08-19T10:01:00Z',
      },
    ])
    renderChat()

    await waitFor(() =>
      expect(screen.getByTestId('chat-message-m1')).toBeTruthy(),
    )
    expect(screen.getByTestId('chat-message-m1').props.style.alignSelf).toBe(
      'flex-end',
    )
    expect(screen.getByTestId('chat-message-m2').props.style.alignSelf).toBe(
      'flex-start',
    )
  })

  it('no deja mandar un mensaje vacío ni de puros espacios', async () => {
    renderChat()
    await waitFor(() =>
      expect(screen.getByTestId('chat-messages')).toBeTruthy(),
    )

    expect(
      screen.getByTestId('chat-send').props.accessibilityState.disabled,
    ).toBe(true)

    fireEvent.changeText(screen.getByTestId('chat-input'), '   ')
    expect(
      screen.getByTestId('chat-send').props.accessibilityState.disabled,
    ).toBe(true)
  })

  it('manda el mensaje y limpia el campo', async () => {
    renderChat()
    await waitFor(() =>
      expect(screen.getByTestId('chat-messages')).toBeTruthy(),
    )

    fireEvent.changeText(screen.getByTestId('chat-input'), 'Hola, consulta')
    fireEvent.press(screen.getByTestId('chat-send'))

    await waitFor(() =>
      expect(sendMock).toHaveBeenCalledWith('c1', 'u1', 'Hola, consulta'),
    )
    await waitFor(() =>
      expect(screen.getByTestId('chat-input').props.value).toBe(''),
    )
  })

  it('un error no muestra el mensaje crudo de la base', async () => {
    sendMock.mockRejectedValue(new Error('PGRST301 row-level security'))
    renderChat()
    await waitFor(() =>
      expect(screen.getByTestId('chat-messages')).toBeTruthy(),
    )

    fireEvent.changeText(screen.getByTestId('chat-input'), 'Hola')
    fireEvent.press(screen.getByTestId('chat-send'))

    await waitFor(() =>
      expect(screen.getByTestId('chat-send-error')).toBeTruthy(),
    )
    expect(screen.queryByText(/PGRST301/)).toBeNull()
  })
})

describe('el vacío de Chats no es el mismo de los dos lados', () => {
  beforeEach(() => {
    conversationsMock.mockResolvedValue([])
  })

  it('a quien busca le dice que puede escribir, y lo lleva a los artistas', async () => {
    renderScreen(
      <ChatsScreen
        intent="looking"
        onOpenChat={jest.fn()}
        onOpenHome={jest.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('chats-empty')).toBeTruthy())

    // Decirle "no podés escribir primero" a quien busca sería mentirle sobre
    // lo único que sí puede hacer.
    expect(screen.getByText('Todavía no escribiste a nadie')).toBeTruthy()
    expect(screen.getByText('Ver artistas cerca tuyo')).toBeTruthy()
  })

  it('al artista le dice que no escribe primero, y lo lleva a su mazo', async () => {
    renderScreen(
      <ChatsScreen
        intent="offering"
        onOpenChat={jest.fn()}
        onOpenHome={jest.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('chats-empty')).toBeTruthy())

    // La regla de ADR-012, dicha donde se nota.
    expect(screen.getByText('Todavía no te escribió nadie')).toBeTruthy()
    expect(screen.getByText('Ver quién está buscando')).toBeTruthy()
  })

  it('la salida del vacío existe en los dos lados', async () => {
    const onOpenHome = jest.fn()
    renderScreen(
      <ChatsScreen
        intent="looking"
        onOpenChat={jest.fn()}
        onOpenHome={onOpenHome}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('chats-empty')).toBeTruthy())

    fireEvent.press(screen.getByText('Ver artistas cerca tuyo'))
    expect(onOpenHome).toHaveBeenCalled()
  })
})
