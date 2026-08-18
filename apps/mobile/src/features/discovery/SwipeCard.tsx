/**
 * El gesto.
 *
 * Dos reglas que no se negocian:
 *
 * 1. **El gesto nunca es la única forma.** Cada dirección tiene un botón
 *    equivalente con etiqueta accesible y área táctil de ≥44pt. Esta capa
 *    envuelve a la tarjeta; los botones viven en la pantalla, y los dos llaman
 *    exactamente a la misma función.
 * 2. **El estado del gesto no cruza a React.** Vive en shared values de
 *    Reanimated y corre en el hilo de UI. Un `setState` por frame de arrastre
 *    tira los 60fps del presupuesto sin ninguna contrapartida.
 *
 * Con movimiento reducido activado el arrastre sigue funcionando —es control
 * directo, no animación— pero la tarjeta sale sin recorrido: desaparece en su
 * lugar. Ver `MotionProvider`.
 */

import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useWindowDimensions, type ViewStyle } from 'react-native'
import type { ReactNode } from 'react'

import {
  REDUCED_DURATION,
  duration,
  spring,
  useMotion,
} from '@/design-system/index.ts'

export type SwipeDirection = 'left' | 'right' | 'up'

export interface SwipeCardProps {
  children: ReactNode
  onDecide: (direction: SwipeDirection) => void
  /** Se deshabilita mientras la tarjeta de arriba se está yendo. */
  enabled?: boolean
  testID?: string
}

/** Fracción del ancho de pantalla a partir de la cual se cuenta como decisión. */
const COMMIT_RATIO = 0.28

/** Velocidad que decide aunque el recorrido sea corto: un flick cuenta. */
const FLICK_VELOCITY = 800

export function SwipeCard({
  children,
  onDecide,
  enabled = true,
  testID,
}: SwipeCardProps) {
  const { width, height } = useWindowDimensions()
  const { reduceMotion } = useMotion()

  const x = useSharedValue(0)
  const y = useSharedValue(0)

  const threshold = width * COMMIT_RATIO

  function fly(direction: SwipeDirection) {
    'worklet'
    const config = reduceMotion
      ? { duration: REDUCED_DURATION }
      : { duration: duration.quick }

    if (direction === 'up') {
      y.value = withTiming(reduceMotion ? 0 : -height, config)
    } else {
      x.value = withTiming(
        reduceMotion ? 0 : (direction === 'right' ? width : -width) * 1.4,
        config,
      )
    }
    runOnJS(onDecide)(direction)
  }

  const pan = Gesture.Pan()
    .enabled(enabled)
    .onChange((event) => {
      x.value += event.changeX
      y.value += event.changeY
    })
    .onEnd((event) => {
      // Arriba se evalúa primero: guardar es más específico que me gusta, y un
      // gesto diagonal debería resolverse a la intención más deliberada.
      if (y.value < -threshold || event.velocityY < -FLICK_VELOCITY) {
        fly('up')
        return
      }
      if (x.value > threshold || event.velocityX > FLICK_VELOCITY) {
        fly('right')
        return
      }
      if (x.value < -threshold || event.velocityX < -FLICK_VELOCITY) {
        fly('left')
        return
      }
      // No alcanzó: vuelve. El resorte es lo que hace que arrastrar se sienta
      // reversible, y que se sienta reversible es lo que permite explorar.
      x.value = withSpring(0, spring.deck)
      y.value = withSpring(0, spring.deck)
    })

  const style = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      // La rotación es chica a propósito: suficiente para que el arrastre se
      // sienta físico, no tanta como para tapar la obra.
      { rotate: `${interpolate(x.value, [-width, 0, width], [-8, 0, 8])}deg` },
    ],
  }))

  return (
    <GestureDetector gesture={pan}>
      <Animated.View testID={testID} style={[{ flex: 1 }, style]}>
        {children}
      </Animated.View>
    </GestureDetector>
  )
}
