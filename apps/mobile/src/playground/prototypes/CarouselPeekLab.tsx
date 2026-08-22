/**
 * Laboratorio del efecto de foco del carrusel de obra.
 *
 * Paso 1 de la verificación que pide la spec de `interaction-designer` para
 * este efecto — antes de tocar `ArtistCard.tsx` de producción. Reproduce el
 * mecanismo completo (escala + atenuación por distancia al centro, snap
 * nativo) con **fotos reales**, no bloques de color sólido: el bug que este
 * laboratorio existe para cazar —un borde de imagen sin cubrir cuando la
 * pieza se encoge— se esconde exactamente detrás de un placeholder de color
 * uniforme y se nota con una foto real, que es lo que el intento anterior del
 * revelado vertical (174c920 → c4bd77c) confirmó de la peor manera: se
 * shippeó con una verificación superficial y hubo que revertirlo.
 *
 * Las fotos son las mismas que carga `tools/seed` para el catálogo de
 * artistas fixture — bancos de Pixabay listados en
 * `content/artists/*\/photos.yaml`, con licencia de uso libre. Elegidas a
 * propósito con relaciones de aspecto bien distintas entre sí (algunas muy
 * verticales, algunas casi cuadradas) para que `contentFit="cover"` tenga que
 * recortar de maneras distintas en cada una — si el margen de cobertura
 * fallara para algún encuadre, una sola foto de prueba no lo mostraría.
 *
 * No reimporta `CarouselPiece` de `ArtistCard.tsx`: ese componente está
 * acoplado a `mediaUrl()`, que arma URLs del storage de Supabase a partir de
 * un `mediaPath`, y estas fotos son URLs externas directas. Lo que sí importa
 * son las constantes de `carouselMotion.ts` — el mismo archivo que usa la
 * producción — así que un cambio ahí se refleja acá sin copiar números a
 * mano. La geometría (Frame + Image + Scrim, sobredimensionadas y
 * centradas con el mismo objeto de estilo) es una reproducción fiel, no una
 * aproximación: es exactamente lo que pide el comentario de
 * `OVERSCALE_FRAME_STYLE` en `ArtistCard.tsx`.
 *
 * Qué mirar con la mano: arrastrar despacio y ver a la pieza centrada quedar
 * a tamaño real mientras las vecinas se achican y atenúan levemente; que
 * NINGÚN borde de ninguna foto muestre el fondo de la caja al encogerse —
 * eso es lo que confirma la cuenta de `IMAGE_OVERSCALE`; soltar cerca de
 * un borde y ver el snap terminar de alinear; activar movimiento reducido y
 * ver que el carrusel queda en el showcase spread estático, sin escala ni
 * velo, con el snap todavía funcionando (es física de scroll, no animación).
 */

import { Image } from 'expo-image'
import { useState } from 'react'
import { type ViewStyle } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'

import {
  Box,
  Button,
  Text,
  radius,
  spacing,
  useMotion,
  useTheme,
} from '@/design-system/index.ts'
import {
  DIM_PEEK,
  IMAGE_OVERSCALE,
  PIECE_WIDTH,
  PITCH,
  SCALE_PEEK,
} from '@/features/artists/carouselMotion.ts'

/**
 * Fotos reales del banco que usa `tools/seed`, de varios artistas fixture
 * para variar el contenido. Relaciones de aspecto deliberadamente dispares —
 * ver el comentario de cabecera.
 */
const FOTOS: readonly { id: string; uri: string }[] = [
  {
    id: 'neo-01',
    uri: 'https://pixabay.com/get/g454b44deeb70267c01d55f5b9d6141cd1ed4a1b8905c85384948d490b0b69ed9d39ebe6ba4ff6a05075707e1a9a1fe09_1280.jpg',
  },
  {
    id: 'neo-02',
    uri: 'https://pixabay.com/get/ge53babade68c640a30a1a49229d06c95fd0c5b254249c8e0e8a8c984fa08f417285c2596cdcafac0d561a81f7479afe24cfd619f77380e09b1e7091261069550_1280.jpg',
  },
  {
    id: 'neo-03',
    uri: 'https://pixabay.com/get/ge71ee001353ca2632f02ebf8d396c167946bf953493d6c49c3839667f073ed2330f9250b73b3eb337cb8b169e87e9b3e993a4078bd33c5664d7ce142d4fee42e_1280.jpg',
  },
  {
    id: 'amano-01',
    uri: 'https://pixabay.com/get/ge676b4ccbeb9658ce4ab7f9c25d9656d477ce1deb7290803b9815897fd1215aea72c6dc97cad69b19d979a663a918e04c9355e3eb194c7c422ac38df151ee01c_1280.jpg',
  },
  {
    id: 'amano-02',
    uri: 'https://pixabay.com/get/g65fb5ca7da62e8731cf44a79df40417d3566d28d6ce0fce19242308ee0de6306e8cedca36dcf4416972d864d1aee089cebbb4e6a709de9a9381c929487d44142_1280.jpg',
  },
  {
    id: 'tinta-01',
    uri: 'https://pixabay.com/get/g54441b9b17d7a4e6878eda16de5f41b959c82e81cb01988eaa0be8834ff0f23710abdcc5d0c091a7a35dec715268a294099c90882296d55411450db003925ea2_1280.jpg',
  },
  {
    id: 'tinta-02',
    uri: 'https://pixabay.com/get/g27a050702d295ea0d5560ee97c92f044389f06cb21ba282907e609a90b2801d8d33ecad92a85244ae973096ea0e9a0f2953cd44fb2c5956716ae651122fd7c2e_1280.jpg',
  },
  {
    id: 'vieja-01',
    uri: 'https://pixabay.com/get/g721dbf77b96796e461b7001bf706cdcdf00eb8858ba55445939d4f03ac7d25cc1608f882a48fef3a9ddae1f2fb9b64c018652a5af1a7a3ebeaa993145e96c5e5_1280.jpg',
  },
]

