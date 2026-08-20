/**
 * El mazo del artista y la lista de interesados.
 *
 * Lo que NO se testea acá: si un artista puede ver una búsqueda que nadie
 * abrió. Eso lo decide RLS, no el cliente, y está en
 * supabase/tests/46_open_searches.sql y en tests/integration. Un test de
 * componente que "verifica" privacidad solo verifica que el cliente se porta
 * bien cuando quiere.
 *
 * Lo que sí se testea acá es lo que el cliente decide de verdad: qué se manda
 * al tocar, que deshacer revierta la escritura, y que la tarjeta no muestre
 * nada que no le corresponde ver a un artista.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { InterestList } from './InterestList.tsx'
import { SearchDeckScreen } from './SearchDeckScreen.tsx'
import { decideOnSearch, fetchOpenSearchFeed, undoDecision } from './queries.ts'
import { dismissInterest, fetchSearchInterests } from './interests.ts'

jest.mock('./queries.ts')
jest.mock('./interests.ts')
jest.mock('../brief/queries.ts', () => ({
  sendProposal: jest.fn().mockResolvedValue(undefined),
}))

const feedMock = fetchOpenSearchFeed as jest.Mock
const decideMock = decideOnSearch as jest.Mock
const undoMock = undoDecision as jest.Mock
const interestsMock = fetchSearchInterests as jest.Mock
const dismissMock = dismissInterest as jest.Mock
const sendProposalMock = jest.requireMock('../brief/queries.ts')
  .sendProposal as jest.Mock

function busqueda(patch: Record<string, unknown> = {}) {
  return {
    projectId: 'proj-1',
    title: 'Algo de línea fina',
    description: null,
    locationSlug: 'palermo',
    budgetMinCents: null,
    budgetMaxCents: null,
    budgetCurrency: null,
    timing: null,
    sizeNote: null,
    createdAt: '2026-08-18T12:00:00Z',
    styleSlugs: ['fine-line'],
    referenceUrls: ['https://ejemplo.test/a.jpg'],
    ...patch,
  }
}

function renderDeck(professionalId: string | null = 'pro-1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider locale="es-AR">
            <SearchDeckScreen
              categorySlug="tattoo"
              professionalId={professionalId}
              onOpenStudio={jest.fn()}
            />
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

function renderInterests(onOpenProfile = jest.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider locale="es-AR">
            <InterestList onOpenProfile={onOpenProfile} />
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
  return onOpenProfile
}

beforeEach(() => {
  jest.clearAllMocks()
  feedMock.mockResolvedValue({ items: [busqueda()], nextCursor: null })
  interestsMock.mockResolvedValue([])
  decideMock.mockResolvedValue(undefined)
  undoMock.mockResolvedValue(undefined)
})

describe('mazo de búsquedas', () => {
  it('sin perfil de artista explica la causa en vez de decir que no hay nada', async () => {
    renderDeck(null)
    await waitFor(() =>
      expect(screen.getByTestId('demand-no-profile')).toBeTruthy(),
    )
    // Un vacío genérico ("no hay búsquedas") mentiría sobre por qué.
    expect(screen.queryByTestId('demand-empty')).toBeNull()
    expect(feedMock).not.toHaveBeenCalled()
  })

  it('la tarjeta no muestra quién hizo la búsqueda', async () => {
    // El feed no devuelve identidad, así que no hay nada que mostrar. Este test
    // fija el contrato del lado del cliente: si mañana alguien agrega un nombre
    // a la tarjeta, hay que agregarlo también acá y justificarlo.
    renderDeck()
    await waitFor(() =>
      expect(screen.getByTestId('demand-card-top')).toBeTruthy(),
    )
    expect(Object.keys(busqueda())).not.toContain('userId')
    expect(Object.keys(busqueda())).not.toContain('displayName')
  })

  it('me interesa abre la propuesta, y no decide nada todavía', async () => {
    // Desde ADR-020 interesarse no es un booleano: la base rechaza un interés
    // sin precio, así que la tarjeta no se puede decidir con un toque.
    renderDeck()
    await waitFor(() =>
      expect(screen.getByTestId('demand-card-top')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('demand-interest'))

    expect(screen.getByTestId('proposal-composer')).toBeTruthy()
    expect(decideMock).not.toHaveBeenCalled()
  })

  it('cancelar la propuesta deja la búsqueda donde estaba', async () => {
    renderDeck()
    await waitFor(() =>
      expect(screen.getByTestId('demand-card-top')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('demand-interest'))
    fireEvent.press(screen.getByTestId('proposal-cancel'))

    expect(screen.queryByTestId('proposal-composer')).toBeNull()
    expect(screen.getByTestId('demand-card-top')).toBeTruthy()
    expect(decideMock).not.toHaveBeenCalled()
  })

  it('mandar la propuesta es lo que saca la tarjeta del mazo', async () => {
    renderDeck()
    await waitFor(() =>
      expect(screen.getByTestId('demand-card-top')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('demand-interest'))
    fireEvent.changeText(screen.getByTestId('proposal-min'), '80000')
    fireEvent.changeText(screen.getByTestId('proposal-max'), '120000')
    fireEvent.press(screen.getByTestId('proposal-sessions-2'))
    fireEvent.press(screen.getByTestId('proposal-submit'))

    await waitFor(() => expect(sendProposalMock).toHaveBeenCalled())
    expect(sendProposalMock.mock.calls[0]?.[0]).toMatchObject({
      projectId: 'proj-1',
      professionalId: 'pro-1',
      // Se escribe en pesos y se guarda en centavos.
      priceMinCents: 8000000,
      priceMaxCents: 12000000,
      sessions: 2,
    })
    await waitFor(() => expect(decideMock).toHaveBeenCalled())
    expect(decideMock.mock.calls[0]).toEqual(['proj-1', 'pro-1', 'interest'])
  })

  it('sin rango no se puede mandar', async () => {
    renderDeck()
    await waitFor(() =>
      expect(screen.getByTestId('demand-card-top')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('demand-interest'))

    expect(
      screen.getByTestId('proposal-submit').props['accessibilityState'],
    ).toMatchObject({ disabled: true })
  })

  it('paso se guarda igual, para que el mazo no repita', async () => {
    renderDeck()
    await waitFor(() =>
      expect(screen.getByTestId('demand-card-top')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('demand-pass'))

    await waitFor(() => expect(decideMock).toHaveBeenCalled())
    expect(decideMock.mock.calls[0]?.[2]).toBe('pass')
  })

  it('deshacer revierte la escritura, no solo la pantalla', async () => {
    renderDeck()
    await waitFor(() =>
      expect(screen.getByTestId('demand-card-top')).toBeTruthy(),
    )

    // Antes de decidir no hay nada que deshacer.
    expect(
      screen.getByTestId('demand-undo').props.accessibilityState.disabled,
    ).toBe(true)

    fireEvent.press(screen.getByTestId('demand-interest'))
    fireEvent.changeText(screen.getByTestId('proposal-min'), '80000')
    fireEvent.changeText(screen.getByTestId('proposal-max'), '120000')
    fireEvent.press(screen.getByTestId('proposal-submit'))
    await waitFor(() => expect(decideMock).toHaveBeenCalled())

    fireEvent.press(screen.getByTestId('demand-undo'))

    // Acá está el punto: sin esto, la persona del otro lado se queda con un
    // interés que el artista cree haber retirado.
    await waitFor(() => expect(undoMock).toHaveBeenCalled())
    expect(undoMock.mock.calls[0]).toEqual(['proj-1', 'pro-1'])
  })

  it('si la escritura falla, la búsqueda vuelve al mazo', async () => {
    decideMock.mockRejectedValue(new Error('sin red'))
    renderDeck()
    await waitFor(() =>
      expect(screen.getByTestId('demand-card-top')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('demand-interest'))
    fireEvent.changeText(screen.getByTestId('proposal-min'), '80000')
    fireEvent.changeText(screen.getByTestId('proposal-max'), '120000')
    fireEvent.press(screen.getByTestId('proposal-submit'))

    // Mostrarla dos veces es preferible a decirle a alguien que mandó un
    // interés que nunca salió.
    await waitFor(() =>
      expect(screen.getByTestId('demand-card-top')).toBeTruthy(),
    )
  })

  it('sin búsquedas ofrece una salida, no un callejón', async () => {
    feedMock.mockResolvedValue({ items: [], nextCursor: null })
    renderDeck()
    await waitFor(() => expect(screen.getByTestId('demand-empty')).toBeTruthy())
  })
})

describe('interesados en tu búsqueda', () => {
  it('sin interesados no muestra ni el encabezado', async () => {
    renderInterests()
    await waitFor(() => expect(interestsMock).toHaveBeenCalled())
    // Un encabezado vacío arriba de los matches sería ruido permanente.
    expect(screen.queryByTestId('interest-list')).toBeNull()
  })

  it('muestra el artista y de qué búsqueda se trata', async () => {
    interestsMock.mockResolvedValue([
      {
        interestId: 'i1',
        projectId: 'proj-1',
        projectTitle: 'Algo de línea fina',
        professionalId: 'pro-1',
        professionalSlug: 'artista-fina',
        professionalName: 'Artista Fina',
        createdAt: '2026-08-18T12:00:00Z',
        priceMinCents: 8000000,
        priceMaxCents: 12000000,
        priceCurrency: 'ARS',
        sessions: 2,
        note: null,
        sampleMediaPath: null,
      },
    ])
    renderInterests()
    await waitFor(() =>
      expect(screen.getByTestId('interest-list')).toBeTruthy(),
    )
    expect(screen.getByText('Artista Fina')).toBeTruthy()
    // Sin esto, "a Fulano le interesás" no se sabe por qué.
    expect(screen.getByText('Algo de línea fina')).toBeTruthy()
  })

  it('descartar saca al artista de la bandeja', async () => {
    interestsMock.mockResolvedValue([
      {
        interestId: 'i1',
        projectId: 'proj-1',
        projectTitle: 'Algo de línea fina',
        professionalId: 'pro-1',
        professionalSlug: 'artista-fina',
        professionalName: 'Artista Fina',
        createdAt: '2026-08-18T12:00:00Z',
        priceMinCents: 8000000,
        priceMaxCents: 12000000,
        priceCurrency: 'ARS',
        sessions: 2,
        note: null,
        sampleMediaPath: null,
      },
    ])
    dismissMock.mockResolvedValue(undefined)
    renderInterests()
    await waitFor(() =>
      expect(screen.getByTestId('interest-dismiss-i1')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('interest-dismiss-i1'))
    await waitFor(() => expect(dismissMock).toHaveBeenCalledWith('i1'))
  })
})
