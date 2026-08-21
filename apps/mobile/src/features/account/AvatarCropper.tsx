/**
 * Recorte circular de la foto de perfil, con preview en vivo.
 *
 * Un solo paso: no hay wizard de "elegí, después recortá, después confirmá en
 * otra pantalla" — se ve el círculo final mientras se mueve la foto.
 *
 * **El gesto nunca es la única forma** (innegociable 6): pellizcar/arrastrar
 * mueve la imagen, pero Acercar / Alejar / Centrar hacen exactamente lo mismo
 * con un botón de ≥44pt. Los dos caminos escriben los mismos shared values, así
 * que da lo mismo cuál se usó.
 *
 * El gesto corre entero en el hilo de UI vía worklets — nada de estado de React
 * durante el arrastre. `computeCrop` es la única cuenta que se ejecuta en JS, y
 * solo cuando hay que reportar el recorte hacia arriba.
 */

import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import {
  Box,
  Button,
  duration,
  useMotion,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import type { AvatarCrop } from './uploadAvatar.ts'

/**
 * Diámetro del círculo de recorte.
 *
 * Fijo y no un token de espaciado: es el tamaño de ESTE control en particular
 * — mismo criterio que `Avatar.DIAMETER` o `MAX_DIMENSION` en
 * `reviews/upload.ts`, no una medida de layout genérica.
 */
const VIEWPORT = 260

/** Cuánto suma cada toque de Acercar/Alejar, sobre la escala del usuario. */
const ZOOM_STEP = 0.35

/** Tope de zoom, sobre la escala mínima (la que ya cubre el círculo entero). */
const MAX_USER_SCALE = 4

function clamp(value: number, min: number, max: number): number {
  'worklet'
  return Math.min(Math.max(value, min), max)
}

/**
 * Cuánto puede moverse la imagen sin dejar un hueco vacío en el círculo, para
 * una escala de usuario dada.
 */
function boundsFor(
  imageWidth: number,
  imageHeight: number,
  baseScale: number,
  userScale: number,
): { x: number; y: number } {
  'worklet'
  const displayedWidth = imageWidth * baseScale * userScale
  const displayedHeight = imageHeight * baseScale * userScale
  return {
    x: Math.max(0, (displayedWidth - VIEWPORT) / 2),
    y: Math.max(0, (displayedHeight - VIEWPORT) / 2),
  }
}

export interface AvatarCropperProps {
  uri: string
  imageWidth: number
  imageHeight: number
  /** El recorte, listo para `uploadAvatar`. Cambia con cada gesto o botón. */
  onCropChange: (crop: AvatarCrop) => void
  /** Cuando la imagen terminó de decodificarse y ya se puede interactuar. */
  onImageLoad?: () => void
  testID?: string
}

/**
 * El cuadrado, en píxeles de la imagen ORIGINAL, que corresponde a lo que se
 * ve dentro del círculo.
 *
 * Pura y exportada para poder verificarla sin gestos ni pantalla: dado un
 * tamaño de imagen, una escala y un desplazamiento, cuál es el recorte.
 */
export function computeCrop(input: {
  imageWidth: number
  imageHeight: number
  userScale: number
  translateX: number
  translateY: number
  viewport?: number
}): AvatarCrop {
  const viewport = input.viewport ?? VIEWPORT
  const baseScale = viewport / Math.min(input.imageWidth, input.imageHeight)
  const effectiveScale = baseScale * input.userScale

  const displayedWidth = input.imageWidth * effectiveScale
  const displayedHeight = input.imageHeight * effectiveScale

  const displayedLeft = (displayedWidth - viewport) / 2 - input.translateX
  const displayedTop = (displayedHeight - viewport) / 2 - input.translateY

  const side = viewport / effectiveScale
  const maxOriginX = Math.max(0, input.imageWidth - side)
  const maxOriginY = Math.max(0, input.imageHeight - side)

  return {
    originX: Math.min(Math.max(displayedLeft / effectiveScale, 0), maxOriginX),
    originY: Math.min(Math.max(displayedTop / effectiveScale, 0), maxOriginY),
    side,
  }
}

export function AvatarCropper({
  uri,
  imageWidth,
  imageHeight,
  onCropChange,
  onImageLoad,
  testID,
}: AvatarCropperProps) {
  const t = useT()
  const theme = useTheme()
  const { reduceMotion } = useMotion()

  const userScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  // Guardan el valor al empezar cada gesto, para que el gesto sea relativo y
  // no salte al valor absoluto del dedo o de los dos dedos.
  const startScale = useSharedValue(1)
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)

  const baseScale = VIEWPORT / Math.min(imageWidth, imageHeight)

  function report(scale: number, x: number, y: number): void {
    onCropChange(
      computeCrop({
        imageWidth,
        imageHeight,
        userScale: scale,
        translateX: x,
        translateY: y,
      }),
    )
  }

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value
      startY.value = translateY.value
    })
    .onUpdate((event) => {
      const limit = boundsFor(imageWidth, imageHeight, baseScale, userScale.value)
      translateX.value = clamp(
        startX.value + event.translationX,
        -limit.x,
        limit.x,
      )
      translateY.value = clamp(
        startY.value + event.translationY,
        -limit.y,
        limit.y,
      )
    })
    .onEnd(() => {
      runOnJS(report)(userScale.value, translateX.value, translateY.value)
    })

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = userScale.value
    })
    .onUpdate((event) => {
      userScale.value = clamp(startScale.value * event.scale, 1, MAX_USER_SCALE)
      const limit = boundsFor(imageWidth, imageHeight, baseScale, userScale.value)
      translateX.value = clamp(translateX.value, -limit.x, limit.x)
      translateY.value = clamp(translateY.value, -limit.y, limit.y)
    })
    .onEnd(() => {
      runOnJS(report)(userScale.value, translateX.value, translateY.value)
    })

  const gesture = Gesture.Simultaneous(pan, pinch)

  const imageStyle = useAnimatedStyle(() => ({
    width: imageWidth * baseScale,
    height: imageHeight * baseScale,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: userScale.value },
    ],
  }))

  /** Lo mismo que hace el gesto, disparado desde un botón de ≥44pt. */
  function animateTo(scale: number, x: number, y: number): void {
    if (reduceMotion) {
      userScale.value = scale
      translateX.value = x
      translateY.value = y
    } else {
      userScale.value = withTiming(scale, { duration: duration.quick })
      translateX.value = withTiming(x, { duration: duration.quick })
      translateY.value = withTiming(y, { duration: duration.quick })
    }
    // El destino, no hay que esperar a que la animación termine para saber qué
    // recorte va a usar "Usar esta foto".
    report(scale, x, y)
  }

  function zoom(delta: number): void {
    const nextScale = clamp(userScale.value + delta, 1, MAX_USER_SCALE)
    const limit = boundsFor(imageWidth, imageHeight, baseScale, nextScale)
    animateTo(
      nextScale,
      clamp(translateX.value, -limit.x, limit.x),
      clamp(translateY.value, -limit.y, limit.y),
    )
  }

  return (
    <Box gap="md" align="center" {...(testID != null ? { testID } : {})}>
      <View
        style={[
          styles.viewport,
          {
            width: VIEWPORT,
            height: VIEWPORT,
            borderRadius: VIEWPORT / 2,
            backgroundColor: theme.surfaceRaised,
          },
        ]}
      >
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.imageWrap, imageStyle]}>
            <Image
              source={uri}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
              accessible={false}
              {...(onImageLoad != null ? { onLoad: onImageLoad } : {})}
            />
          </Animated.View>
        </GestureDetector>
      </View>

      <Box direction="row" gap="sm">
        <Button
          label={t('avatarPicker.zoomOut')}
          variant="secondary"
          size="sm"
          onPress={() => zoom(-ZOOM_STEP)}
          {...(testID != null ? { testID: `${testID}-zoom-out` } : {})}
        />
        <Button
          label={t('avatarPicker.center')}
          variant="secondary"
          size="sm"
          onPress={() => animateTo(1, 0, 0)}
          {...(testID != null ? { testID: `${testID}-center` } : {})}
        />
        <Button
          label={t('avatarPicker.zoomIn')}
          variant="secondary"
          size="sm"
          onPress={() => zoom(ZOOM_STEP)}
          {...(testID != null ? { testID: `${testID}-zoom-in` } : {})}
        />
      </Box>
    </Box>
  )
}

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    position: 'absolute',
  },
})
