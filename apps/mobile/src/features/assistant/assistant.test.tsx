/**
 * El asistente, del lado de la pantalla.
 *
 * Lo que se testea acá es lo que hace legítima la excepción de ADR-021, y son
 * cuatro cosas concretas:
 *
 * 1. **Se ve que no es una persona**, y se dicen sus límites antes de la primera
 *    pregunta. Precio, disponibilidad y recomendaciones son lo que la gente va a
 *    preguntarle y lo que tiene prohibido.
 * 2. **El pedido pasa por una pantalla editable** antes de existir. Si se
 *    pudiera publicar desde el hilo, la regla 2 sería una frase en un documento.
 * 3. **Lo que se publica es lo que quedó en el campo**, no lo que propuso el
 *    modelo.
 * 4. **El hilo se puede tirar.**
 *
 * Lo que NO se puede testear acá: que el asistente no diga un precio. Eso vive
 * en el prompt y en la forma de la respuesta, del lado del servidor.
 */

import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { AssistantScreen } from './AssistantScreen.tsx'
import { SendBrief } from './SendBrief.tsx'
import { sendToAssistant } from './assistant.ts'
import {
  deleteAssistantThread,
  fetchAssistantTurns,
  fetchOwnBrief,
  startAssistantThread,
} from './queries.ts'
import { createQuickSearch } from '../quick-search/createQuickSearch.ts'

jest.mock('./assistant.ts', () => ({
  sendToAssistant: jest.fn(),
  AssistantError: class extends Error {},
}))

jest.mock('./queries.ts', () => ({
  startAssistantThread: jest.fn(),
  fetchAssistantTurns: jest.fn(),
  deleteAssistantThread: jest.fn(),
  attachThreadProject: jest.fn().mockResolvedValue(undefined),
  fetchOwnBrief: jest.fn(),
}))

jest.mock('../brief/queries.ts', () => ({
  fetchTraits: jest.fn().mockResolvedValue([
    {
      id: 't-antebrazo',
      slug: 'antebrazo',
      dimension: 'body_area',
      nameKey: 'trait.tattoo.antebrazo',
    },
    {
      id: 't-negro',
      slug: 'negro',
      dimension: 'palette',
      nameKey: 'trait.tattoo.negro',
    },
  ]),
  setProjectTraits: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../quick-search/createQuickSearch.ts', () => ({
  createQuickSearch: jest.fn(),
}))

const abrirHilo = startAssistantThread as jest.Mock
const leerTurnos = fetchAssistantTurns as jest.Mock
const borrarHilo = deleteAssistantThread as jest.Mock
const mandar = sendToAssistant as jest.Mock
const crear = createQuickSearch as jest.Mock
const leerPedido = fetchOwnBrief as jest.Mock

const BRIEF = {
  kind: 'brief' as const,
  title: 'Línea fina en el antebrazo',
  summary: 'Quiero algo de línea fina en el antebrazo, en negro.',
  styleSlug: 'fine-line',
  traits: [{ dimension: 'body_area', slug: 'antebrazo' }],
}

