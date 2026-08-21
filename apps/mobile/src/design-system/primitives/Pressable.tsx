import { useMemo, type Ref } from 'react'
import {
  Pressable as RNPressable,
  type GestureResponderEvent,
  type PressableProps as RNPressableProps,
  type View,
  type ViewStyle,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../providers/ThemeProvider.tsx'
import { useMotion } from '../providers/MotionProvider.tsx'
import { MIN_TOUCH_TARGET } from '../tokens/layout.ts'
import { haptic, type HapticIntent } from '../tokens/haptics.ts'
import { PRESS_SCALE, duration, easing } from '../tokens/motion.ts'

// En el mock de test, `createAnimatedComponent` es la identidad — el nodo
// renderizado sigue siendo `RNPressable`. En nativo, envuelve el componente
// para poder animar su `style` con shared values sin sacarlo del hilo de UI.
const AnimatedPressable = Animated.createAnimatedComponent(RNPressable)

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
  /**
   * Compresión física leve (`scale` a `PRESS_SCALE`) mientras se mantiene
   * presionado. Se suma al cambio de opacidad, no lo reemplaza.
   *
   * Por defecto apagado. Es un préstamo deliberado de `Button`, que lo enciende
   * únicamente en `variant="primary"` (ADR-031, segunda etapa) — el acento
   * aparece como máximo una vez por pantalla, y este feedback tiene que
   * reforzar esa regla, no volverse un efecto genérico que cualquier pantalla
   * prende porque "queda mejor".
   */
  pressedScale?: boolean
  /**
   * Referencia a la vista, para poder medirla con `measureInWindow`.
   *
   * Existe por la transición obra → artista: la obra tiene que crecer desde
   * donde estaba, y "donde estaba" solo lo sabe la vista que la mostraba. Un
   * componente tocable que no se puede medir obliga a envolverlo en otra vista
   * solo para eso, y esa vista de más termina apareciendo en cada grilla.
   */
  ref?: Ref<View>
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
  pressedScale = false,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ref,
  ...rest
}: PressableProps) {
  const theme = useTheme()
  const { reduceMotion } = useMotion()

  // Shared value inofensivo cuando `pressedScale` está apagado: se crea
  // siempre (los hooks no pueden ser condicionales) pero nunca se anima ni se
  // lee si el llamador no lo pidió.
  const scale = useSharedValue(1)

  const hitSlop = useMemo(() => {
    if (visualSize == null) return undefined
    return {
      top: Math.max(0, (MIN_TOUCH_TARGET - visualSize.height) / 2),
      bottom: Math.max(0, (MIN_TOUCH_TARGET - visualSize.height) / 2),
      left: Math.max(0, (MIN_TOUCH_TARGET - visualSize.width) / 2),
      right: Math.max(0, (MIN_TOUCH_TARGET - visualSize.width) / 2),
    }
  }, [visualSize])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const timingConfig = {
    duration: duration.instant,
    easing: Easing.bezier(...easing.out),
  }

  function handlePressIn(event: GestureResponderEvent) {
    // La reducción de movimiento reemplaza toda transición basada en
    // transformación por un fundido — acá, el cambio de opacidad que ya existe
    // más abajo. No es un caso especial nuevo: es el mismo `reduceMotion` que
    // ya lee cualquier otro componente animado del sistema.
    if (pressedScale && !reduceMotion) {
      scale.value = withTiming(PRESS_SCALE, timingConfig)
    }
    onPressIn?.(event)
  }

  function handlePressOut(event: GestureResponderEvent) {
    if (pressedScale && !reduceMotion) {
      scale.value = withTiming(1, timingConfig)
    }
    onPressOut?.(event)
  }

  const sharedProps = {
    accessibilityRole: 'button' as const,
    accessibilityState: { disabled: disabled === true },
    disabled,
    hitSlop,
    onPress: (event: GestureResponderEvent) => {
      haptic(hapticIntent)
      onPress?.(event)
    },
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    ...rest,
  }

  // Dos ramas en vez de elegir el componente en una variable: `RNPressable` y
  // `AnimatedPressable` esperan tipos de `ref`/`style` incompatibles entre sí
  // (Reanimated tipa su propio `ref`), y una unión de componentes pierde esa
  // precisión. Ramificar mantiene cada uno con su tipo real.
  if (pressedScale) {
    return (
      <AnimatedPressable
        // `exactOptionalPropertyTypes` no deja pasar `ref={undefined}`
        // explícito acá — Reanimated tipa el `ref` del componente animado
        // como una prop más, no con el manejo especial de `forwardRef` que
        // sí acepta `undefined`. Se omite del todo cuando no hay referencia.
        {...(ref != null ? { ref } : {})}
        {...sharedProps}
        style={({ pressed }: { pressed: boolean }) => [
          style,
          pressed && { opacity: theme.pressedOpacity },
          disabled === true && { opacity: theme.disabledOpacity },
          animatedStyle,
        ]}
      >
        {children}
      </AnimatedPressable>
    )
  }

  return (
    <RNPressable
      ref={ref}
      {...sharedProps}
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
