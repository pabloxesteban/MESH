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
 * Mientras se desliza, la pieza más cerca del centro queda a tamaño real y las
 * vecinas se achican y atenúan levemente — foco, no un carrusel de tarjetas
 * apagadas — con snap nativo al soltar. Ver `carouselMotion.ts` para los
 * números y la cuenta de cobertura, y el comentario de `CarouselPiece` para la
 * regla dura sobre el ancla que ese efecto no puede tocar.
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
import { memo } from 'react'
import { View, type ViewStyle } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
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

import {
  DIM_PEEK,
  IMAGE_OVERSCALE_PEEK,
  PIECE_WIDTH,
  PITCH,
  SCALE_PEEK,
} from './carouselMotion.ts'
import { avatarUrl, mediaUrl, type ArtistCardData } from './queries.ts'

/**
 * Geometría compartida por la imagen y el velo de atenuación, adentro del
 * `Frame`.
 *
 * **Deliberadamente el mismo objeto para las dos.** El punto que la spec
 * marcó como fácil de perder: si el `Scrim` se quedara al 100% del `Frame`
 * mientras la imagen está al `IMAGE_OVERSCALE_PEEK` (112%), al encogerse con
 * el `scale` mínimo quedaría un anillo de imagen sin atenuar en el borde —
 * la misma clase de bug de cobertura que se shippeó y se revirtió en el
 * intento anterior (174c920 → c4bd77c), solo que ahí era una franja y acá
 * sería un anillo. Import de un único objeto en vez de dos literales
 * iguales: si algún día cambia, cambia una sola vez, para los dos.
 */
// Sin anotar como `ViewStyle`: este objeto viaja tanto a un `Animated.View`
// (Scrim) como a la `Image` de expo-image, cuyo `ImageStyle` no acepta todo
// lo que `ViewStyle` acepta (p. ej. `overflow: 'scroll'`). Dejando que
// TypeScript infiera el tipo literal, la forma real —solo posición y
// tamaño— es estructuralmente válida para las dos.
const OVERSCALE_FRAME_STYLE = {
  position: 'absolute',
  left: `${-(IMAGE_OVERSCALE_PEEK - 1) * 50}%`,
  top: `${-(IMAGE_OVERSCALE_PEEK - 1) * 50}%`,
  width: `${IMAGE_OVERSCALE_PEEK * 100}%`,
  height: `${IMAGE_OVERSCALE_PEEK * 100}%`,
} as const

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

  // Posición horizontal del carrusel, en el hilo de UI. Cada `CarouselPiece`
  // la lee para calcular su propia distancia al centro — un solo shared
  // value por tarjeta, no uno por pieza, porque todas comparten el mismo
  // scroll.
  const scrollX = useSharedValue(0)
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

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

  return (
    <View
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
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          // Snap nativo, no reinventado a mano: `PITCH` es el mismo número
          // que cada `CarouselPiece` usa para su posición de reposo, así que
          // el punto donde el scroll frena coincide exactamente con el
          // centro que asume la interpolación de escala/atenuación.
          snapToInterval={PITCH}
          decelerationRate="fast"
          disableIntervalMomentum
          snapToAlignment="start"
          contentContainerStyle={{
            gap: spacing.xxs,
            paddingHorizontal: spacing.lg - spacing.xxs,
          }}
          testID={`${testID ?? 'artist'}-carousel`}
        >
          {artist.pieces.map((piece, index) => (
            <CarouselPiece
              key={piece.id}
              piece={piece}
              artist={artist}
              onPress={onPress}
              hidden={piece.id === hiddenPieceId}
              index={index}
              scrollX={scrollX}
              testID={
                testID != null ? `${testID}-piece-${piece.id}` : undefined
              }
            />
          ))}
        </Animated.ScrollView>
      )}

      {/* Quién es. Toda la fila es tocable: el nombre solo no es un objetivo
          táctil de ancho confiable (una sola línea, con elipsis), la fila
          entera sí. */}
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
 * **Regla dura del efecto de foco**: el `Pressable` de acá abajo es el ancla
 * de `useArtworkAnchor` — la transición obra → perfil mide exactamente este
 * rectángulo. Nada animado le toca el `style`, nunca: ni un `transform`
 * directo, ni heredado de un `Animated.View` que lo envuelva por afuera. Todo
 * lo nuevo (`Frame`, `Scrim`) vive en vistas **internas**, hijas de este
 * `Pressable`, nunca ancestros, y con `pointerEvents="none"` — no pueden
 * interceptar el toque. Verificado en `ArtistCard.anchorSafety.test.tsx`.
 *
 * La posición de reposo (`itemLeft`) es una cuenta de JS puro, no algo medido
 * por `onLayout`: la caja es 200×267 fija siempre, así que `index * PITCH` ya
 * la conoce sin esperar al primer layout. Ver `carouselMotion.ts`.
 */
