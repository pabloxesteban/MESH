import { useEffect } from 'react'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useMotion } from '../providers/MotionProvider.tsx'
import { useTheme } from '../providers/ThemeProvider.tsx'
import { radius as radiusTokens, type Radius } from '../tokens/layout.ts'
import { duration, easing } from '../tokens/motion.ts'

export interface SkeletonProps {
  width?: number | `${number}%`
  height: number
  radius?: Radius
  testID?: string
}

/**
 * Placeholder de carga.
 *
 * Un skeleton tiene que tener la forma del contenido que reemplaza. Uno
 * genérico no es más honesto que un spinner: solo ocupa espacio. Quien lo usa
 * pasa las medidas reales.
 *
 * Con movimiento reducido no pulsa — se queda quieto en su valor de reposo. Un
 * pulso perpetuo es exactamente el tipo de movimiento que alguien desactiva.
 */
export function Skeleton({
  width = '100%',
  height,
  radius = 'md',
  testID,
}: SkeletonProps) {
  const theme = useTheme()
  const { reduceMotion } = useMotion()
  const progress = useSharedValue(0)

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 0
      return
    }
    progress.value = withRepeat(
      withTiming(1, {
        duration: duration.reveal,
        easing: Easing.bezier(...easing.out),
      }),
      -1,
      true,
    )
  }, [progress, reduceMotion])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.5 : 0.35 + progress.value * 0.35,
  }))

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      testID={testID}
      style={[
        {
          width,
          height,
          borderRadius: radiusTokens[radius],
          backgroundColor: theme.borderSubtle,
        },
        animatedStyle,
      ]}
    />
  )
}
