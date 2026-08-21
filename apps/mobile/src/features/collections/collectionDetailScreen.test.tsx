/**
 * `CollectionDetailScreen`: adentro de "Todo" o de una colección real.
 *
 * Tres modos posibles (ver el comentario de cabecera del componente); acá se
 * cubren los estados de datos remotos de los dos primeros (carga, vacío en
 * sus dos variantes, error + reintentar, éxito con grilla) y borrar una
 * colección. El modo agregar tiene su propio archivo porque comparte muy poco
 * con el resto: `collectionDetailAddMode.test.tsx`.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor, fireEvent } from '@testing-library/react-native'
import { useState } from 'react'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { ALL_COLLECTION_ID } from './CollectionsScreen.tsx'
import { CollectionDetailScreen } from './CollectionDetailScreen.tsx'
import {
  deleteCollection,
  fetchCollectionItems,
  fetchMyCollections,
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
const fetchSavedMock = fetchSaved as jest.Mock
const fetchCollectionsMock = fetchMyCollections as jest.Mock
const deleteCollectionMock = deleteCollection as jest.Mock
const useSavedMock = useSaved as jest.Mock

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
          // Ver `accountHeader.test.tsx` para por qué esto no es opcional
          // apenas hay una mutación exitosa de por medio (borrar la
          // colección, acá).
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
        collectionId="col-1"
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
  fetchItemsMock.mockResolvedValue([])
  fetchSavedMock.mockResolvedValue([])
  fetchCollectionsMock.mockResolvedValue([
    { id: 'col-1', name: 'Brazo entero', createdAt: '2026-08-20T00:00:00.000Z', itemCount: 0, coverMediaPaths: [] },
  ])
  useSavedMock.mockReturnValue({
    isSaved: () => false,
    toggle: jest.fn(),
    isLoading: false,
  })
  deleteCollectionMock.mockResolvedValue(undefined)
})

describe('estados', () => {
  it('carga: esqueletos', async () => {
    fetchItemsMock.mockReturnValue(new Promise(() => undefined))
    renderScreen()
    expect(screen.getByTestId('collection-detail-loading')).toBeTruthy()
  })

  it('error: ofrece reintentar', async () => {
    fetchItemsMock.mockRejectedValue(new Error('sin red'))
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('collection-detail-error')).toBeTruthy())

    fireEvent.press(screen.getByText('Reintentar'))
    await waitFor(() => expect(fetchItemsMock).toHaveBeenCalledTimes(2))
  })

  it('"Todo" vacío: el vacío general de guardados, con salida a explorar', async () => {
    fetchItemsMock.mockResolvedValue([])
    const onExplore = jest.fn()
    renderScreen({ collectionId: ALL_COLLECTION_ID, onExplore })

    await waitFor(() => expect(screen.getByTestId('collection-detail-empty')).toBeTruthy())
    expect(screen.getByText('Todavía no guardaste nada')).toBeTruthy()
  })

  it('colección recién creada, vacía: ofrece agregar de lo guardado o seguir explorando', async () => {
    fetchItemsMock.mockResolvedValue([])
    const onAddFromSaved = jest.fn()
    const onExplore = jest.fn()
    renderScreen({ onAddFromSaved, onExplore })

    await waitFor(() => expect(screen.getByTestId('collection-detail-empty')).toBeTruthy())
    expect(screen.getByText('Esta colección todavía no tiene nada.')).toBeTruthy()

    fireEvent.press(screen.getByText('Agregar de lo que guardaste'))
    expect(onAddFromSaved).toHaveBeenCalled()

    fireEvent.press(screen.getByText('Seguir explorando'))
    expect(onExplore).toHaveBeenCalled()
  })

  it('con obra: grilla escalonada, una tarjeta por pieza', async () => {
    fetchItemsMock.mockResolvedValue([pieza('a'), pieza('b'), pieza('c')])
    renderScreen()

    await waitFor(() => expect(screen.getByTestId('collection-detail-grid')).toBeTruthy())
    expect(screen.getByTestId('collection-item-a')).toBeTruthy()
    expect(screen.getByTestId('collection-item-b')).toBeTruthy()
    expect(screen.getByTestId('collection-item-c')).toBeTruthy()
  })

  it('tocar una pieza abre al artista', async () => {
    fetchItemsMock.mockResolvedValue([pieza('a')])
    const onOpenArtist = jest.fn()
    renderScreen({ onOpenArtist })

    await waitFor(() => expect(screen.getByTestId('collection-item-a')).toBeTruthy())
    fireEvent.press(screen.getByTestId('collection-item-a'))
    expect(onOpenArtist).toHaveBeenCalledWith('artista-1')
  })
})

describe('borrar la colección', () => {
  it('no aparece en "Todo" ni en modo agregar', async () => {
    fetchItemsMock.mockResolvedValue([])
    renderScreen({ collectionId: ALL_COLLECTION_ID })
    await waitFor(() => expect(screen.getByTestId('collection-detail-empty')).toBeTruthy())
    expect(screen.queryByTestId('collection-delete-entry')).toBeNull()
  })

  it('pide confirmación antes de borrar', async () => {
    fetchItemsMock.mockResolvedValue([pieza('a')])
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('collection-delete-entry')).toBeTruthy())

    fireEvent.press(screen.getByTestId('collection-delete-entry'))
    expect(screen.getByTestId('collection-delete-confirm')).toBeTruthy()
    expect(deleteCollectionMock).not.toHaveBeenCalled()

    fireEvent.press(screen.getByTestId('collection-delete-cancel'))
    expect(screen.queryByTestId('collection-delete-confirm')).toBeNull()
  })

  it('confirmar borra la colección y avisa antes de salir, sin tocar la obra', async () => {
    fetchItemsMock.mockResolvedValue([pieza('a')])
    const onDeleted = jest.fn()
    renderScreen({ onDeleted })
    await waitFor(() => expect(screen.getByTestId('collection-delete-entry')).toBeTruthy())

    fireEvent.press(screen.getByTestId('collection-delete-entry'))
    fireEvent.press(screen.getByTestId('collection-delete-submit'))

    await waitFor(() => expect(deleteCollectionMock).toHaveBeenCalledWith('col-1'))
    // `deleteCollection` es la única llamada: nada toca `saved_items`, que es
    // justo la garantía de ADR-030 §3 (borrar la colección nunca borra la obra).
    expect(fetchSavedMock).not.toHaveBeenCalledWith('col-1')

    await waitFor(() => expect(screen.getByTestId('collection-delete-toast')).toBeTruthy())
    fireEvent.press(screen.getByLabelText('Cerrar aviso'))
    expect(onDeleted).toHaveBeenCalled()
  })
})
