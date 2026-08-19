import { createQuickSearch } from './createQuickSearch.ts'
import { createProject, attachReference } from '../projects/queries.ts'
import { uploadReference } from '../projects/upload.ts'

jest.mock('../projects/queries.ts', () => ({
  createProject: jest.fn(),
  attachReference: jest.fn(),
}))
jest.mock('../projects/upload.ts', () => ({
  uploadReference: jest.fn(),
}))

const createProjectMock = createProject as jest.MockedFunction<
  typeof createProject
>
const attachReferenceMock = attachReference as jest.MockedFunction<
  typeof attachReference
>
const uploadReferenceMock = uploadReference as jest.MockedFunction<
  typeof uploadReference
>

beforeEach(() => {
  jest.clearAllMocks()
  createProjectMock.mockResolvedValue('proj-1')
})

describe('createQuickSearch', () => {
  it('crea el proyecto con el título y los estilos, y sube cada foto en orden', async () => {
    uploadReferenceMock
      .mockResolvedValueOnce({ mediaId: 'm1', path: 'x/m1/lg.jpg' })
      .mockResolvedValueOnce({ mediaId: 'm2', path: 'x/m2/lg.jpg' })

    const result = await createQuickSearch({
      userId: 'u1',
      title: 'Línea fina + Japonés',
      styleSlugs: ['fine-line', 'japanese'],
      locationSlug: 'palermo',
      imageUris: ['file:///a.jpg', 'file:///b.jpg'],
    })

    expect(createProjectMock).toHaveBeenCalledWith('u1', {
      // Cerrada salvo que se pida. Ver ADR-014: estas fotos las subió la
      // persona para sí misma.
      openToProfessionals: false,
      title: 'Línea fina + Japonés',
      styleSlugs: ['fine-line', 'japanese'],
      locationSlug: 'palermo',
    })
    expect(attachReferenceMock).toHaveBeenNthCalledWith(1, 'proj-1', 'm1', 0)
    expect(attachReferenceMock).toHaveBeenNthCalledWith(2, 'proj-1', 'm2', 1)
    expect(result).toEqual({ projectId: 'proj-1', failedUploads: 0 })
  })

  it('sin barrio no manda locationSlug — nunca se inventa una ubicación', async () => {
    await createQuickSearch({
      userId: 'u1',
      title: 'Blackwork',
      styleSlugs: ['blackwork'],
      imageUris: [],
    })
    expect(createProjectMock).toHaveBeenCalledWith('u1', {
      openToProfessionals: false,
      title: 'Blackwork',
      styleSlugs: ['blackwork'],
    })
  })

  it('una foto que falla se cuenta y no aborta la búsqueda', async () => {
    uploadReferenceMock
      .mockResolvedValueOnce({ mediaId: 'm1', path: 'x/m1/lg.jpg' })
      .mockRejectedValueOnce(new Error('la red se cortó'))

    const result = await createQuickSearch({
      userId: 'u1',
      title: 'Blackwork',
      styleSlugs: ['blackwork'],
      imageUris: ['file:///a.jpg', 'file:///b.jpg'],
    })

    expect(result).toEqual({ projectId: 'proj-1', failedUploads: 1 })
    // La que sí subió se sigue adjuntando.
    expect(attachReferenceMock).toHaveBeenCalledTimes(1)
  })

  it('si falla el adjuntado y no la subida, también se cuenta como fallo de esa foto', async () => {
    uploadReferenceMock.mockResolvedValue({
      mediaId: 'm1',
      path: 'x/m1/lg.jpg',
    })
    attachReferenceMock.mockRejectedValueOnce(new Error('fila duplicada'))

    const result = await createQuickSearch({
      userId: 'u1',
      title: 'Blackwork',
      styleSlugs: ['blackwork'],
      imageUris: ['file:///a.jpg'],
    })

    expect(result.failedUploads).toBe(1)
  })
})