beforeEach(() => {
  jest.clearAllMocks()
  abrirHilo.mockResolvedValue('h1')
  leerTurnos.mockResolvedValue([])
  borrarHilo.mockResolvedValue(undefined)
  crear.mockResolvedValue({ projectId: 'p1', failedUploads: 0 })
  leerPedido.mockResolvedValue(null)
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

function pantalla() {
  return render(
    <AssistantScreen userId="u1" onBack={jest.fn()} onPublished={jest.fn()} />,
  )
}

describe('el hilo del asistente', () => {
  it('dice qué no sabe antes de que se lo pregunten', async () => {
    pantalla()

    await waitFor(() => {
      expect(screen.getByTestId('assistant-opening')).toBeTruthy()
    })

    // Las tres prohibiciones de ADR-021 que la gente descubre preguntando.
    const limites = screen.getByText(/No sé precios/i)
    expect(limites).toBeTruthy()
    expect(limites.props.children).toMatch(/quién tiene lugar/i)
    expect(limites.props.children).toMatch(/no te recomiendo a nadie/i)
  })

  it('etiqueta cada turno del asistente, no solo el primero', async () => {
    leerTurnos.mockResolvedValue([
      { id: '1', role: 'person', body: 'quiero algo chico', createdAt: 'a' },
      { id: '2', role: 'assistant', body: '¿Dónde lo pensás?', createdAt: 'b' },
      { id: '3', role: 'person', body: 'antebrazo', createdAt: 'c' },
      { id: '4', role: 'assistant', body: '¿En negro?', createdAt: 'd' },
    ])
    pantalla()

    await waitFor(() => {
      expect(screen.getByTestId('assistant-turn-4')).toBeTruthy()
    })

    // Dos turnos del asistente más el encabezado de apertura: la etiqueta va
    // siempre, porque en un hilo largo "de quién era esto" se pierde.
    expect(screen.getAllByText('Asistente de MESH')).toHaveLength(3)
  })

  it('manda la opción tocada como un mensaje de la persona', async () => {
    mandar.mockResolvedValue({
      kind: 'question',
      question: '¿Dónde lo pensás?',
      options: ['Antebrazo', 'Espalda'],
    })
    pantalla()

    await waitFor(() => {
      expect(screen.getByTestId('assistant-input')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByTestId('assistant-input'), 'algo chico')
    fireEvent.press(screen.getByTestId('assistant-send'))

    await waitFor(() => {
      expect(screen.getByTestId('assistant-option-Antebrazo')).toBeTruthy()
    })

    fireEvent.press(screen.getByTestId('assistant-option-Antebrazo'))

    await waitFor(() => {
      expect(mandar).toHaveBeenLastCalledWith({
        threadId: 'h1',
        message: 'Antebrazo',
      })
    })
  })

  it('tira el hilo entero cuando se lo pide', async () => {
    const volver = jest.fn()
    render(
      <AssistantScreen userId="u1" onBack={volver} onPublished={jest.fn()} />,
    )

    // Se espera a que el hilo exista: antes de eso no hay nada que borrar, y el
    // botón que se toca en el aire probaría el caso equivocado.
    await waitFor(() => {
      expect(screen.getByTestId('assistant-opening')).toBeTruthy()
    })

    fireEvent.press(screen.getByTestId('assistant-discard'))

    await waitFor(() => {
      expect(borrarHilo).toHaveBeenCalledWith('h1')
      expect(volver).toHaveBeenCalled()
    })
  })
})

describe('la revisión del pedido', () => {
  async function llegarALaRevision() {
    mandar.mockResolvedValue(BRIEF)
    pantalla()

    await waitFor(() => {
      expect(screen.getByTestId('assistant-input')).toBeTruthy()
    })

    fireEvent.changeText(screen.getByTestId('assistant-input'), 'ya está')
    fireEvent.press(screen.getByTestId('assistant-send'))

    await waitFor(() => {
      expect(screen.getByTestId('screen-brief-review')).toBeTruthy()
    })
  }

  it('no publica nada desde el hilo: primero hay que pasar por acá', async () => {
    await llegarALaRevision()

    expect(crear).not.toHaveBeenCalled()
    expect(screen.getByTestId('brief-review-summary').props.value).toBe(
      BRIEF.summary,
    )
  })

  it('dice cuántos datos quedaron vacíos en vez de dibujarlos completos', async () => {
    await llegarALaRevision()

    // Un rasgo de tres: el pedido tiene huecos y se publica igual.
    expect(screen.getByTestId('brief-review-gaps')).toBeTruthy()
  })

  it('publica lo que quedó en el campo, no lo que propuso el modelo', async () => {
    await llegarALaRevision()

    fireEvent.changeText(
      screen.getByTestId('brief-review-summary'),
      'En realidad lo quiero en el gemelo.',
    )
    fireEvent.press(screen.getByTestId('brief-review-open-yes'))
    fireEvent.press(screen.getByTestId('brief-review-publish'))

    await waitFor(() => {
      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'En realidad lo quiero en el gemelo.',
          styleSlugs: ['fine-line'],
        }),
      )
    })
  })

  // El corazón de esta pantalla: **no hay default**.
  //
  // Antes arrancaba apagado, y quien no miraba el interruptor publicaba un
  // pedido que no le llegaba a nadie. Ahora no se puede publicar sin
  // contestar, y no contestar no equivale a que sí. Los tres tests son las
  // tres cosas que pueden pasar.
  it('no publica nada si todavía no se decidió quién lo ve', async () => {
    await llegarALaRevision()
    fireEvent.press(screen.getByTestId('brief-review-publish'))

    await waitFor(() => {
      expect(screen.getByTestId('brief-review-title')).toBeTruthy()
    })
    expect(crear).not.toHaveBeenCalled()
  })

  it('decir que sí lo abre a los tatuadores', async () => {
    await llegarALaRevision()
    fireEvent.press(screen.getByTestId('brief-review-open-yes'))
    fireEvent.press(screen.getByTestId('brief-review-publish'))

    await waitFor(() => {
      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({ openToProfessionals: true }),
      )
    })
  })

  it('decir que no lo publica cerrado, y avisa que no le llega a nadie', async () => {
    await llegarALaRevision()
    fireEvent.press(screen.getByTestId('brief-review-open-no'))

    // El costo se dice antes de confirmar, no después de esperar una semana.
    expect(screen.getByTestId('brief-review-open-note')).toBeTruthy()

    fireEvent.press(screen.getByTestId('brief-review-publish'))

    await waitFor(() => {
      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({ openToProfessionals: false }),
      )
    })
  })
})

describe('mandar el pedido como primer mensaje', () => {
  it('no ofrece nada si todavía no hay un pedido en palabras', async () => {
    render(<SendBrief userId="u1" onSend={jest.fn()} />)

    await waitFor(() => {
      expect(screen.queryByTestId('send-brief')).toBeNull()
    })
  })

  it('muestra qué le llega al artista antes de mandarlo', async () => {
    leerPedido.mockResolvedValue({
      projectId: 'p1',
      title: 'Línea fina en el antebrazo',
      summary: 'Quiero algo de línea fina en el antebrazo, en negro.',
      styleSlug: 'fine-line',
      traitSlugs: ['antebrazo', 'negro'],
    })
    const mandarMensaje = jest.fn()
    render(<SendBrief userId="u1" onSend={mandarMensaje} />)

    await waitFor(() => {
      expect(screen.getByTestId('send-brief-action')).toBeTruthy()
    })

    // Primero se ve, después se manda: es su primer mensaje a un desconocido.
    fireEvent.press(screen.getByTestId('send-brief-action'))
    expect(screen.getByTestId('send-brief-preview')).toBeTruthy()
    expect(mandarMensaje).not.toHaveBeenCalled()

    fireEvent.press(screen.getByTestId('send-brief-action'))
    expect(mandarMensaje).toHaveBeenCalledWith(
      'Quiero algo de línea fina en el antebrazo, en negro.\n\nLínea fina · Antebrazo · Negro',
    )
  })
})
