/**
 * `CollectionsScreen`: la grilla de nivel superior de Guardados → Colecciones.
 *
 * El caso que ADR-030 marca explícitamente: "cero guardados en absoluto" (no
 * se dibuja NINGÚN tile, ni "Todo" ni "+ Nueva colección") es un estado
 * distinto de "hay guardados, cero colecciones creadas" (sí se ve "Todo" y
 * "+ Nueva colección", nada más). El estado vacío total ya lo cubre
 * `screens.a11y.test.tsx`; acá se agregan los demás.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor, fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { CollectionsScreen } from './CollectionsScreen.tsx'
import { fetchMyCollections } from './queries.ts'
import { fetchSaved } from '@/features/saved/queries.ts'

jest.mock('./queries.ts', () => ({
  fetchMyCollections: jest.fn(),
}))
jest.mock('@/features/saved/queries.ts', () => ({
  fetchSaved: jest.fn(),
}))
jest.mock('@/features/discovery/queries.ts', () => ({
  mediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))

const fetchSavedMock = fetchSaved as jest.Mock
const fetchCollectionsMock = fetchMyCollections as jest.Mock

function pieza(id: string) {
  return {
    savedItemId: id,
    portfolioItemId: `p-${id}`,
    savedAt: '2026-08-20T00:00:00.000Z',
    mediaPath: `${id}/sm.jpg`,
    blurhash: null,
    width: 800,
    height: 1000,
    professionalSlug: 'artista-1',
    professionalName: 'Artista Uno',
    isFixture: false,
  }
}

function renderScreen(props: Partial<React.ComponentProps<typeof CollectionsScreen>> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">
        <CollectionsScreen
          onBack={jest.fn()}
          onOpenCollection={jest.fn()}
          onNewCollection={jest.fn()}
          onExplore={jest.fn()}
          {...props}
        />
      </I18nProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  fetchSavedMock.mockResolvedValue([])
  fetchCollectionsMock.mockResolvedValue([])
})

describe('estados', () => {
  it('carga: esqueletos, no la grilla todavía', async () => {
    fetchSavedMock.mockReturnValue(new Promise(() => undefined))
    renderScreen()
    expect(screen.getByTestId('collections-loading')).toBeTruthy()
  })

  it('error al traer lo guardado: ofrece reintentar', async () => {
    fetchSavedMock.mockRejectedValue(new Error('sin red'))
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('collections-error')).toBeTruthy())

    fireEvent.press(screen.getByText('Reintentar'))
    await waitFor(() => expect(fetchSavedMock).toHaveBeenCalledTimes(2))
  })

  it('cero guardados en absoluto: ningún tile, ni "Todo" ni "+ Nueva"', async () => {
    fetchSavedMock.mockResolvedValue([])
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('collections-empty')).toBeTruthy())

    expect(screen.queryByTestId('collection-tile-all')).toBeNull()
    expect(screen.queryByTestId('collections-new')).toBeNull()
    // Y no pide colecciones si no puede haber ninguna con contenido.
    expect(fetchCollectionsMock).not.toHaveBeenCalled()
  })

  it('hay guardados, cero colecciones creadas: "Todo" y "+ Nueva colección", nada más', async () => {
    fetchSavedMock.mockResolvedValue([pieza('a'), pieza('b')])
    fetchCollectionsMock.mockResolvedValue([])
    renderScreen()

    await waitFor(() => expect(screen.getByTestId('collections-content')).toBeTruthy())
    expect(screen.getByTestId('collection-tile-all')).toBeTruthy()
    expect(screen.getByText('2 obras')).toBeTruthy()
    expect(screen.getByTestId('collections-new')).toBeTruthy()
  })

  it('error al traer colecciones (con guardados de sobra): ofrece reintentar sin perder "Todo" antes visto', async () => {
    fetchSavedMock.mockResolvedValue([pieza('a')])
    fetchCollectionsMock.mockRejectedValue(new Error('sin red'))
    renderScreen()

    await waitFor(() => expect(screen.getByTestId('collections-list-error')).toBeTruthy())
    fireEvent.press(screen.getByText('Reintentar'))
    await waitFor(() => expect(fetchCollectionsMock).toHaveBeenCalledTimes(2))
  })

  it('éxito con colecciones: tiles con nombre y conteo, "Todo" primera', async () => {
    fetchSavedMock.mockResolvedValue([pieza('a'), pieza('b'), pieza('c')])
    fetchCollectionsMock.mockResolvedValue([
      {
        id: 'col-1',
        name: 'Brazo entero',
        createdAt: '2026-08-20T00:00:00.000Z',
        itemCount: 5,
        coverMediaPaths: ['a/sm.jpg'],
      },
    ])
    renderScreen()

    await waitFor(() => expect(screen.getByTestId('collection-tile-col-1')).toBeTruthy())
    expect(screen.getByText('Brazo entero')).toBeTruthy()
    expect(screen.getByText('5 obras')).toBeTruthy()
    expect(screen.getByTestId('collection-tile-all')).toBeTruthy()
  })

  it('tocar una colección la abre por id', async () => {
    fetchSavedMock.mockResolvedValue([pieza('a')])
    fetchCollectionsMock.mockResolvedValue([
      {
        id: 'col-9',
        name: 'Ideas',
        createdAt: '2026-08-20T00:00:00.000Z',
        itemCount: 1,
        coverMediaPaths: [],
      },
    ])
    const onOpenCollection = jest.fn()
    renderScreen({ onOpenCollection })

    await waitFor(() => expect(screen.getByTestId('collection-tile-col-9')).toBeTruthy())
    fireEvent.press(screen.getByTestId('collection-tile-col-9'))
    expect(onOpenCollection).toHaveBeenCalledWith('col-9')
  })

  it('tocar "+ Nueva colección" navega a crear una', async () => {
    fetchSavedMock.mockResolvedValue([pieza('a')])
    const onNewCollection = jest.fn()
    renderScreen({ onNewCollection })

    await waitFor(() => expect(screen.getByTestId('collections-new')).toBeTruthy())
    fireEvent.press(screen.getByTestId('collections-new'))
    expect(onNewCollection).toHaveBeenCalled()
  })
})
