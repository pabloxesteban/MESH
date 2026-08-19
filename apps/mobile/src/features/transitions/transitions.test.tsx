/**
 * La transición obra → artista, enchufada.
 *
 * El test más importante de este archivo es el primero, y existe por un error
 * que se cometió: la primera versión de `openArtwork` navegaba adentro del
 * callback de `measureInWindow`, así que en cualquier entorno donde ese
 * callback no llegue, tocar una obra no hacía **nada**. Lo encontró un test que
 * ya existía, de casualidad. Este lo busca a propósito.
 *
 * La regla que fija: **la navegación nunca depende de la transición.** La
 * animación es un lujo; llegar al perfil no.
 */

import { act, render, screen } from '@testing-library/react-native'
import type { View } from 'react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'

import { GrowingArtwork } from './GrowingArtwork.tsx'
import {
  measureRect,
  openArtwork,
  type ArtworkIdentity,
} from './openArtwork.ts'
import {
  __resetArtworkHandoff,
  claimArtwork,
  offerArtwork,
} from './sharedArtwork.ts'
import { useArtworkEntrance, type ArtworkEntrance } from './useArtworkEntrance.ts'

const OBRA: ArtworkIdentity = {
  portfolioItemId: 'pieza-1',
  professionalSlug: 'a-mano',
  mediaPath: 'a-mano/pieza-1/lg.webp',
  blurhash: null,
  aspectRatio: 0.8,
}

/** Una vista que se puede medir, como en la arquitectura nueva y en web. */
function vistaMedible(rect: {
  x: number
  y: number
  width: number
  height: number
}): View {
  return { getBoundingClientRect: () => rect } as unknown as View
}

beforeEach(() => {
  __resetArtworkHandoff()
})

