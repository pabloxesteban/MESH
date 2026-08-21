/**
 * `CollectionDetailScreen` en modo agregar: "Todo" abierto con `addToCollectionId`
 * para sumar o sacar obra de una colección de destino.
 *
 * Lo único que ADR-030 exige verificar acá es que marcar/desmarcar dispare un
 * insert o un delete reales sobre `collection_items` — nunca un booleano que
 * se togglea localmente y ya. `toggleMembership` en el componente hace
 * exactamente eso; este archivo lo prueba desde afuera, por el botón.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor, fireEvent } from '@testing-library/react-native'
import { useState } from 'react'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { CollectionDetailScreen } from './CollectionDetailScreen.tsx'
import {
  addToCollection,
  fetchCollectionItems,
  fetchMyCollections,
  removeFromCollection,
} from './queries.ts'
import { fetchSaved } from '@/features/saved/queries.ts'
import { useSaved } from '@/features/saved/useSaved.ts'

jest.mock('./queries.ts', () => ({
  fetchCollectionItems: jest.fn(),
  fetchMyCollections: jest.fn(),
  deleteCollection: jest.fn(),
  addToCollection: jest.fn(),
  removeFromCollection: jest.fn(),
}))
jest.mock('@/features/saved/queries.ts', () => ({
  fetchSaved: jest.fn(),
}))
jest.mock('@/features/saved/useSaved.ts', () => ({
  useSaved: jest.fn(),
}))
jest.mock('@/features/discovery/queries.ts', () => ({
  mediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))

const fetchItemsMock = fetchCollectionItems as jest.Mock
const fetchCollectionsMock = fetchMyCollections as jest.Mock
const addMock = addToCollection as jest.Mock
const removeMock = removeFromCollection as jest.Mock
const useSavedMock = useSaved as jest.Mock
const fetchSavedMock = fetchSaved as jest.Mock

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

function Wrapper({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { gcTime: 0 },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">{children}</I18nProvider>
    </QueryClientProvider>
  )
}

function renderScreen(
  props: Partial<React.ComponentProps<typeof CollectionDetailScreen>> = {},
) {
  return renderWithProviders(
    <Wrapper>
      <CollectionDetailScreen
        userId="u1"
        collectionId="todo"
        addToCollectionId="col-destino"
        onBack={jest.fn()}
        onOpenArtist={jest.fn()}
        onExplore={jest.fn()}
        onAddFromSaved={jest.fn()}
        onDeleted={jest.fn()}
        {...props}
      />
    </Wrapper>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  useSavedMock.mockReturnValue({ isSaved: () => false, toggle: jest.fn(), isLoading: false })
  fetchCollectionsMock.mockResolvedValue([
    { id: 'col-destino', name: 'Ideas', createdAt: '2026-08-20T00:00:00.000Z', itemCount: 1, coverMediaPaths: [] },
  ])
  addMock.mockResolvedValue(undefined)
  removeMock.mockResolvedValue(undefined)
})

it('sumar una obra que todavía no pertenece hace un insert real, no un booleano local', async () => {
  // `items.queryKey` es `['saved']` porque `collectionId` es "todo"; el
  // conjunto de miembros de la colección de destino sale de una consulta
  // aparte con `addToCollectionId`.
  fetchSavedMock.mockResolvedValue([pieza('a')])
  fetchItemsMock.mockResolvedValue([])
  renderScreen()

  await waitFor(() => expect(screen.getByTestId('collection-item-toggle-a')).toBeTruthy())
  expect(screen.getByTestId('collection-item-toggle-a').props.accessibilityState.selected).toBe(false)

  fireEvent.press(screen.getByTestId('collection-item-toggle-a'))

  // Optimista: se ve marcada antes de que la escritura resuelva.
  expect(screen.getByTestId('collection-item-toggle-a').props.accessibilityState.selected).toBe(true)
  await waitFor(() => expect(addMock).toHaveBeenCalledWith('col-destino', 'a'))
  expect(removeMock).not.toHaveBeenCalled()
})

it('sacar una obra que ya pertenece hace un delete real', async () => {
  fetchSavedMock.mockResolvedValue([pieza('a')])
  // Ya es miembro de la colección de destino.
  fetchItemsMock.mockResolvedValue([pieza('a')])
  renderScreen()

  await waitFor(() =>
    expect(
      screen.getByTestId('collection-item-toggle-a').props.accessibilityState.selected,
    ).toBe(true),
  )

  fireEvent.press(screen.getByTestId('collection-item-toggle-a'))
  await waitFor(() => expect(removeMock).toHaveBeenCalledWith('col-destino', 'a'))
  expect(addMock).not.toHaveBeenCalled()
})

it('si la escritura falla, vuelve atrás en vez de quedar mintiendo', async () => {
  fetchSavedMock.mockResolvedValue([pieza('a')])
  fetchItemsMock.mockResolvedValue([])
  addMock.mockRejectedValue(new Error('sin red'))
  renderScreen()

  await waitFor(() => expect(screen.getByTestId('collection-item-toggle-a')).toBeTruthy())
  fireEvent.press(screen.getByTestId('collection-item-toggle-a'))

  await waitFor(() =>
    expect(
      screen.getByTestId('collection-item-toggle-a').props.accessibilityState.selected,
    ).toBe(false),
  )
})

it('"Listo" cierra el modo agregar', async () => {
  fetchSavedMock.mockResolvedValue([])
  fetchItemsMock.mockResolvedValue([])
  const onBack = jest.fn()
  renderScreen({ onBack })

  await waitFor(() => expect(screen.getByTestId('collection-detail-empty')).toBeTruthy())
  fireEvent.press(screen.getByTestId('collection-detail-add-done'))
  expect(onBack).toHaveBeenCalled()
})
