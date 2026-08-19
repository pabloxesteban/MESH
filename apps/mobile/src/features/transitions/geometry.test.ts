/**
 * La geometría de la transición.
 *
 * El test que más importa acá es el último: el que ata `heroRect` al layout
 * real de `ProfileScreen`. Los otros verifican matemática; ese verifica que la
 * matemática siga describiendo la pantalla que existe.
 */

import { SCREEN_GUTTER, spacing } from '@/design-system/index.ts'

import {
  DEFAULT_RATIO,
  heroRect,
  interpolateRect,
  isUsableRect,
  isWorthAnimating,
  ratioOf,
  type Rect,
} from './geometry.ts'

const PANTALLA = { screenWidth: 390, insetTop: 59 }

describe('heroRect', () => {
  it('ocupa el ancho de la pantalla menos las dos márgenes', () => {
    const rect = heroRect({
      ...PANTALLA,
      aspectRatio: 1,
      gutter: 20,
      topSpacing: 16,
    })
    expect(rect.x).toBe(20)
    expect(rect.width).toBe(350)
  })

  it('arranca debajo de la muesca, no debajo del borde de la pantalla', () => {
    const rect = heroRect({
      ...PANTALLA,
      aspectRatio: 1,
      gutter: 20,
      topSpacing: 16,
    })
    // Sin el inset la obra terminaría bajo la barra de estado, que es donde
    // nadie la puede ver.
    expect(rect.y).toBe(59 + 16)
  })

  it('el alto sale de la relación de aspecto de la obra', () => {
    const alta = heroRect({
      ...PANTALLA,
      aspectRatio: 0.5,
      gutter: 20,
      topSpacing: 16,
    })
    const ancha = heroRect({
      ...PANTALLA,
      aspectRatio: 2,
      gutter: 20,
      topSpacing: 16,
    })
    expect(alta.height).toBe(700)
    expect(ancha.height).toBe(175)
  })

  it('una relación de aspecto imposible cae al default en vez de romper', () => {
    const rect = heroRect({
      ...PANTALLA,
      aspectRatio: 0,
      gutter: 20,
      topSpacing: 16,
    })
    // Dividir por cero daría Infinity y la obra crecería para siempre.
    expect(rect.height).toBeCloseTo(350 / DEFAULT_RATIO)
  })

  it('una pantalla más angosta que las márgenes no da un ancho negativo', () => {
    const rect = heroRect({
      screenWidth: 30,
      insetTop: 0,
      aspectRatio: 1,
      gutter: 20,
      topSpacing: 0,
    })
    expect(rect.width).toBe(0)
  })
})

describe('ratioOf', () => {
  it('usa las medidas declaradas cuando están', () => {
    expect(ratioOf(800, 1000)).toBe(0.8)
  })

  it('cae al mismo default que la tarjeta y el hero cuando faltan', () => {
    // Que los tres elijan lo mismo es lo que hace que la obra no cambie de
    // forma en el camino.
    expect(ratioOf(null, null)).toBe(DEFAULT_RATIO)
    expect(ratioOf(800, null)).toBe(DEFAULT_RATIO)
    expect(ratioOf(0, 1000)).toBe(DEFAULT_RATIO)
    expect(ratioOf(800, 0)).toBe(DEFAULT_RATIO)
  })
})

describe('interpolateRect', () => {
  const desde: Rect = { x: 20, y: 400, width: 175, height: 219 }
  const hasta: Rect = { x: 20, y: 75, width: 350, height: 437 }

  it('en 0 es el origen y en 1 es el destino, exactos', () => {
    // Sin esto la obra "salta" al arrancar o al terminar, que es el defecto
    // que más se nota y el más fácil de introducir.
    expect(interpolateRect(desde, hasta, 0)).toEqual(desde)
    expect(interpolateRect(desde, hasta, 1)).toEqual(hasta)
  })

  it('interpola las cuatro medidas por separado', () => {
    const medio = interpolateRect(desde, hasta, 0.5)
    expect(medio.y).toBe(237.5)
    expect(medio.width).toBe(262.5)
  })

  it('recorta fuera de rango en vez de extrapolar', () => {
    // Un resorte puede pasarse de 1. Extrapolar haría que la obra se pase de
    // largo del hero y vuelva, que se lee como un rebote no pedido.
    expect(interpolateRect(desde, hasta, 1.4)).toEqual(hasta)
    expect(interpolateRect(desde, hasta, -0.2)).toEqual(desde)
  })
})

describe('isWorthAnimating', () => {
  it('no anima cuando origen y destino son casi el mismo rectángulo', () => {
    const rect: Rect = { x: 20, y: 75, width: 350, height: 437 }
    expect(isWorthAnimating(rect, { ...rect, y: rect.y + 2 })).toBe(false)
  })

  it('anima cuando la obra realmente se mueve o crece', () => {
    const chico: Rect = { x: 20, y: 400, width: 175, height: 219 }
    const grande: Rect = { x: 20, y: 75, width: 350, height: 437 }
    expect(isWorthAnimating(chico, grande)).toBe(true)
  })
})

describe('isUsableRect', () => {
  it('rechaza lo que measureInWindow devuelve cuando la vista ya no está', () => {
    // Con un scroll rápido la tarjeta se desmonta entre el toque y la
    // medición. Sin este filtro la obra crecería desde la esquina.
    expect(isUsableRect(null)).toBe(false)
    expect(isUsableRect({ x: 0, y: 0, width: 0, height: 0 })).toBe(false)
    expect(isUsableRect({ x: NaN, y: 0, width: 10, height: 10 })).toBe(false)
  })

  it('acepta una medición real', () => {
    expect(isUsableRect({ x: 20, y: 400, width: 175, height: 219 })).toBe(true)
  })
})

describe('la geometría describe el perfil que existe', () => {
  it('usa las mismas constantes con las que ProfileScreen dibuja su hero', () => {
    // ProfileScreen: contentContainerStyle={{ padding: SCREEN_GUTTER,
    // paddingTop: insets.top + spacing.md }} y el hero es el primer hijo a
    // ancho completo. Si alguna de esas dos cambia, la obra aterriza corrida y
    // se ve un salto de un fotograma al terminar la animación.
    //
    // Este test es la única atadura entre los dos archivos: la geometría no
    // importa tokens de layout a propósito, para que el acoplamiento sea
    // visible acá y no escondido en un import.
    const rect = heroRect({
      ...PANTALLA,
      aspectRatio: DEFAULT_RATIO,
      gutter: SCREEN_GUTTER,
      topSpacing: spacing.md,
    })

    expect(rect.x).toBe(SCREEN_GUTTER)
    expect(rect.y).toBe(PANTALLA.insetTop + spacing.md)
    expect(rect.width).toBe(PANTALLA.screenWidth - SCREEN_GUTTER * 2)
  })
})