describe('tocar una obra', () => {
  it('abre el perfil aunque la vista no se pueda medir', () => {
    // El defecto que este test existe para que no vuelva: sin medición, el
    // toque quedaba muerto y la grilla dejaba de llevar a ninguna parte.
    const open = jest.fn()
    openArtwork({ view: null, artwork: OBRA, open })
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('abre el perfil aunque la vista no sepa medirse', () => {
    const open = jest.fn()
    openArtwork({ view: {} as View, artwork: OBRA, open })
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('sin medición no deja un origen inventado', () => {
    openArtwork({ view: null, artwork: OBRA, open: jest.fn() })
    // Nada que reclamar: mejor sin animación que con una que sale de la
    // esquina superior izquierda.
    expect(claimArtwork('a-mano')).toBeNull()
  })

  it('con medición entrega el rectángulo exacto y abre igual', () => {
    const open = jest.fn()
    openArtwork({
      view: vistaMedible({ x: 20, y: 400, width: 175, height: 219 }),
      artwork: OBRA,
      open,
      now: () => 1000,
    })

    expect(open).toHaveBeenCalledTimes(1)
    expect(claimArtwork('a-mano', 1010)?.from).toEqual({
      x: 20,
      y: 400,
      width: 175,
      height: 219,
    })
  })

  it('una vista de tamaño cero no cuenta como medición', () => {
    // Pasa con una tarjeta a medio desmontar. Un rectángulo vacío haría que la
    // obra crezca desde la nada.
    const open = jest.fn()
    openArtwork({
      view: vistaMedible({ x: 0, y: 0, width: 0, height: 0 }),
      artwork: OBRA,
      open,
    })
    expect(open).toHaveBeenCalledTimes(1)
    expect(claimArtwork('a-mano')).toBeNull()
  })

  it('una vista que tira al medirse tampoco impide abrir', () => {
    const rota = {
      getBoundingClientRect: () => {
        throw new Error('desmontada')
      },
    } as unknown as View
    const open = jest.fn()
    openArtwork({ view: rota, artwork: OBRA, open })
    expect(open).toHaveBeenCalledTimes(1)
  })
})

describe('measureRect', () => {
  it('devuelve null cuando no hay nada que medir', () => {
    expect(measureRect(null)).toBeNull()
    expect(measureRect({} as View)).toBeNull()
  })
})

describe('la obra que crece', () => {
  const DESDE = { x: 20, y: 400, width: 175, height: 219 }
  const HASTA = { x: 20, y: 75, width: 350, height: 437 }

  function renderGrowing(reduceMotion: boolean, onArrived = jest.fn()) {
    render(
      <ThemeProvider>
        <MotionProvider forceReduceMotion={reduceMotion}>
          <GrowingArtwork
            from={DESDE}
            to={HASTA}
            source="https://ejemplo.test/obra.webp"
            blurhash={null}
            durationMs={280}
            onArrived={onArrived}
            testID="growing"
          />
        </MotionProvider>
      </ThemeProvider>,
    )
    return onArrived
  }

  it('con movimiento reducido llega de una y avisa enseguida', () => {
    // No es "animar más rápido": es no animar. Quien pidió movimiento reducido
    // pidió eso, y el hero real tiene que aparecer igual.
    const onArrived = renderGrowing(true)
    expect(onArrived).toHaveBeenCalled()
  })

  it('no intercepta toques', () => {
    renderGrowing(false)
    // Un overlay que se come el primer toque de la pantalla nueva se siente
    // como que la app se colgó.
    const copia = screen.getByTestId('growing', { includeHiddenElements: true })
    expect(copia.props.pointerEvents).toBe('none')
  })

  it('no la anuncia un lector de pantalla', () => {
    renderGrowing(false)
    // Es una copia decorativa: el contenido real está debajo, y anunciarla
    // duplicaría la obra en el recorrido. Que haya que pedir explícitamente
    // los elementos ocultos para encontrarla *es* la verificación.
    expect(screen.queryByTestId('growing')).toBeNull()
    expect(
      screen.getByTestId('growing', { includeHiddenElements: true }),
    ).toBeTruthy()
  })
})

/**
 * La máquina de estados de la entrada.
 *
 * Se prueba acá y no contra `ProfileScreen` porque en el entorno de test las
 * animaciones terminan en el mismo tick: la copia "llega" antes de que se
 * pueda mirar, y el estado intermedio —el único que importa— sería
 * inobservable. Que la copia se vea mientras viaja lo verifica el laboratorio
 * del playground, con la mano y a ojo, que es donde eso se puede ver.
 */
describe('la entrada del perfil', () => {
  let ultima: ArtworkEntrance | null = null

  function Sonda({ slug }: { slug: string }) {
    ultima = useArtworkEntrance(slug)
    return null
  }

  function montar(slug = 'a-mano') {
    render(
      <ThemeProvider>
        <MotionProvider forceReduceMotion={false}>
          <Sonda slug={slug} />
        </MotionProvider>
      </ThemeProvider>,
    )
  }

  function llegarTocando(slug = 'a-mano') {
    offerArtwork({
      ...OBRA,
      professionalSlug: slug,
      from: { x: 20, y: 500, width: 175, height: 219 },
      at: Date.now(),
    })
  }

  beforeEach(() => {
    ultima = null
  })

  it('sin pasamanos no hay ni animación ni hero impuesto', () => {
    montar()
    expect(ultima?.growing).toBeNull()
    // Sin obra tocada manda la regla de siempre: la destacada por el artista.
    expect(ultima?.heroPieceId).toBeNull()
  })

  it('con pasamanos arranca creciendo desde donde estaba la obra', () => {
    llegarTocando()
    montar()

    expect(ultima?.growing?.from).toEqual({
      x: 20,
      y: 500,
      width: 175,
      height: 219,
    })
    // Y el destino ya está calculado: no se espera a que baje el perfil.
    expect(ultima?.growing?.to.width).toBeGreaterThan(0)
    expect(ultima?.heroPieceId).toBe('pieza-1')
  })

  it('cuando llega, deja de crecer y el hero real puede aparecer', () => {
    llegarTocando()
    montar()
    expect(ultima?.growing).not.toBeNull()

    act(() => {
      ultima?.onArrived()
    })

    expect(ultima?.growing).toBeNull()
    // La obra tocada sigue mandando como hero: la promesa no vence con la
    // animación.
    expect(ultima?.heroPieceId).toBe('pieza-1')
  })

  it('no anima cuando la obra ya estaba donde va el hero', () => {
    // Pasa al abrir desde un carrusel que ocupa casi todo el ancho: mover ocho
    // píxeles no comunica nada y solo suma espera.
    offerArtwork({
      ...OBRA,
      from: { x: 20, y: 16, width: 710, height: 887 },
      at: Date.now(),
    })
    montar()

    expect(ultima?.growing).toBeNull()
    // Pero la obra tocada sigue siendo el hero.
    expect(ultima?.heroPieceId).toBe('pieza-1')
  })
})
