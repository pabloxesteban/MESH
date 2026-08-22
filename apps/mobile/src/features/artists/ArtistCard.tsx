/**
 * La tarjeta de un artista: un carrusel de su obra, y quién es debajo.
 *
 * Es la pieza de Inicio y la que define el producto nuevo. El orden de lectura
 * es deliberado y es el de MESH entero: **primero el trabajo, después la
 * persona.** Nadie elige un tatuador por su cara.
 *
 * El carrusel es chico a propósito. No es el portafolio —eso está en el
 * perfil— es una muestra: lo suficiente para decidir si querés ver más.
 * Deslizar dentro del carrusel es horizontal, la grilla se recorre en vertical,
 * y los dos gestos conviven porque van en ejes distintos.
 *
 * Lo que la tarjeta **no** muestra: puntajes, encajes, insignias de actividad,
 * ni cuántas personas la vieron. MESH no tiene esos números y no los va a
 * inventar.
 *
 * Tampoco muestra los estilos. Se probaron, y tres etiquetas de colores debajo
 * de cada tarjeta convierten la grilla en una carta de colores que le compite
 * a la obra — que es justamente lo que la tarjeta vino a mostrar. Los estilos
 * viven en el perfil, bajo "Trabaja", donde hay lugar para leerlos.
 */

import { Image } from 'expo-image'
import { memo, useEffect } from 'react'
import {
  ScrollView,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'

import { locationLabel, roundDistanceKm } from '@mesh/domain'

import {
  Avatar,
  Box,
  HAIRLINE,
  MIN_TOUCH_TARGET,
  Pressable,
  Text,
  radius,
  spacing,
  useMotion,
  useTheme,
} from '@/design-system/index.ts'
import { FixtureBadge } from '@/components/FixtureBadge.tsx'
import { ratioOf } from '@/features/transitions/geometry.ts'
import { openArtwork } from '@/features/transitions/openArtwork.ts'
import { useArtworkAnchor } from '@/features/transitions/useArtworkAnchor.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { registerCardLayout } from './cardLayoutRegistry.ts'
import { avatarUrl, mediaUrl, type ArtistCardData } from './queries.ts'
import { useScrollMotion } from './ScrollMotionContext.tsx'
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
  IMAGE_OVERSCALE,
  IMAGE_SCALE_ACTIVE,
  IMAGE_SCALE_ENTER,
} from './scrollReveal.ts'

// `Animated.createAnimatedComponent` a nivel de módulo, no adentro del
// componente: recrearlo en cada render envolvería `Image` de nuevo cada vez,
// igual que `AnimatedPressable` en design-system/primitives/Pressable.tsx.
const AnimatedImage = Animated.createAnimatedComponent(Image)

/** Ancho de cada obra del carrusel. Casi dos enteras entran en una pantalla de 390: el "showcase spread". */
const PIECE_WIDTH = 200

/** Alto por defecto de la caja de la obra (3:4), antes de que `onLayout` mida el real. */
const DEFAULT_PIECE_HEIGHT = PIECE_WIDTH / (3 / 4)

export interface ArtistCardProps {
  artist: ArtistCardData
  /** `null` cuando falta la ubicación de alguna de las dos puntas. */
  distanceKm: number | null
  onPress: () => void
  /** La obra del carrusel que está volviendo a su lugar, si es de esta tarjeta. */
  hiddenPieceId?: string | null
  testID?: string
}