export function CarouselPiece({
  piece,
  artist,
  onPress,
  hidden,
  index,
  scrollX,
  testID,
}: {
  piece: ArtistCardData['pieces'][number]
  artist: ArtistCardData
  onPress: () => void
  hidden: boolean
  /** Posición dentro del carrusel de esta tarjeta — determina `itemLeft`. */
  index: number
  /** Offset horizontal del scroll del carrusel, compartido por todas sus piezas. */
  scrollX: SharedValue<number>
  testID?: string | undefined
}) {
  const t = useT()
  const theme = useTheme()
  const { reduceMotion } = useMotion()
  const view = useArtworkAnchor('artists', piece.id)

  // La relación de aspecto real de la pieza, no la de la caja que la recorta
  // (esa es fija en 3:4). Sirve para dos cosas independientes: la transición
  // hacia el perfil (abajo) y qué derivado pedirle a `mediaUrl` (ver debajo del
  // return): una pieza apaisada necesita más ancho real para cubrir el alto de
  // la caja sin upscale que una retrato o cuadrada.
  const aspectRatio = ratioOf(piece.width, piece.height)

  // Posición de reposo de esta pieza contra el origen del contenido del
  // scroll. JS puro, calculado una vez por pieza — no un shared value, no
  // hace falta que corra en el hilo de UI porque no cambia mientras la
  // tarjeta está montada.
  const itemLeft = index * PITCH

  // `Frame`: el `scale` del efecto de foco. Con movimiento reducido, fijo en
  // 1 — el showcase spread estático de siempre. El snap (`snapToInterval` en
  // el `ScrollView` del padre) sigue activo igual: es física de scroll
  // nativa, no una animación, mismo criterio que `SwipeCard` con el arrastre.
  const frameStyle = useAnimatedStyle<ViewStyle>(() => {
    if (reduceMotion) return { transform: [{ scale: 1 }] }

    const distance = itemLeft - scrollX.value
    const scale = interpolate(
      distance,
      [-PITCH, 0, PITCH],
      [SCALE_PEEK, 1, SCALE_PEEK],
      Extrapolation.CLAMP,
    )
    return { transform: [{ scale }] }
  })

  // `Scrim`: la atenuación del efecto de foco, misma `distance` que el
  // `scale` de arriba — los dos leen el mismo punto del rango a la vez, así
  // que nunca se desincronizan entre sí.
  const scrimStyle = useAnimatedStyle<ViewStyle>(() => {
    if (reduceMotion) return { opacity: 0 }

    const distance = itemLeft - scrollX.value
    const dim = interpolate(
      distance,
      [-PITCH, 0, PITCH],
      [DIM_PEEK, 0, DIM_PEEK],
      Extrapolation.CLAMP,
    )
    return { opacity: dim }
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
        style={[{ width: '100%', height: '100%' }, frameStyle]}
        testID={testID != null ? `${testID}-frame` : undefined}
      >
        <Image
          // `cover` sobre una caja 3:4 fija a 200pt de ancho, a 3x: 800px de
          // alto a cubrir. El derivado `md` sale a 900px de ancho preservando la
          // proporción original — de sobra para una pieza retrato o cuadrada,
          // pero para una apaisada (ancho/alto > ~1.125) esos 900px de ancho dan
          // menos de 800px de alto y `cover` la escala hacia arriba. `lg` evita
          // ese upscale; pedirlo siempre gastaría bytes de más en el caso común,
          // que es retrato.
          source={mediaUrl(piece.mediaPath, aspectRatio > 1.125 ? 'lg' : 'md')}
          // Sobredimensionada y centrada (`OVERSCALE_FRAME_STYLE`), SIN
          // transform ni opacity propios — toda la animación vive en `Frame`
          // y `Scrim`, esta imagen solo cubre.
          style={OVERSCALE_FRAME_STYLE}
          contentFit="cover"
          {...(piece.blurhash != null
            ? { placeholder: { blurhash: piece.blurhash } }
            : {})}
          transition={200}
          accessible={false}
        />

        {/* El velo de atenuación. MISMA geometría que la imagen de arriba —
            `OVERSCALE_FRAME_STYLE`, el mismo objeto, no una copia — para que
            al encogerse con `Frame` no quede un borde de imagen sin atenuar.
            Ver el comentario de `OVERSCALE_FRAME_STYLE` más arriba. */}
        <Animated.View
          pointerEvents="none"
          style={[
            OVERSCALE_FRAME_STYLE,
            { backgroundColor: theme.overlayScrim },
            scrimStyle,
          ]}
          testID={testID != null ? `${testID}-scrim` : undefined}
        />
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
