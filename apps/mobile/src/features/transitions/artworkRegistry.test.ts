/**
 * El registro de obras visibles.
 *
 * Lo que decide si la vuelta se ve o no se ve. Cada caso de acá corresponde a
 * una forma concreta de que la obra encoja hacia un lugar equivocado — y todas
 * se ven igual de mal: el ojo sigue la obra hasta la nada.
 */

import {
  __resetArtworkRegistry,
  measureArtwork,
  registerArtwork,
} from './artworkRegistry.ts'
import type { Rect } from './geometry.ts'

const VENTANA = { width: 390, height: 844 }
const VISIBLE: Rect = { x: 20, y: 300, width: 175, height: 219 }

beforeEach(() => {
  __resetArtworkRegistry()
})

describe('el registro de obras', () => {
  it('encuentra una obra anotada', () => {
    registerArtwork('explore', 'pieza-1', () => VISIBLE)
    expect(measureArtwork('explore', 'pieza-1', VENTANA)).toEqual(VISIBLE)
  })

  it('no encuentra una obra que se desmontó', () => {
    // Es el caso de la grilla scrolleada lejos: la tarjeta ya no existe.
    const borrar = registerArtwork('explore', 'pieza-1', () => VISIBLE)
    borrar()
    expect(measureArtwork('explore', 'pieza-1', VENTANA)).toBeNull()
  })

  it('las superficies no se pisan', () => {
    // Las pestañas quedan montadas todas a la vez, así que la misma obra puede
    // estar en Explorar y en el carrusel de Inicio. Sin separar, la vuelta a
    // una podría animar la tarjeta de la otra, que nadie está mirando.
    registerArtwork('explore', 'pieza-1', () => VISIBLE)
    expect(measureArtwork('artists', 'pieza-1', VENTANA)).toBeNull()
  })

  it('borrar una entrada vieja no borra la nueva', () => {
    // Pasa cuando una tarjeta se remonta: el efecto viejo limpia después de que
    // el nuevo registró. Sin el candado, la obra quedaría sin registrar.
    const borrarVieja = registerArtwork('explore', 'pieza-1', () => VISIBLE)
    registerArtwork('explore', 'pieza-1', () => ({ ...VISIBLE, y: 500 }))
    borrarVieja()
    expect(measureArtwork('explore', 'pieza-1', VENTANA)?.y).toBe(500)
  })

  it('una tarjeta scrolleada fuera de la ventana no cuenta', () => {
    // Sigue montada y sigue midiendo bien; simplemente no se ve. Animar hacia
    // ahí es peor que no animar.
    registerArtwork('explore', 'arriba', () => ({
      ...VISIBLE,
      y: -400,
    }))
    registerArtwork('explore', 'abajo', () => ({ ...VISIBLE, y: 2000 }))

    expect(measureArtwork('explore', 'arriba', VENTANA)).toBeNull()
    expect(measureArtwork('explore', 'abajo', VENTANA)).toBeNull()
  })

  it('una tarjeta a medias en pantalla sí cuenta', () => {
    // Entrando por el borde de abajo todavía se la ve, y la obra que encoge
    // hacia ella se sigue con la vista.
    registerArtwork('explore', 'a-medias', () => ({
      ...VISIBLE,
      y: VENTANA.height - 40,
    }))
    expect(measureArtwork('explore', 'a-medias', VENTANA)).not.toBeNull()
  })

  it('una medición que no sirve se descarta', () => {
    registerArtwork('explore', 'rota', () => null)
    registerArtwork('explore', 'vacia', () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    }))
    expect(measureArtwork('explore', 'rota', VENTANA)).toBeNull()
    expect(measureArtwork('explore', 'vacia', VENTANA)).toBeNull()
  })
})
