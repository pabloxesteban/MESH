import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { TasteScreen } from './TasteScreen.tsx'

const mockSelect = jest.fn()
const mockIn = jest.fn()
const mockUpsert = jest.fn()
const mockDelete = jest.fn()
const mockMaybeSingle = jest.fn()

jest.mock('../../data/supabase.ts', () => ({
  get supabase() {
    return {
      from: (table: string) => ({
        select: (columns: string) => {
          mockSelect(table, columns)
          return {
            in: mockIn,
            eq: () => ({ maybeSingle: mockMaybeSingle }),
            then: (resolve: (value: unknown) => unknown) =>
              resolve(mockSelect.mock.results.at(-1)?.value),
          }
        },
        upsert: mockUpsert,
        delete: () => ({ eq: mockDelete }),
      }),
    }
  },
}))

/**
 * Las consultas se mockean a nivel de `queries.ts` y no de supabase-js: lo que
 * esta pantalla tiene que hacer bien es mostrar el vector, no armar SQL. El
 * cálculo ya está cubierto por los tests puros de `packages/domain`.
 */
jest.mock('./queries.ts', () => ({
  fetchTasteSource: jest.fn(),
  persistTaste: jest.fn().mockResolvedValue(undefined),
  fetchCategoryId: jest.fn().mockResolvedValue('cat-1'),
  resetTaste: jest.fn().mockResolvedValue(undefined),
}))

import { fetchTasteSource, persistTaste, resetTaste } from './queries.ts'

const fetchMock = fetchTasteSource as jest.MockedFunction<
  typeof fetchTasteSource
>

function source(count: number, styles: readonly string[], saved = false) {
  const interactions = Array.from({ length: count }, (_, index) => ({
    portfolioItemId: `p${index}`,
    verdict: 'like' as const,
    isSaved: saved,
    source: 'discover' as const,
  }))
  const pieces = new Map(
    interactions.map((interaction, index) => [
      interaction.portfolioItemId,
      {
        portfolioItemId: interaction.portfolioItemId,
        styles: [
          { styleSlug: styles[index % styles.length] as string, weight: 1 },
        ],
      },
    ]),
  )
  return { interactions, pieces }
}

function render() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const onExplore = jest.fn()
  renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">
        <TasteScreen userId="user-1" onExplore={onExplore} />
      </I18nProvider>
    </QueryClientProvider>,
  )
  return { onExplore }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('TasteScreen', () => {
  it('muestra progreso honesto por debajo del umbral, con una salida', async () => {
    fetchMock.mockResolvedValue(source(5, ['fine-line']))
    const { onExplore } = render()

    await waitFor(() =>
      expect(screen.getByTestId('taste-not-ready')).toBeTruthy(),
    )
    // Dice cuántas faltan. No hay barra que se llene sola ni recompensa por
    // llegar: llegar habilita una pantalla, que ya es la recompensa.
    expect(screen.getByText(/7 decisiones más/)).toBeTruthy()

    fireEvent.press(screen.getByText('Seguir explorando'))
    expect(onExplore).toHaveBeenCalled()
  })

  it('muestra los estilos con su evidencia cuando ya alcanza', async () => {
    fetchMock.mockResolvedValue(
      source(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    render()

    await waitFor(() => expect(screen.getByTestId('taste-ready')).toBeTruthy())
    expect(screen.getByTestId('taste-style-fine-line')).toBeTruthy()
    // La evidencia en crudo es lo que hace auditable al perfil.
    expect(screen.getAllByText(/me gusta/).length).toBeGreaterThan(0)
  })

  it('nunca muestra un número de puntaje', async () => {
    // Ver ADR-005: "0,82" afirma una precisión que una docena de decisiones no
    // sostiene. La barra es la única representación.
    fetchMock.mockResolvedValue(
      source(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    render()

    await waitFor(() => expect(screen.getByTestId('taste-ready')).toBeTruthy())
    expect(screen.queryByText(/\d+\s*%/)).toBeNull()
    expect(screen.queryByText(/0[.,]\d\d/)).toBeNull()
  })

  it('describe la fuerza en palabras para el lector de pantalla', async () => {
    fetchMock.mockResolvedValue(
      source(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    render()
    await waitFor(() => expect(screen.getByTestId('taste-ready')).toBeTruthy())
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0)
    expect(
      screen.getAllByLabelText(/presente en lo que elegís/i).length,
    ).toBeGreaterThan(0)
  })

  it('persiste el vector como efecto secundario del cálculo', async () => {
    fetchMock.mockResolvedValue(
      source(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    render()
    await waitFor(() => expect(persistTaste).toHaveBeenCalled())
    const [, payload] = (persistTaste as jest.Mock).mock.calls[0] ?? []
    expect(payload).toMatchObject({ isReady: true, algoVersion: 'taste/1' })
  })

  it('pide un segundo toque antes de borrar el gusto', async () => {
    // Un modal se contesta por reflejo. Un botón que cambia de texto exige leer.
    fetchMock.mockResolvedValue(
      source(15, ['fine-line', 'dotwork', 'blackwork']),
    )
    render()
    await waitFor(() => expect(screen.getByTestId('taste-ready')).toBeTruthy())

    fireEvent.press(screen.getByTestId('taste-reset'))
    expect(resetTaste).not.toHaveBeenCalled()
    expect(screen.getByText('Tocá de nuevo para borrarlo')).toBeTruthy()

    fireEvent.press(screen.getByTestId('taste-reset'))
    await waitFor(() => expect(resetTaste).toHaveBeenCalledTimes(1))
  })

  it('muestra error con reintentar y sin el mensaje crudo', async () => {
    fetchMock.mockRejectedValue({
      code: '42501',
      message: 'permission denied for table interactions',
    })
    render()
    await waitFor(() => expect(screen.getByTestId('taste-error')).toBeTruthy())
    expect(screen.queryByText(/permission denied/i)).toBeNull()
  })
})
