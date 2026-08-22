/**
 * Laboratorio del revelado editorial de Inicio.
 *
 * Reproduce el mecanismo completo que especificó `interaction-designer` para
 * la lista de artistas — tres estados por posición de scroll, wipe rectangular
 * "pull-through", reacción a velocidad, snap suave al terminar el momentum —
 * sobre una lista de juguete, antes de tocar `ArtistCard.tsx` /
 * `ArtistsScreen.tsx` de producción. Es el Paso 1 del orden de trabajo: el
 * sustituto de probar en dispositivo real es el Paso 2 (test de seguridad del
 * ancla, en `ArtistCard.anchorSafety.test.tsx`), y la integración real es el
 * Paso 3, condicionada a que ese test pase limpio.
 *
 * Reutiliza `ScrollMotionContext`, `cardLayoutRegistry` y `scrollReveal.ts` de
 * `features/artists` en vez de reimplementarlos: son la plomería real que
 * después se conecta a `ArtistsScreen.tsx`, y prototiparla dos veces —acá con
 * una versión de juguete y después la de verdad— es exactamente la clase de
 * cosa que se desincroniza sin que nadie lo note. Lo único de juguete es de
 * dónde sale la lista: artistas de fixture, sin red.
 *
 * Qué mirar con la mano: arrastrar despacio y ver el wipe subir desde abajo
 * mientras la tarjeta se acerca al 35% superior de la pantalla; soltar cerca
 * del borde de una tarjeta y ver el snap terminar de alinearla; scrollear
 * rápido y ver que la obra aparece resuelta de una, sin blur simulado.
 */

import { useEffect, useMemo, useRef } from 'react'
import {
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ScrollView,
} from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated'

import {
  Box,
  radius,
  Text,
  useMotion,
  useTheme,
} from '@/design-system/index.ts'
import {
  cardTopEdges,
  registerCardLayout,
} from '@/features/artists/cardLayoutRegistry.ts'
import {
  ACTIVE_BAND_RATIO,
  CLIP_HEIGHT_ACTIVE,
  CLIP_HEIGHT_ENTER,
  ENTER_BAND_RATIO,
  FAST_SCROLL_THRESHOLD,
  IDENTITY_OPACITY_ACTIVE,
  IDENTITY_OPACITY_ENTER,
  IDENTITY_TRANSLATE_Y_ACTIVE,
  IDENTITY_TRANSLATE_Y_ENTER,
  IMAGE_SCALE_ACTIVE,
  IMAGE_SCALE_ENTER,
  SNAP_CAPTURE,
} from '@/features/artists/scrollReveal.ts'
import {
  ScrollMotionProvider,
  useScrollMotion,
  type ScrollMotion,
} from '@/features/artists/ScrollMotionContext.tsx'

/** Ancho/alto de la caja de juguete que hace de obra. Solo de este lab. */
const CARD_WIDTH = 320
const CARD_HEIGHT = 200
const AVATAR_SIZE = 36

interface FixtureArtist {
  readonly id: string
  readonly name: string
  readonly location: string
}

const FIXTURE_ARTISTS: readonly FixtureArtist[] = Array.from(
  { length: 10 },
  (_, i) => ({
    id: `lab-artist-${i + 1}`,
    name: `Artista de prueba ${i + 1}`,
    location: i % 2 === 0 ? 'Palermo' : 'San Telmo',
  }),
)

