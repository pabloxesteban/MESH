import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { QuickSearchScreen } from './QuickSearchScreen.tsx'
import { classifyReferencePhoto } from './classify.ts'
import { createQuickSearch } from './createQuickSearch.ts'

jest.mock('./createQuickSearch.ts', () => ({
  createQuickSearch: jest.fn(),
}))
jest.mock('./classify.ts', () => ({
  classifyReferencePhoto: jest.fn(),
}))
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///a.jpg' }, { uri: 'file:///b.jpg' }],
  }),
}))

const createQuickSearchMock = createQuickSearch as jest.MockedFunction<
  typeof createQuickSearch
>
const classifyMock = classifyReferencePhoto as jest.MockedFunction<
  typeof classifyReferencePhoto
>

function renderScreen(
  overrides: Partial<{
    onCreated: (id: string) => void
    onCancel: () => void
  }> = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const onCreated = overrides.onCreated ?? jest.fn()
  const onCancel = overrides.onCancel ?? jest.fn()
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider locale="es-AR">
            <QuickSearchScreen
              userId="u1"
              onCreated={onCreated}
              onCancel={onCancel}
            />
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
  return { onCreated, onCancel }
}

beforeEach(() => {
  jest.clearAllMocks()
  classifyMock.mockResolvedValue('fine-line')
})

describe('QuickSearchScreen', () => {
  it('el botón de buscar arranca deshabilitado sin fotos', () => {
    renderScreen()
    expect(
      screen.getByTestId('quick-search-submit').props.accessibilityState
        .disabled,
    ).toBe(true)
  })

  it('se habilita con al menos una foto, sin pedir nada más', async () => {
    renderScreen()
    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    expect(
      screen.getByTestId('quick-search-submit').props.accessibilityState
        .disabled,
    ).toBe(false)
  })

  it('busca clasificando la primera foto, sin barrio si no se eligió', async () => {
    createQuickSearchMock.mockResolvedValue({
      projectId: 'proj-1',
      failedUploads: 0,
    })
    const { onCreated } = renderScreen()

    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-submit'))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('proj-1'))
    expect(classifyMock).toHaveBeenCalledWith({
      uri: 'file:///a.jpg',
      categorySlug: 'tattoo',
    })
    const call = createQuickSearchMock.mock.calls[0]?.[0]
    expect(call?.styleSlugs).toEqual(['fine-line'])
    expect(call?.locationSlug).toBeUndefined()
    expect(call?.imageUris).toHaveLength(2)
  })

  it('tocar el barrio lo suma a la búsqueda', async () => {
    createQuickSearchMock.mockResolvedValue({
      projectId: 'proj-1',
      failedUploads: 0,
    })
    renderScreen()

    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-location-palermo'))
    fireEvent.press(screen.getByTestId('quick-search-submit'))

    await waitFor(() => expect(createQuickSearchMock).toHaveBeenCalled())
    expect(createQuickSearchMock.mock.calls[0]?.[0]?.locationSlug).toBe(
      'palermo',
    )
  })

  it('si no se reconoce ningún estilo, avisa y no inventa uno', async () => {
    classifyMock.mockResolvedValue(null)
    renderScreen()

    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('quick-search-error')).toBeTruthy(),
    )
    expect(createQuickSearchMock).not.toHaveBeenCalled()
  })

  it('con fotos que fallaron, pide un segundo toque antes de avanzar', async () => {
    createQuickSearchMock.mockResolvedValue({
      projectId: 'proj-1',
      failedUploads: 1,
    })
    const { onCreated } = renderScreen()

    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('quick-search-partial')).toBeTruthy(),
    )
    expect(onCreated).not.toHaveBeenCalled()

    fireEvent.press(screen.getByTestId('quick-search-continue'))
    expect(onCreated).toHaveBeenCalledWith('proj-1')
  })

  it('un error muestra un mensaje, no la excepción cruda', async () => {
    createQuickSearchMock.mockRejectedValue(
      new Error('PGRST301 row-level security'),
    )
    renderScreen()

    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('quick-search-error')).toBeTruthy(),
    )
    expect(screen.queryByText(/PGRST301/)).toBeNull()
  })

  it('sacar una foto la quita de la lista', async () => {
    renderScreen()
    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-1')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-photo-0'))
    expect(screen.queryByTestId('quick-search-photo-1')).toBeNull()
  })

  it('cancelar llama a onCancel', () => {
    const { onCancel } = renderScreen()
    fireEvent.press(screen.getByTestId('quick-search-cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
