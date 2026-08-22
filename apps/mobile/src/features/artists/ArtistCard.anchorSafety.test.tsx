/**
 * Test de seguridad del ancla — efecto de foco del carrusel de obra.
 *
 * La spec de `interaction-designer` es explícita: nada animado puede tocar el
 * `Pressable` que `CarouselPiece` le entrega a `useArtworkAnchor` — es el
 * rectángulo exacto que mide la transición obra → perfil. En un dispositivo
 * real esto se confirmaría mirando el gesto de scroll con la mano; acá no hay
 * dispositivo, así que este archivo es el sustituto: automatiza lo que SÍ se
 * puede verificar sin uno. Mismo patrón que el test homónimo del intento
 * anterior (revertido en c4bd77c, recuperado del historial en 174c920 como
 * referencia de estructura) — este archivo no es una copia: el mecanismo que
 * prueba es distinto (`scrollX` + `index` en vez de `progress` por banda de
 * scroll vertical), pero la pregunta de fondo es la misma.
 *
 * Lo que se prueba, en orden:
 *
 * 1. El `Pressable` ancla nunca recibe un `style` con `transform` — en los
 *    tres puntos del rango de interpolación (`distance = -PITCH`, `0`,
 *    `PITCH`, es decir: escala mínima de un lado, centrado, escala mínima del
 *    otro lado). Es una verificación estructural: no depende de qué número
 *    calcule `interpolate` en cada estado (el mock de Reanimated para Jest lo
 *    deja en `undefined` — ver `jest.reanimated.js`), depende de que la clave
 *    `transform` jamás aparezca en el `style` de ESE nodo en particular.
 * 2. `useArtworkAnchor` se llama exactamente una vez por pieza, con el scope
 *    y el id correctos — la prueba de que `CarouselPiece` sigue entregándole
 *    el `ref` del `Pressable` de siempre, sin que ningún componente nuevo
 *    (`Frame`, `Scrim`) se haya interpuesto en esa llamada.
 * 3. Un toque en cualquier punto del rango sigue disparando `onPress`, y las
 *    capas puramente visuales (`Frame`, `Scrim`) llevan `pointerEvents="none"`
 *    — no pueden interceptar nada, en ningún estado.
 *
 * **Limitación honesta, para no simular una cobertura que no existe**: se
 * intentó verificar el punto 2 midiendo de verdad — dándole
 * `getBoundingClientRect` al nodo del `Pressable` vía `createNodeMock` y
 * comprobando que `measureArtwork` devuelve el rectángulo esperado, como hace
 * el resto de la suite de transiciones. No funciona: se confirmó por separado
 * (con un `<View ref={ref} />` desnudo, sin relación con este cambio) que en
 * este entorno de Jest — esta versión de `react-test-renderer` contra los
 * componentes host reales de `react-native`, no contra tipos string a mano —
 * un `ref` de React nunca resuelve a una instancia, `createNodeMock` nunca se
 * llama, y `ref.current` queda en `null` pase lo que pase en el código de
 * producción. Es la misma razón por la que
 * `features/transitions/transitions.test.tsx` nunca renderiza un componente
 * real para probar `useArtworkAnchor`/`measureRect`: construye objetos
 * `{ getBoundingClientRect }` a mano y se los pasa directo a `openArtwork`,
 * sin pasar por render ni por ref. Confirmar que el `ref` real resuelve al
 * nodo geométricamente correcto en Fabric/`react-native-web` — que es
 * exactamente lo que el punto 2 pide — queda fuera del alcance de Jest en
 * este proyecto, con o sin este cambio; es QA manual en dispositivo, igual
 * que ya vale para el resto de la transición obra → perfil. Lo que sí queda
 * cubierto es que el código llama al hook correcto, con los argumentos
 * correctos, una sola vez — la única superficie donde este cambio podría
 * haber introducido una capa de más.
 *
 * Tampoco `fireEvent.press` simula hit-testing físico real: invoca el
 * handler `onPress` del nodo directamente, así que la prueba #3 confirma que
 * el evento está bien cableado y que las capas decorativas están marcadas
 * `pointerEvents="none"`, pero no reproduce un toque físico sobre píxeles
 * superpuestos. Y el mecanismo de escala/atenuación en sí — que `interpolate`
 * devuelva el número correcto en cada punto del rango — no se testea acá
 * tampoco: `interpolate` está mockeado a un no-op en este entorno (ver el
 * comentario del punto 1). Esa verificación es matemática, no de test, y vive
 * como comentario en `carouselMotion.ts`; lo visual se mira en
 * `playground/prototypes/CarouselPeekLab.tsx`, con fotos reales.
 */

