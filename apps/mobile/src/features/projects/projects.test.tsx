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