function ArtistCardImpl({
  artist,
  distanceKm,
  onPress,
  hiddenPieceId = null,
  testID,
}: ArtistCardProps) {
  const t = useT()
  const theme = useTheme()
  const { reduceMotion } = useMotion()
  const { height: viewportHeight } = useWindowDimensions()
  const scrollMotion = useScrollMotion()

  // `locationLabel` y no `findLocation(...).neighborhood`: los partidos del
  // conurbano —Quilmes, San Isidro, La Plata— son `kind: 'city'` y tienen
  // `neighborhood: null`, así que leerlo directo daba `null` y la tarjeta
  // anunciaba "no publicó su ubicación" a alguien que sí la publicó. Un tercio
  // del catálogo de prueba vive fuera de CABA, y es exactamente la clase de
  // cosa que la app no puede decir: es falsa.
  const barrio =
    artist.neighborhoodSlug == null
      ? null
      : locationLabel(artist.neighborhoodSlug)

  // El revelado editorial: dónde está esta tarjeta en pantalla, medido una
  // vez por layout (no por frame) y anotado en el registro para que el snap
  // de `ArtistsScreen` la encuentre al terminar el momentum.
  const itemTop = useSharedValue(0)
  const itemHeight = useSharedValue(0)

  useEffect(
    () => registerCardLayout(artist.professionalId, { top: itemTop }),
    [artist.professionalId, itemTop],
  )

  function handleCardLayout(e: LayoutChangeEvent) {
    itemTop.value = e.nativeEvent.layout.y
    itemHeight.value = e.nativeEvent.layout.height
  }

  // 0 = recién entrando, 1 = resuelta. Sin `ScrollMotionProvider` arriba (un
  // test aislado, el playground) o con movimiento reducido, se queda resuelta
  // — el mismo showcase spread estático de siempre, nunca a mitad de camino
  // sin que nada la esté moviendo.
  const progress = useDerivedValue(() => {
    if (reduceMotion || scrollMotion == null) return 1

    const absoluteTop = scrollMotion.listTop.value + itemTop.value
    const cardCenterY =
      absoluteTop + itemHeight.value / 2 - scrollMotion.scrollY.value
    const enterY = ENTER_BAND_RATIO * viewportHeight
    const activeY = ACTIVE_BAND_RATIO * viewportHeight
    const raw = interpolate(
      cardCenterY,
      [enterY, activeY],
      [0, 1],
      Extrapolation.CLAMP,
    )

    // Por encima del umbral de velocidad, directo al estado resuelto: no hay
    // blur real disponible para simular el paso rápido.
    return scrollMotion.speed.value > FAST_SCROLL_THRESHOLD ? 1 : raw
  })

  // La fila de identidad no es el ancla de nada — segura para animar
  // directo, envolviéndola en un `Animated.View` en vez de tocar el
  // `Pressable` del design system.
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
    <View
      onLayout={handleCardLayout}
      style={{
        borderBottomWidth: HAIRLINE,
        borderBottomColor: theme.borderSubtle,
        paddingBottom: spacing.md,
      }}
      testID={testID}
    >
      {/* El carrusel. Cada obra abre el mismo perfil: la muestra es del
          artista, no de una pieza suelta.

          Sin obra no hay carrusel, y se dice. Esta tarjeta no aparece en la
          grilla de Inicio —ahí a quien no subió nada se lo esconde justamente
          porque su tarjeta saldría vacía— pero sí en una búsqueda por nombre,
          donde esconderlo sería contestar mal a quien preguntó por él. La
          alternativa era una fila muda de 20pt: peor, porque no se entiende. */}
      {artist.pieces.length === 0 ? (
        <Box
          paddingX="lg"
          paddingBottom="xs"
          testID={`${testID ?? 'artist'}-no-work`}
        >
          <Text role="body" color="textTertiary">
            {t('artists.card.noWork')}
          </Text>
        </Box>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: spacing.xxs,
            paddingHorizontal: spacing.lg - spacing.xxs,
          }}
          testID={`${testID ?? 'artist'}-carousel`}
        >
          {artist.pieces.map((piece) => (
            <CarouselPiece
              key={piece.id}
              piece={piece}
              artist={artist}
              onPress={onPress}
              hidden={piece.id === hiddenPieceId}
              progress={progress}
              testID={`${testID ?? 'artist'}-piece-${piece.id}`}
            />
          ))}
        </ScrollView>
      )}

      {/* Quién es. Toda la fila es tocable: el nombre solo no es un objetivo
          táctil de ancho confiable (una sola línea, con elipsis), la fila
          entera sí.

          El `Animated.View` de afuera lleva la opacidad/translateY del
          revelado — esta fila no es ancla de nada, así que es segura para
          animar directo. El `Pressable` de adentro queda sin tocar. */}
      <Animated.View style={identityStyle}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('artists.card.open', {
            nombre: artist.displayName,
          })}
          testID={`${testID ?? 'artist'}-identity`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            minHeight: MIN_TOUCH_TARGET,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
          }}
        >
          <Avatar
            source={
              artist.avatarPath == null ? null : avatarUrl(artist.avatarPath)
            }
            size="sm"
            testID={`${testID ?? 'artist'}-avatar`}
          />

          <View style={{ flex: 1 }}>
            <Box direction="row" align="center" gap="xxs">
              <Text role="titleLg" numberOfLines={1}>
                {artist.displayName}
              </Text>
              {artist.isFixture ? <FixtureBadge /> : null}
            </Box>

            <Text role="micro" color="textTertiary" numberOfLines={1}>
              {ubicacion(barrio, distanceKm, t)}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  )
}