import { useSharedValue } from 'react-native-reanimated'
import { fireEvent, render, screen } from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { useArtworkAnchor } from '@/features/transitions/useArtworkAnchor.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { PITCH } from './carouselMotion.ts'
import { CarouselPiece } from './ArtistCard.tsx'
import type { ArtistCardData } from './queries.ts'

jest.mock('./queries.ts', () => ({
  ...jest.requireActual('./queries.ts'),
  mediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))

jest.mock('@/features/transitions/useArtworkAnchor.ts', () => {
  const actual = jest.requireActual(
    '@/features/transitions/useArtworkAnchor.ts',
  )
  return {
    ...actual,
    // Envuelve la implementación real (registro incluido) en un `jest.fn`
    // para poder afirmar con qué se la llamó, sin cambiar su comportamiento.
    useArtworkAnchor: jest.fn(actual.useArtworkAnchor),
  }
})

const ARTIST: ArtistCardData = {
  professionalId: 'pro-uno',
  slug: 'uno',
  displayName: 'Artista Uno',
  isFixture: false,
  avatarPath: null,
  neighborhoodSlug: null,
  studioCoordinates: null,
  pieces: [],
}

const PIECE = {
  id: 'pieza-1',
  mediaPath: 'uno/pieza-1/lg.jpg',
  width: 800,
  height: 1000,
  blurhash: null,
}

const ANCHOR_TEST_ID = 'pieza-1'

/**
 * Monta `CarouselPiece` con `scrollX` fijo en el valor dado, para la pieza en
 * `index=0` (`itemLeft = 0`, así que `distance = -scrollX`). La forma de
 * "setear el shared value a mano" que pide el Paso 3: en este entorno no hay
 * gesto de scroll real que lo mueva (`useAnimatedScrollHandler` es un no-op
 * bajo el mock de Reanimated), así que el valor se fija al crear el shared
 * value, no mutándolo después de montar.
 */
function Wrapper({
  scrollXValue,
  onPress,
}: {
  scrollXValue: number
  onPress: () => void
}) {
  const scrollX = useSharedValue(scrollXValue)
  return (
    <ThemeProvider>
      <MotionProvider>
        <I18nProvider locale="es-AR">
          <CarouselPiece
            piece={PIECE}
            artist={ARTIST}
            onPress={onPress}
            hidden={false}
            index={0}
            scrollX={scrollX}
            testID={ANCHOR_TEST_ID}
          />
        </I18nProvider>
      </MotionProvider>
    </ThemeProvider>
  )
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style
      .filter((s): s is Record<string, unknown> => Boolean(s))
      .reduce((acc, s) => ({ ...acc, ...s }), {})
  }
  return (style ?? {}) as Record<string, unknown>
}

beforeEach(() => {
  jest.mocked(useArtworkAnchor).mockClear()
})

describe('seguridad del ancla — CarouselPiece', () => {
  it.each([-PITCH, 0, PITCH])(
    'el Pressable ancla nunca lleva transform (scrollX=%s)',
    (scrollXValue) => {
      render(<Wrapper scrollXValue={scrollXValue} onPress={jest.fn()} />)

      const anchor = screen.getByTestId(ANCHOR_TEST_ID)
      const style = flattenStyle(anchor.props.style)
      expect(style.transform).toBeUndefined()
    },
  )

  it('useArtworkAnchor se llama una sola vez, con el scope y el id correctos', () => {
    render(<Wrapper scrollXValue={0} onPress={jest.fn()} />)

    expect(useArtworkAnchor).toHaveBeenCalledTimes(1)
    expect(useArtworkAnchor).toHaveBeenCalledWith('artists', PIECE.id)
  })

  it('el Frame y el Scrim nunca pueden interceptar el toque', () => {
    render(<Wrapper scrollXValue={0} onPress={jest.fn()} />)

    expect(
      screen.getByTestId(`${ANCHOR_TEST_ID}-frame`).props.pointerEvents,
    ).toBe('none')
    expect(
      screen.getByTestId(`${ANCHOR_TEST_ID}-scrim`).props.pointerEvents,
    ).toBe('none')
  })

  it('un toque centrado (scrollX=0) sigue abriendo la pieza correcta', () => {
    const onPress = jest.fn()
    render(<Wrapper scrollXValue={0} onPress={onPress} />)

    fireEvent.press(screen.getByTestId(ANCHOR_TEST_ID))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('en cualquier extremo del rango (±PITCH) también dispara onPress', () => {
    for (const scrollXValue of [-PITCH, PITCH]) {
      const onPress = jest.fn()
      const { unmount } = render(
        <Wrapper scrollXValue={scrollXValue} onPress={onPress} />,
      )

      fireEvent.press(screen.getByTestId(ANCHOR_TEST_ID))
      expect(onPress).toHaveBeenCalledTimes(1)
      unmount()
    }
  })
})
