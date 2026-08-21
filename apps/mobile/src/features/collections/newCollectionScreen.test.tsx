/**
 * `NewCollectionScreen`: nombrar una colección nueva.
 *
 * Cubre la validación de nombre (1–40 caracteres, botón deshabilitado en
 * blanco), y que crear aterriza DENTRO de la colección recién creada — no
 * vuelve a la grilla.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor, fireEvent } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { NewCollectionScreen } from './NewCollectionScreen.tsx'
import { __resetJustCreated, claimJustCreated } from './justCreated.ts'
import { createCollection } from './queries.ts'

jest.mock('./queries.ts', () => ({
  createCollection: jest.fn(),
}))

const createMock = createCollection as jest.Mock
const impactMock = Haptics.impactAsync as jest.Mock

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
  props: Partial<React.ComponentProps<typeof NewCollectionScreen>> = {},
) {
  return renderWithProviders(
    <Wrapper>
      <NewCollectionScreen
        userId="u1"
        onCancel={jest.fn()}
        onCreated={jest.fn()}
        {...props}
      />
    </Wrapper>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  createMock.mockResolvedValue('col-nuevo')
  __resetJustCreated()
})

it('sin texto: el botón de crear está deshabilitado', () => {
  renderScreen()
  expect(
    screen.getByTestId('new-collection-submit').props.accessibilityState.disabled,
  ).toBe(true)
})

it('con texto: se habilita; solo espacios no cuenta como nombre', () => {
  renderScreen()
  const input = screen.getByTestId('new-collection-name')

  fireEvent.changeText(input, '   ')
  expect(
    screen.getByTestId('new-collection-submit').props.accessibilityState.disabled,
  ).toBe(true)

  fireEvent.changeText(input, 'Ideas')
  expect(
    screen.getByTestId('new-collection-submit').props.accessibilityState.disabled,
  ).toBe(false)
})

it('el campo tiene un tope de 40 caracteres', () => {
  renderScreen()
  expect(screen.getByTestId('new-collection-name').props.maxLength).toBe(40)
})

it('crear manda el nombre recortado y aterriza dentro de la colección creada', async () => {
  const onCreated = jest.fn()
  renderScreen({ onCreated })

  fireEvent.changeText(screen.getByTestId('new-collection-name'), '  Brazo entero  ')
  fireEvent.press(screen.getByTestId('new-collection-submit'))

  await waitFor(() => expect(createMock).toHaveBeenCalledWith('u1', 'Brazo entero'))
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith('col-nuevo'))
})

it('crear dispara el háptico de guardar, antes de aterrizar', async () => {
  const onCreated = jest.fn()
  renderScreen({ onCreated })

  fireEvent.changeText(screen.getByTestId('new-collection-name'), 'Ideas')
  fireEvent.press(screen.getByTestId('new-collection-submit'))

  await waitFor(() => expect(onCreated).toHaveBeenCalledWith('col-nuevo'))
  // Medium: mismo intento que usa `SaveHeart` al guardar.
  expect(impactMock).toHaveBeenCalledWith('medium')
})

it('crear deja la señal de "recién creada" para que el aterrizaje la reclame', async () => {
  renderScreen()

  fireEvent.changeText(screen.getByTestId('new-collection-name'), 'Ideas')
  fireEvent.press(screen.getByTestId('new-collection-submit'))

  await waitFor(() => expect(createMock).toHaveBeenCalled())
  // Reclamarla acá consume la marca: si `NewCollectionScreen` no la hubiera
  // dejado, esto sería `false`.
  expect(claimJustCreated('col-nuevo')).toBe(true)
})

it('un error de creación se muestra y no navega a ningún lado', async () => {
  createMock.mockRejectedValue(new Error('sin red'))
  const onCreated = jest.fn()
  renderScreen({ onCreated })

  fireEvent.changeText(screen.getByTestId('new-collection-name'), 'Ideas')
  fireEvent.press(screen.getByTestId('new-collection-submit'))

  await waitFor(() =>
    expect(
      screen.getByText('No pudimos crear la colección. Probá de nuevo.'),
    ).toBeTruthy(),
  )
  expect(onCreated).not.toHaveBeenCalled()
})

it('cancelar no crea nada', () => {
  const onCancel = jest.fn()
  renderScreen({ onCancel })

  fireEvent.changeText(screen.getByTestId('new-collection-name'), 'Ideas')
  fireEvent.press(screen.getByTestId('new-collection-cancel'))

  expect(onCancel).toHaveBeenCalled()
  expect(createMock).not.toHaveBeenCalled()
})
