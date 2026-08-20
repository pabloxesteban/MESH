/**
 * El corazón.
 *
 * Dos cosas se testean acá y las dos son invisibles en una captura:
 *
 * 1. **Que se pinte antes que la red.** Esperar la respuesta para llenar un
 *    corazón hace que el gesto más liviano de la app se sienta roto.
 * 2. **Que vuelva atrás si la escritura falla.** Un corazón lleno que no se
 *    guardó promete algo que no pasó — y lo peor es que la promesa se descubre
 *    recién al volver otro día y no encontrar la obra.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native'

import { useSaved } from './useSaved.ts'
import { fetchSavedIds, savePiece, unsavePiece } from './queries.ts'

jest.mock('./queries.ts', () => ({
  fetchSavedIds: jest.fn(),
  savePiece: jest.fn(),
  unsavePiece: jest.fn(),
}))

const leer = fetchSavedIds as jest.Mock
const guardar = savePiece as jest.Mock
const desguardar = unsavePiece as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  leer.mockResolvedValue(new Set<string>())
  guardar.mockResolvedValue(undefined)
  desguardar.mockResolvedValue(undefined)
})

async function montar(userId: string | null = 'u1') {
  const vista = renderHook(() => useSaved(userId))
  await waitFor(() => expect(vista.result.current.isLoading).toBe(false))
  return vista
}

describe('guardar', () => {
  it('el corazón se llena sin esperar a la red', async () => {
    // La promesa se deja colgada a propósito: si el estado dependiera de que
    // resuelva, acá el corazón seguiría vacío.
    guardar.mockReturnValue(new Promise(() => undefined))
    const { result } = await montar()

    act(() => result.current.toggle('obra-1'))

    expect(result.current.isSaved('obra-1')).toBe(true)
  })

  it('lo ya guardado aparece guardado', async () => {
    leer.mockResolvedValue(new Set(['obra-1']))
    const { result } = await montar()
    expect(result.current.isSaved('obra-1')).toBe(true)
  })

  it('tocar de nuevo desguarda', async () => {
    leer.mockResolvedValue(new Set(['obra-1']))
    const { result } = await montar()

    act(() => result.current.toggle('obra-1'))

    expect(result.current.isSaved('obra-1')).toBe(false)
    expect(desguardar).toHaveBeenCalledWith('obra-1')
    expect(guardar).not.toHaveBeenCalled()
  })

  it('sin sesión no guarda nada ni sale a la red', async () => {
    const { result } = await montar(null)
    act(() => result.current.toggle('obra-1'))

    expect(result.current.isSaved('obra-1')).toBe(false)
    expect(guardar).not.toHaveBeenCalled()
  })
})

describe('cuando la escritura falla', () => {
  it('el corazón vuelve a vacío', async () => {
    // Sin esto queda lleno prometiendo algo que no se guardó, y la mentira se
    // descubre al volver otro día y no encontrar la obra.
    guardar.mockRejectedValue(new Error('sin red'))
    const { result } = await montar()

    act(() => result.current.toggle('obra-1'))
    expect(result.current.isSaved('obra-1')).toBe(true)

    await waitFor(() => expect(result.current.isSaved('obra-1')).toBe(false))
  })

  it('desguardar que falla deja la obra guardada', async () => {
    leer.mockResolvedValue(new Set(['obra-1']))
    desguardar.mockRejectedValue(new Error('sin red'))
    const { result } = await montar()

    act(() => result.current.toggle('obra-1'))
    await waitFor(() => expect(result.current.isSaved('obra-1')).toBe(true))
  })

  it('que falle leer no rompe la pantalla: los corazones quedan vacíos', async () => {
    leer.mockRejectedValue(new Error('sin red'))
    const { result } = await montar()

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isSaved('obra-1')).toBe(false)
  })
})
