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
import { readReferencePhoto } from './classify.ts'
import { createQuickSearch } from './createQuickSearch.ts'

jest.mock('./createQuickSearch.ts', () => ({
  createQuickSearch: jest.fn(),
}))
jest.mock('./classify.ts', () => ({
  readReferencePhoto: jest.fn(),
}))
// El vocabulario sale de la tabla `traits`. Acá se sirve el real, de la misma
// constante de la que se genera `seed.sql`, para que los chips del test sean
// los chips de la app.
jest.mock('../brief/queries.ts', () => {
  const { TRAITS } = jest.requireActual('@mesh/domain')
  return {
    fetchTraits: jest.fn().mockResolvedValue(
      TRAITS.map(
        (trait: { slug: string; dimension: string; nameKey: string }) => ({
          id: `t-${trait.slug}`,
          slug: trait.slug,
          dimension: trait.dimension,
          nameKey: trait.nameKey,
        }),
      ),
    ),
    setProjectTraits: jest.fn().mockResolvedValue(undefined),
  }
})
jest.mock('../location/device.ts', () => ({
  hasDeviceLocationPermission: jest.fn().mockResolvedValue(false),
  currentDeviceLocation: jest.fn().mockResolvedValue(null),
  requestDeviceLocation: jest.fn(),
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
const classifyMock = readReferencePhoto as jest.MockedFunction<
  typeof readReferencePhoto
>
const deviceMock = jest.requireMock('../location/device.ts') as {
  currentDeviceLocation: jest.Mock
  requestDeviceLocation: jest.Mock
}

function renderScreen(
  overrides: Partial<{
    onCreated: (id: string, styleSlug: string) => void
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
  classifyMock.mockResolvedValue({
    styleSlug: 'fine-line',
    traits: [{ dimension: 'body_area', slug: 'antebrazo' }],
  })
  deviceMock.currentDeviceLocation.mockResolvedValue(null)
})

describe('QuickSearchScreen', () => {
  it('leer arranca deshabilitado sin fotos, y publicar todavía no existe', () => {
    renderScreen()
    expect(
      screen.getByTestId('quick-search-read').props.accessibilityState.disabled,
    ).toBe(true)
    // Publicar no aparece hasta que hay algo leído: una pantalla de revisión
    // sobre nada revisado sería un formulario con otro nombre.
    expect(screen.queryByTestId('quick-search-submit')).toBeNull()
  })

  it('se habilita con al menos una foto, sin pedir nada más', async () => {
    renderScreen()
    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    expect(
      screen.getByTestId('quick-search-read').props.accessibilityState.disabled,
    ).toBe(false)
  })

  it('lee la primera foto y publica lo revisado, sin barrio si no se eligió', async () => {
    createQuickSearchMock.mockResolvedValue({
      projectId: 'proj-1',
      failedUploads: 0,
    })
    const { onCreated } = renderScreen()

    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-read'))

    // El brief aparece con lo leído antes de publicar nada: es una lectura para
    // revisar, no un veredicto. Ver ADR-020.
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-brief')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-submit'))

    // Llega con el estilo detectado: es lo que necesita Explorar para abrir
    // filtrado. Ver MESH-DESIGN-DECISIONS D-010.
    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith('proj-1', 'fine-line'),
    )
    expect(classifyMock).toHaveBeenCalledWith({
      uri: 'file:///a.jpg',
      categorySlug: 'tattoo',
    })
    const call = createQuickSearchMock.mock.calls[0]?.[0]
    expect(call?.styleSlugs).toEqual(['fine-line'])
    expect(call?.locationSlug).toBeUndefined()
    expect(call?.imageUris).toHaveLength(2)
  })

  it('el brief queda con un rasgo por dimensión, no con dos', async () => {
    // "Antebrazo y espalda" no es un tatuaje, son dos búsquedas.
    createQuickSearchMock.mockResolvedValue({
      projectId: 'proj-1',
      failedUploads: 0,
    })
    renderScreen()

    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-read'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-brief')).toBeTruthy(),
    )

    // La IA leyó antebrazo; se toca espalda, que es la misma dimensión.
    expect(
      screen.getByTestId('trait-antebrazo').props['accessibilityState'],
    ).toMatchObject({ selected: true })
    fireEvent.press(screen.getByTestId('trait-espalda'))

    expect(
      screen.getByTestId('trait-antebrazo').props['accessibilityState'],
    ).toMatchObject({ selected: false })
    expect(
      screen.getByTestId('trait-espalda').props['accessibilityState'],
    ).toMatchObject({ selected: true })
  })

  it('dice cuántos rasgos salieron de la foto, sin atribuirse los demás', async () => {
    renderScreen()
    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-read'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-brief')).toBeTruthy(),
    )

    // Uno de estilo más uno de zona: dos.
    expect(
      screen.getByText('Salieron 2 de tu foto. Cambiá lo que no sea así.'),
    ).toBeTruthy()
  })

  it('si no se reconoce nada, igual deja completar el brief a mano', async () => {
    // Antes esto era un callejón: "no reconocimos el estilo" y de vuelta al
    // principio. Una foto borrosa dejaba a alguien sin búsqueda.
    classifyMock.mockResolvedValue({ styleSlug: null, traits: [] })
    renderScreen()

    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-read'))

    await waitFor(() =>
      expect(screen.getByTestId('quick-search-brief')).toBeTruthy(),
    )
    // Y lo dice, en vez de dejar los campos vacíos como si fuera un error.
    expect(
      screen.getByText(
        'De tu foto no pudimos sacar nada con seguridad. Completalo vos.',
      ),
    ).toBeTruthy()
    // Sin estilo elegido no se publica: es lo único que la búsqueda necesita.
    expect(
      screen.getByTestId('quick-search-submit').props['accessibilityState'],
    ).toMatchObject({ disabled: true })
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
    fireEvent.press(screen.getByTestId('quick-search-read'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-brief')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('quick-search-partial')).toBeTruthy(),
    )
    expect(onCreated).not.toHaveBeenCalled()

    fireEvent.press(screen.getByTestId('quick-search-continue'))
    expect(onCreated).toHaveBeenCalledWith('proj-1', 'fine-line')
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
    fireEvent.press(screen.getByTestId('quick-search-read'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-brief')).toBeTruthy(),
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

  it('no hay ninguna grilla de barrios que elegir', async () => {
    // El barrio salía de 48 chips. Ahora sale del GPS: el paso desapareció.
    renderScreen()
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-location-off')).toBeTruthy(),
    )
    expect(screen.queryByTestId('quick-search-location-palermo')).toBeNull()
  })

  it('con ubicación activada manda el barrio que resolvió el GPS', async () => {
    deviceMock.currentDeviceLocation.mockResolvedValue({
      coordinates: { lat: -34.5875, lng: -58.4371 },
      neighborhoodSlug: 'palermo',
    })
    createQuickSearchMock.mockResolvedValue({
      projectId: 'proj-1',
      failedUploads: 0,
    })
    renderScreen()

    await waitFor(() =>
      expect(screen.getByTestId('quick-search-location-on')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-read'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-brief')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-submit'))

    await waitFor(() => expect(createQuickSearchMock).toHaveBeenCalled())
    expect(createQuickSearchMock.mock.calls[0]?.[0]?.locationSlug).toBe(
      'palermo',
    )
  })

  it('si el GPS no reconoce el barrio, busca igual y sin inventarlo', async () => {
    deviceMock.currentDeviceLocation.mockResolvedValue({
      coordinates: { lat: -34.9, lng: -57.95 },
      neighborhoodSlug: null,
    })
    createQuickSearchMock.mockResolvedValue({
      projectId: 'proj-1',
      failedUploads: 0,
    })
    renderScreen()

    await waitFor(() =>
      expect(screen.getByTestId('quick-search-location-on')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-add-photo'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-photo-0')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-read'))
    await waitFor(() =>
      expect(screen.getByTestId('quick-search-brief')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('quick-search-submit'))

    await waitFor(() => expect(createQuickSearchMock).toHaveBeenCalled())
    expect(
      createQuickSearchMock.mock.calls[0]?.[0]?.locationSlug,
    ).toBeUndefined()
  })

  it('cancelar llama a onCancel', () => {
    const { onCancel } = renderScreen()
    fireEvent.press(screen.getByTestId('quick-search-cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