/**
 * Una obra del carrusel.
 *
 * Componente propio y no un `map` inline porque cada obra necesita su propia
 * referencia para poder medirse: la transición obra → artista crece desde el
 * rectángulo exacto de la obra que se tocó, y un `useRef` por iteración no se
 * puede escribir adentro de un `map`.
 *
 * El recorte es el que delata la única diferencia con Explorar: acá el
 * carrusel muestra todas las obras en 3:4 para que la fila quede pareja,
 * mientras que el hero del perfil respeta la forma real de la obra. La copia
 * que crece va cambiando de forma en el camino, que es lo correcto — está
 * mostrando la obra entera que el carrusel recortaba.
 *
 * **Regla dura del revelado editorial**: el `Pressable` de acá abajo es el
 * ancla de `useArtworkAnchor` — la transición obra → perfil mide exactamente
 * este rectángulo. Nada animado le toca el `style`, nunca: ni un `transform`
 * directo, ni heredado de un `Animated.View` que lo envuelva por afuera. Todo
 * lo nuevo (el wipe, el scale) vive en vistas **internas**, hijas de este
 * `Pressable`, nunca ancestros. Verificado en
 * `ArtistCard.anchorSafety.test.tsx` — ver ese archivo antes de tocar esto.
 */
export function CarouselPiece({
  piece,
  artist,
  onPress,
  hidden,
  progress,
  testID,
}: {
  piece: ArtistCardData['pieces'][number]
  artist: ArtistCardData
  onPress: () => void
  hidden: boolean
  /** 0 = recién entrando, 1 = resuelta. La calcula `ArtistCardImpl`, una sola vez por tarjeta — todas sus obras comparten el mismo progreso. */
  progress: SharedValue<number>
  testID?: string
}) {
  const t = useT()
  const theme = useTheme()
  const view = useArtworkAnchor('artists', piece.id)

  // La relación de aspecto real de la pieza, no la de la caja que la recorta
  // (esa es fija en 3:4). Sirve para dos cosas independientes: la transición
  // hacia el perfil (abajo) y qué derivado pedirle a `mediaUrl` (ver debajo del
  // return): una pieza apaisada necesita más ancho real para cubrir el alto de
  // la caja sin upscale que una retrato o cuadrada.
  const aspectRatio = ratioOf(piece.width, piece.height)

  // El tamaño real de la caja (3:4, 200pt de ancho fijo), medido por
  // `onLayout` del propio `Pressable` — no calculado a mano, para que
  // `imageFrame` no dependa de que este archivo y el layout real coincidan.
  const boxWidth = useSharedValue(PIECE_WIDTH)
  const boxHeight = useSharedValue(DEFAULT_PIECE_HEIGHT)

  function handleBoxLayout(e: LayoutChangeEvent) {
    boxWidth.value = e.nativeEvent.layout.width
    boxHeight.value = e.nativeEvent.layout.height
  }

  // wipeClip: el borde recto del "pull-through" — sin librería de masking, ya
  // aprobado por producto. Crece de 60% a 100% del alto real de la caja.
  // `interpolate` de Reanimated trabaja con números, no con strings de
  // porcentaje — por eso el rango son las dos proporciones (0.6, 1.0) y el
  // resultado se multiplica por `boxHeight.value` para llegar a píxeles
  // reales, en vez de interpolar `'60%'` a `'100%'` como sugiere la spec en
  // prosa. Mismo resultado visual, expresado de un modo que la librería
  // puede animar.
  const wipeStyle = useAnimatedStyle(() => ({
    height:
      interpolate(
        progress.value,
        [0, 1],
        [CLIP_HEIGHT_ENTER, CLIP_HEIGHT_ACTIVE],
        Extrapolation.CLAMP,
      ) * boxHeight.value,
  }))

  // imageFrame: alto FIJO, real — nunca `'100%'`. Si heredara el alto
  // animado de `wipeClip`, el `scale` de acá abajo se compondría con el
  // clip y el asentamiento se vería mal.
  const frameStyle = useAnimatedStyle(() => ({
    height: boxHeight.value,
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

  // La imagen se renderiza más grande que su caja (`IMAGE_OVERSCALE`),
  // centrada, para que el `scale` mínimo de `frameStyle` nunca deje ver el
  // fondo `surfaceRaised` en los bordes.
  const imageStyle = useAnimatedStyle(() => {
    const width = boxWidth.value * IMAGE_OVERSCALE
    const height = boxHeight.value * IMAGE_OVERSCALE
    return {
      width,
      height,
      left: -(width - boxWidth.value) / 2,
      top: -(height - boxHeight.value) / 2,
    }
  })

  return (
    <Pressable
      ref={view}
      onPress={() => {
        openArtwork({
          view: view.current,
          artwork: {
            portfolioItemId: piece.id,
            professionalSlug: artist.slug,
            mediaPath: piece.mediaPath,
            blurhash: piece.blurhash,
            aspectRatio,
            scope: 'artists',
          },
          open: onPress,
        })
      }}
      onLayout={handleBoxLayout}
      accessibilityRole="button"
      accessibilityLabel={t('artists.card.open', {
        nombre: artist.displayName,
      })}
      testID={testID}
      style={{
        width: PIECE_WIDTH,
        aspectRatio: 3 / 4,
        borderRadius: radius.art,
        overflow: 'hidden',
        backgroundColor: theme.surfaceRaised,
        // El hueco mientras la copia vuelve. Ver features/transitions.
        opacity: hidden ? 0 : 1,
      }}
    >
      {/* Puramente visual — nunca puede interceptar el toque que recibe el
          `Pressable` de arriba. */}
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
        testID={testID != null ? `${testID}-wipe` : undefined}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: 0, right: 0, bottom: 0 },
            frameStyle,
          ]}
          testID={testID != null ? `${testID}-frame` : undefined}
        >
          <AnimatedImage
            // `cover` sobre una caja 3:4 fija a 200pt de ancho, a 3x: 800px de
            // alto a cubrir. El derivado `md` sale a 900px de ancho preservando
            // la proporción original — de sobra para una pieza retrato o
            // cuadrada, pero para una apaisada (ancho/alto > ~1.125) esos
            // 900px de ancho dan menos de 800px de alto y `cover` la escala
            // hacia arriba. `lg` evita ese upscale; pedirlo siempre gastaría
            // bytes de más en el caso común, que es retrato.
            source={mediaUrl(
              piece.mediaPath,
              aspectRatio > 1.125 ? 'lg' : 'md',
            )}
            style={[{ position: 'absolute' }, imageStyle]}
            contentFit="cover"
            {...(piece.blurhash != null
              ? { placeholder: { blurhash: piece.blurhash } }
              : {})}
            transition={200}
            accessible={false}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}

/**
 * La línea de ubicación.
 *
 * Barrio y distancia son dos datos distintos y cualquiera puede faltar. Se
 * arma con lo que hay y **nunca se rellena**: sin barrio no dice "CABA", sin
 * distancia no dice "cerca".
 */
function ubicacion(
  barrio: string | null,
  distanceKm: number | null,
  t: (key: TranslationKey, params?: Record<string, string>) => string,
): string {
  const partes: string[] = []
  if (barrio != null) partes.push(barrio)
  if (distanceKm != null) {
    partes.push(
      t('artists.card.km', { km: String(roundDistanceKm(distanceKm)) }),
    )
  }
  return partes.length > 0 ? partes.join(' · ') : t('artists.card.noLocation')
}

export const ArtistCard = memo(ArtistCardImpl)