// Sin anotar como `ViewStyle` — ver el mismo comentario en `ArtistCard.tsx`:
// viaja tanto a un `Animated.View` como a la `Image` de expo-image.
const OVERSCALE_FRAME_STYLE = {
  position: 'absolute',
  left: `${-(IMAGE_OVERSCALE - 1) * 50}%`,
  top: `${-(IMAGE_OVERSCALE - 1) * 50}%`,
  width: `${IMAGE_OVERSCALE * 100}%`,
  height: `${IMAGE_OVERSCALE * 100}%`,
} as const

export function CarouselPeekLab() {
  const theme = useTheme()
  const { reduceMotion: systemReduceMotion } = useMotion()
  const [forceReduceMotion, setForceReduceMotion] = useState(false)
  const reduceMotion = systemReduceMotion || forceReduceMotion

  const scrollX = useSharedValue(0)
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

  return (
    <Box gap="md" padding="md">
      <Text role="body" color="textSecondary">
        Arrastrá el carrusel. La pieza centrada queda a tamaño real; las
        vecinas se achican al {Math.round(SCALE_PEEK * 100)}% y se atenúan
        hasta {Math.round(DIM_PEEK * 100)}%. Mirá el borde de cada foto al
        encogerse — no tiene que verse el fondo de la caja en ningún punto.
      </Text>

      <Button
        label={
          forceReduceMotion
            ? 'Movimiento reducido: ON'
            : 'Forzar movimiento reducido'
        }
        variant={forceReduceMotion ? 'primary' : 'secondary'}
        size="sm"
        onPress={() => setForceReduceMotion((v) => !v)}
        testID="lab-peek-reduce-motion"
      />

      {reduceMotion ? (
        <Text role="micro" color="stateWarning">
          Movimiento reducido activo: showcase spread estático, sin escala ni
          velo. El snap sigue funcionando — es física de scroll, no
          animación.
        </Text>
      ) : null}

      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToInterval={PITCH}
        decelerationRate="fast"
        disableIntervalMomentum
        snapToAlignment="start"
        contentContainerStyle={{ gap: spacing.xxs }}
        testID="lab-carousel-peek"
      >
        {FOTOS.map((foto, index) => (
          <PeekPiece
            key={foto.id}
            uri={foto.uri}
            index={index}
            scrollX={scrollX}
            reduceMotion={reduceMotion}
            backgroundColor={theme.surfaceRaised}
            scrimColor={theme.overlayScrim}
          />
        ))}
      </Animated.ScrollView>
    </Box>
  )
}

function PeekPiece({
  uri,
  index,
  scrollX,
  reduceMotion,
  backgroundColor,
  scrimColor,
}: {
  uri: string
  index: number
  scrollX: SharedValue<number>
  reduceMotion: boolean
  backgroundColor: string
  scrimColor: string
}) {
  const itemLeft = index * PITCH

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
    <Animated.View
      testID={`lab-peek-piece-${index}`}
      style={{
        width: PIECE_WIDTH,
        aspectRatio: 3 / 4,
        borderRadius: radius.art,
        overflow: 'hidden',
        backgroundColor,
      }}
    >
      <Animated.View style={[{ width: '100%', height: '100%' }, frameStyle]}>
        <Image
          source={{ uri }}
          style={OVERSCALE_FRAME_STYLE}
          contentFit="cover"
          transition={200}
          accessible={false}
        />
        <Animated.View
          style={[
            OVERSCALE_FRAME_STYLE,
            { backgroundColor: scrimColor },
            scrimStyle,
          ]}
        />
      </Animated.View>
    </Animated.View>
  )
}
