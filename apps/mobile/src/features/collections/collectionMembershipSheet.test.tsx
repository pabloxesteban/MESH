/**
 * `CollectionMembershipSheet`: el checklist de pertenencia múltiple.
 *
 * Lo que ADR-030 §2 exige verificar: marcar una colección es un `insert`
 * real en `collection_items`, desmarcarla es un `delete` real — nunca un
 * booleano que se togglea en memoria y listo.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor, fireEvent } from '@testing-library/react-native'
import { useState } from 'react'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { CollectionMembershipSheet } from './CollectionMembershipSheet.tsx'
import {
  addToCollection,
  fetchCollectionsForItem,
  fetchMyCollections,
  removeFromCollection,
} from './queries.ts'

jest.mock('./queries.ts', () => ({
  addToCollection: jest.fn(),
  removeFromCollection: jest.fn(),
  fetchCollectionsForItem: jest.fn(),
  fetchMyCollections: jest.fn(),
}))

const addMock = addToCollection as jest.Mock
const removeMock = removeFromCollection as jest.Mock
const fetchForItemMock = fetchCollectionsForItem as jest.Mock
const fetchCollectionsMock = fetchMyCollections as jest.Mock

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

function renderSheet(
  props: Partial<React.ComponentProps<typeof CollectionMembershipSheet>> = {},
) {
  return renderWithProviders(
    <Wrapper>
      <CollectionMembershipSheet
        savedItemId="saved-1"
        onClose={jest.fn()}
        {...props}
      />
    </Wrapper>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  fetchCollectionsMock.mockResolvedValue([
    { id: 'col-1', name: 'Brazo entero', createdAt: '2026-08-20T00:00:00.000Z', itemCount: 3, coverMediaPaths: [] },
    { id: 'col-2', name: 'Ideas', createdAt: '2026-08-19T00:00:00.000Z', itemCount: 1, coverMediaPaths: [] },
  ])
  fetchForItemMock.mockResolvedValue(new Set())
  addMock.mockResolvedValue(undefined)
  removeMock.mockResolvedValue(undefined)
})

it('sin ninguna colección todavía: lo dice, no dibuja un checklist vacío', async () => {
  fetchCollectionsMock.mockResolvedValue([])
  renderSheet()

  await waitFor(() =>
    expect(screen.getByText('Todavía no tenés ninguna colección.')).toBeTruthy(),
  )
})

it('la colección desde la que se abrió ya viene marcada, como cualquier otra', async () => {
  fetchForItemMock.mockResolvedValue(new Set(['col-1']))
  renderSheet()

  await waitFor(() => {
    expect(
      screen.getByTestId('collection-membership-col-1').props.accessibilityState.checked,
    ).toBe(true)
    expect(
      screen.getByTestId('collection-membership-col-2').props.accessibilityState.checked,
    ).toBe(false)
  })
})

it('marcar una colección sin pertenencia dispara un insert, no un toggle local', async () => {
  fetchForItemMock.mockResolvedValue(new Set())
  renderSheet()

  await waitFor(() => expect(screen.getByTestId('collection-membership-col-1')).toBeTruthy())
  fireEvent.press(screen.getByTestId('collection-membership-col-1'))

  await waitFor(() => expect(addMock).toHaveBeenCalledWith('col-1', 'saved-1'))
  expect(removeMock).not.toHaveBeenCalled()
})

it('desmarcar una colección con pertenencia dispara un delete', async () => {
  fetchForItemMock.mockResolvedValue(new Set(['col-1']))
  renderSheet()

  await waitFor(() =>
    expect(
      screen.getByTestId('collection-membership-col-1').props.accessibilityState.checked,
    ).toBe(true),
  )
  fireEvent.press(screen.getByTestId('collection-membership-col-1'))

  await waitFor(() => expect(removeMock).toHaveBeenCalledWith('col-1', 'saved-1'))
  expect(addMock).not.toHaveBeenCalled()
})

it('un error al traer las colecciones o la pertenencia se anuncia', async () => {
  fetchForItemMock.mockRejectedValue(new Error('sin red'))
  renderSheet()

  await waitFor(() => {
    const alerta = screen.getByText('No pudimos guardar el cambio. Probá de nuevo.')
    expect(alerta.props.accessibilityRole).toBe('alert')
  })
})

it('tocar el velo o "Listo" cierran los dos, sin ser dos acciones distintas', async () => {
  const onClose1 = jest.fn()
  const { unmount } = renderSheet({ onClose: onClose1 })
  await waitFor(() => expect(screen.getByTestId('collection-membership-col-1')).toBeTruthy())
  fireEvent.press(screen.getByTestId('collection-membership-backdrop'))
  expect(onClose1).toHaveBeenCalledTimes(1)
  unmount()

  const onClose2 = jest.fn()
  renderSheet({ onClose: onClose2 })
  await waitFor(() => expect(screen.getByTestId('collection-membership-col-1')).toBeTruthy())
  fireEvent.press(screen.getByTestId('collection-membership-done'))
  expect(onClose2).toHaveBeenCalledTimes(1)
})
