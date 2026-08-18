import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { ProjectFormScreen } from './ProjectFormScreen.tsx'
import { uploadReference, UploadError } from './upload.ts'

const mockUpload = jest.fn()
const mockRemove = jest.fn()
const mockInsert = jest.fn()

jest.mock('../../data/supabase.ts', () => ({
  get supabase() {
    return {
      storage: {
        from: () => ({ upload: mockUpload, remove: mockRemove }),
      },
      from: () => ({
        insert: () => ({ select: () => ({ single: mockInsert }) }),
      }),
    }
  },
}))

jest.mock('expo-crypto', () => ({
  randomUUID: () => '11111111-2222-3333-4444-555555555555',
}))

const USER = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

function blob(size: number): Blob {
  return { size, type: 'image/jpeg' } as unknown as Blob
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUpload.mockResolvedValue({ error: null })
  mockRemove.mockResolvedValue({ error: null })
  mockInsert.mockResolvedValue({ data: { id: 'media-1' }, error: null })
})

describe('uploadReference', () => {
  const deps = {
    manipulate: jest.fn().mockResolvedValue('file:///limpia.jpg'),
    readAsBlob: jest.fn().mockResolvedValue(blob(400_000)),
  }

  it('recodifica ANTES de subir: es la limpieza de EXIF, no una optimización', async () => {
    // Una foto de referencia sacada en casa lleva las coordenadas de esa casa.
    await uploadReference(USER, 'file:///original.heic', deps)
    expect(deps.manipulate).toHaveBeenCalledWith('file:///original.heic')
    expect(deps.readAsBlob).toHaveBeenCalledWith('file:///limpia.jpg')
    expect(deps.manipulate.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpload.mock.invocationCallOrder[0] as number,
    )
  })

  it('sube siempre como JPEG con content-type explícito', async () => {
    // Nunca inferido de la extensión. Un HEIC de iPhone entra y sale JPEG.
    await uploadReference(USER, 'file:///x.heic', deps)
    const [, , options] = mockUpload.mock.calls[0] ?? []
    expect(options.contentType).toBe('image/jpeg')
  })

  it('la ruta arranca con el id de usuario y no con el nombre del archivo', async () => {
    // Es el predicado de la política de storage. Sin esto, un nombre con `../`
    // sería una ruta.
    const result = await uploadReference(USER, 'file:///../../etc/passwd', deps)
    expect(result.path.startsWith(`${USER}/`)).toBe(true)
    expect(result.path).not.toContain('passwd')
    expect(result.path).not.toContain('..')
  })

  it('valida el tamaño del archivo YA recodificado', async () => {
    // El que cuenta es el que se va a subir, no el original.
    const grande = {
      manipulate: jest.fn().mockResolvedValue('file:///limpia.jpg'),
      readAsBlob: jest.fn().mockResolvedValue(blob(20 * 1024 * 1024)),
    }
    await expect(
      uploadReference(USER, 'file:///x.jpg', grande),
    ).rejects.toBeInstanceOf(UploadError)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('borra el objeto si la fila no se pudo escribir', async () => {
    // Un objeto sin fila cuenta contra la cuota de la persona sin que ella
    // pueda verlo ni borrarlo.
    mockInsert.mockResolvedValue({ data: null, error: { message: 'rls' } })
    await expect(
      uploadReference(USER, 'file:///x.jpg', deps),
    ).rejects.toBeInstanceOf(UploadError)
    expect(mockRemove).toHaveBeenCalled()
  })
})

describe('ProjectFormScreen', () => {
  function render() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <QueryClientProvider client={client}>
        <I18nProvider locale="es-AR">
          <ProjectFormScreen onSubmit={onSubmit} onCancel={jest.fn()} />
        </I18nProvider>
      </QueryClientProvider>,
    )
    return { onSubmit }
  }

  it('solo exige el título', async () => {
    const { onSubmit } = render()
    expect(
      screen.getByTestId('project-submit').props.accessibilityState.disabled,
    ).toBe(true)

    fireEvent.changeText(screen.getByTestId('project-title'), 'Rama de olivo')
    fireEvent.press(screen.getByTestId('project-submit'))
    // Se espera a que el guardado termine: el botón vuelve de `loading` a
    // habilitado, y esa transición es un cambio de estado que hay que dejar
    // asentar.
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    await waitFor(() =>
      expect(
        screen.getByTestId('project-submit').props.accessibilityState.busy,
      ).toBe(false),
    )
  })

  it('no manda un presupuesto a medias', async () => {
    // La base lo exige con un CHECK, y medio presupuesto no es información.
    const { onSubmit } = render()
    fireEvent.changeText(screen.getByTestId('project-title'), 'Rama')
    fireEvent.changeText(screen.getByTestId('project-budget-min'), '60000')
    fireEvent.press(screen.getByTestId('project-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0].budget).toBeUndefined()
  })

  it('manda el presupuesto en centavos cuando está completo', async () => {
    const { onSubmit } = render()
    fireEvent.changeText(screen.getByTestId('project-title'), 'Rama')
    fireEvent.changeText(screen.getByTestId('project-budget-min'), '60000')
    fireEvent.changeText(screen.getByTestId('project-budget-max'), '90000')
    fireEvent.press(screen.getByTestId('project-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0].budget).toEqual({
      minCents: 6_000_000,
      maxCents: 9_000_000,
    })
  })

  it('deja deseleccionar la urgencia: "no sé" es una respuesta válida', async () => {
    const { onSubmit } = render()
    fireEvent.changeText(screen.getByTestId('project-title'), 'Rama')
    fireEvent.press(screen.getByTestId('project-timing-asap'))
    fireEvent.press(screen.getByTestId('project-timing-asap'))
    fireEvent.press(screen.getByTestId('project-submit'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0].timing).toBeUndefined()
  })

  it('avisa que a las referencias se les saca la ubicación', () => {
    render()
    expect(
      screen.getByText(/les sacamos la información de ubicación/i),
    ).toBeTruthy()
  })

  it('no infiere nada: lo que no se escribe no viaja', async () => {
    const { onSubmit } = render()
    fireEvent.changeText(screen.getByTestId('project-title'), 'Rama de olivo')
    fireEvent.press(screen.getByTestId('project-submit'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())

    const draft = onSubmit.mock.calls[0]?.[0]
    expect(draft.styleSlugs).toEqual([])
    expect(draft.budget).toBeUndefined()
    expect(draft.timing).toBeUndefined()
  })
})
