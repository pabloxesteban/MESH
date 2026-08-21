/**
 * `useEditLocationStore`: el paso de "qué barrio se eligió" desde la ruta de
 * ubicación de vuelta al header de Perfil en edición.
 *
 * Chico a propósito — es el store completo. Lo único que vale la pena fijar:
 * arranca vacío, guarda lo que se le pone (incluido explícitamente "sin
 * ubicación"), y es el mismo store para cualquiera que lo lea.
 */

import { useEditLocationStore } from './editLocationStore.ts'

function reset() {
  useEditLocationStore.setState({ pending: null })
}

beforeEach(reset)

it('arranca sin nada pendiente', () => {
  expect(useEditLocationStore.getState().pending).toBeNull()
})

it('guarda un barrio elegido', () => {
  useEditLocationStore.getState().setPending({ locationId: 'loc-1', slug: 'palermo' })
  expect(useEditLocationStore.getState().pending).toEqual({
    locationId: 'loc-1',
    slug: 'palermo',
  })
})

it('"sin ubicación" es un valor explícito, distinto de no haber elegido nada', () => {
  useEditLocationStore.getState().setPending({ locationId: null, slug: null })
  // No es lo mismo que el estado inicial: acá SÍ se eligió, y lo elegido fue
  // "ninguna". `AccountScreen` distingue esto con `!== undefined`.
  expect(useEditLocationStore.getState().pending).not.toBeNull()
  expect(useEditLocationStore.getState().pending).toEqual({ locationId: null, slug: null })
})

it('se limpia después de leerse, como documenta el archivo', () => {
  useEditLocationStore.getState().setPending({ locationId: 'loc-1', slug: 'palermo' })
  useEditLocationStore.getState().setPending(null)
  expect(useEditLocationStore.getState().pending).toBeNull()
})

it('es un único store compartido: dos lecturas ven la misma escritura', () => {
  useEditLocationStore.getState().setPending({ locationId: 'loc-2', slug: 'caballito' })
  const otraLectura = useEditLocationStore.getState()
  expect(otraLectura.pending).toEqual({ locationId: 'loc-2', slug: 'caballito' })
})
