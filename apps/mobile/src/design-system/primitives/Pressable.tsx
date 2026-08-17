import { useMemo } from 'react'
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type ViewStyle,
} from 'react-native'
import { useTheme } from '../providers/ThemeProvider.tsx'
import { MIN_TOUCH_TARGET } from '../tokens/layout.ts'
import { haptic, type HapticIntent } from '../tokens/haptics.ts'

export interface PressableProps extends Omit<
  RNPressableProps,
  'style' | 'children' | 'hitSlop'
> {
  children?: React.ReactNode
  style?: ViewStyle
  /**
   * Háptico a disparar en el toque. Confirmación de una decisión de la persona,
   * nada más. Por defecto ninguno: un háptico se pide explícitamente.
   */
  hapticIntent?: HapticIntent
  /**
   * Tamaño visual del control, cuando es menor al área táctil mínima. El
   * `hitSlop` se calcula para llegar a 44pt sin cambiar cómo se ve.
   */
  visualSize?: { width: number; height: number }
}

/**
 * Base de todo lo tocable.
 *
 * Se encarga de tres cosas que ningún componente debería tener que recordar:
 * llegar al área táctil mínima, el estado presionado, y el háptico.
 *
 * `accessibilityLabel` es obligatorio salvo que haya texto adentro — un control
 * sin etiqueta es invisible para un lector de pantalla, y el camino por botones
 * es el camino accesible principal del mazo.
 */
export function Pressable({
  children,
  style,
  hapticIntent = 'none',
  visualSize,
  onPress,
  disabled,
  ...rest
}: PressableProps) {
  const theme = useTheme()

  const hitSlop = useMemo(() => {
    if (visualSize == null) return undefined
    return {
      top: Math.max(0, (MIN_TOUCH_TARGET - visualSize.height) / 2),
      bottom: Math.max(0, (MIN_TOUCH_TARGET - visualSize.height) / 2),
      left: Math.max(0, (MIN_TOUCH_TARGET - visualSize.width) / 2),
      right: Math.max(0, (MIN_TOUCH_TARGET - visualSize.width) / 2),
    }
  }, [visualSize])

  return (
    <RNPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={(event) => {
        haptic(hapticIntent)
        onPress?.(event)
      }}
      {...rest}
      style={({ pressed }) => [
        style,
        pressed && { opacity: theme.pressedOpacity },
        disabled === true && { opacity: theme.disabledOpacity },
      ]}
    >
      {children}
    </RNPressable>
  )
}