export function ScrollRevealLab() {
  const theme = useTheme()
  const { reduceMotion } = useMotion()
  const scrollRef = useRef<ScrollView>(null)

  const scrollY = useSharedValue(0)
  const speed = useSharedValue(0)
  const listTop = useSharedValue(0)

  // Memoizado una sola vez: el valor del contexto son los shared values en
  // sí, no números — un objeto nuevo en cada render forzaría un re-render de
  // cada tarjeta por nada.
  const motion = useMemo<ScrollMotion>(
    () => ({ scrollY, speed, listTop }),
    [scrollY, speed, listTop],
  )

  function handleMomentumEnd(finalY: number) {
    if (reduceMotion) return // Snap apagado del todo con movimiento reducido.

    const edges = cardTopEdges(listTop.value)
    let nearestEdge: number | null = null
    let nearestDistance = Infinity
    for (const edge of edges) {
      const distance = Math.abs(finalY - edge)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestEdge = edge
      }
    }

    if (nearestEdge != null && nearestDistance <= SNAP_CAPTURE) {
      scrollRef.current?.scrollTo({ y: nearestEdge, animated: true })
    }
  }

  const scrollHandler = useAnimatedScrollHandler<{
    lastY: number
    lastT: number
  }>({
    onScroll: (event, context) => {
      const y = event.contentOffset.y
      const now = Date.now()
      if (context.lastT > 0) {
        const dt = now - context.lastT
        if (dt > 0) {
          speed.value = Math.abs(((y - context.lastY) / dt) * 1000)
        }
      }
      context.lastY = y
      context.lastT = now
      scrollY.value = y
    },
    onMomentumEnd: (event) => {
      speed.value = 0
      runOnJS(handleMomentumEnd)(event.contentOffset.y)
    },
  })

  return (
    <Box gap="md" padding="md">
      <Text role="body" color="textSecondary">
        Arrastrá despacio y mirá el wipe subir desde abajo de cada tarjeta a
        medida que se acerca al 35% superior. Soltá cerca del borde de una
        tarjeta para ver el snap. Un envión rápido salta directo al estado
        resuelto — sin blur simulado, porque no hay ninguno real disponible.
      </Text>

      {/* Alto fijo, como el área de interacción de SwipePhysicsLab: el
          laboratorio vive dentro del ScrollView de PlaygroundHome, que no le
          da una altura acotada por su cuenta. */}
      <View style={{ height: 480 }}>
        <ScrollMotionProvider value={motion}>
          <Animated.ScrollView
            ref={scrollRef}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            style={{
              flex: 1,
              borderRadius: radius.md,
              backgroundColor: theme.surfaceSunken,
            }}
            testID="lab-scroll-reveal-list"
          >
            <Box
              gap="lg"
              padding="md"
              onLayout={(e) => {
                listTop.value = e.nativeEvent.layout.y
              }}
            >
              {FIXTURE_ARTISTS.map((artist) => (
                <RevealCard key={artist.id} artist={artist} />
              ))}
            </Box>
          </Animated.ScrollView>
        </ScrollMotionProvider>
      </View>
    </Box>
  )
}

function RevealCard({ artist }: { artist: FixtureArtist }) {
  const theme = useTheme()
  const { reduceMotion } = useMotion()
  const { height: viewportHeight } = useWindowDimensions()
  const motion = useScrollMotion()

  const itemTop = useSharedValue(0)
  const itemHeight = useSharedValue(0)

  useEffect(() => {
    return registerCardLayout(artist.id, { top: itemTop })
  }, [artist.id, itemTop])

  function handleLayout(e: LayoutChangeEvent) {
    itemTop.value = e.nativeEvent.layout.y
    itemHeight.value = e.nativeEvent.layout.height
  }

  // `progress`: 0 = recién entrando, 1 = resuelta. Sin contexto (fuera de
  // `ScrollMotionProvider`) o con movimiento reducido, se queda resuelta —
  // nunca a mitad de camino sin que nada la mueva.
  const progress = useDerivedValue(() => {
    if (reduceMotion || motion == null) return 1

    const absoluteTop = motion.listTop.value + itemTop.value
    const cardCenterY = absoluteTop + itemHeight.value / 2 - motion.scrollY.value
    const enterY = ENTER_BAND_RATIO * viewportHeight
    const activeY = ACTIVE_BAND_RATIO * viewportHeight
    const raw = interpolate(
      cardCenterY,
      [enterY, activeY],
      [0, 1],
      Extrapolation.CLAMP,
    )

    return motion.speed.value > FAST_SCROLL_THRESHOLD ? 1 : raw
  })

  const wipeStyle = useAnimatedStyle(() => ({
    height:
      interpolate(
        progress.value,
        [0, 1],
        [CLIP_HEIGHT_ENTER, CLIP_HEIGHT_ACTIVE],
        Extrapolation.CLAMP,
      ) * CARD_HEIGHT,
  }))

  const frameStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [IMAGE_SCALE_ENTER, IMAGE_SCALE_ACTIVE],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }))

  const identityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 1],
      [IDENTITY_OPACITY_ENTER, IDENTITY_OPACITY_ACTIVE],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [IDENTITY_TRANSLATE_Y_ENTER, IDENTITY_TRANSLATE_Y_ACTIVE],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }))

  return (
    <Box gap="xs" onLayout={handleLayout} testID={`lab-card-${artist.id}`}>
      <View
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: radius.art,
          overflow: 'hidden',
          backgroundColor: theme.surfaceRaised,
        }}
      >
        {/* wipeClip: el borde recto del "pull-through". Sin librería de
            masking — el producto ya aprobó esa limitación. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'hidden',
            },
            wipeStyle,
          ]}
        >
          {/* imageFrame: alto fijo, real, NUNCA '100%' — si heredara el alto
              animado del wipe, el scale se compondría con el clip. */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: CARD_HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.accentFill,
              },
              frameStyle,
            ]}
          >
            <Text role="title" tint={theme.accentContrast}>
              {artist.name.slice(-2)}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View style={identityStyle}>
        <Box direction="row" align="center" gap="xs">
          <View
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: radius.full,
              backgroundColor: theme.surfaceSunken,
            }}
          />
          <Box>
            <Text role="titleLg">{artist.name}</Text>
            <Text role="micro" color="textTertiary">
              {artist.location}
            </Text>
          </Box>
        </Box>
      </Animated.View>
    </Box>
  )
}
