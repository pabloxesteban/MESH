import { useEffect } from 'react'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { Box } from '../primitives/Box.tsx'
import { Text } from '../primitives/Text.tsx'
import { Pressable } from '../primitives/Pressable.tsx'
import { useMotion } from '../providers/MotionProvider.tsx'
import { spacing } from '../tokens/layout.ts'

export type ToastTone = 'neutral' | 'positive' | 'negative'

export interface ToastProps {
  message: string
  tone?: ToastTone
  /** Acción única y opcional, como deshacer. */
  action?: { label: string; onPress: () => void }
  onDismiss: () => void
  /** Milisegundos hasta cerrarse solo. */
  durationMs?: number
  testID?: string
}

const TONE_COLOR = {
  neutral: 'textPrimary',
  positive: 'statePositive',
  negative: 'stateNegative',
} as const

/**
 * Aviso breve y no bloqueante.
 *
 * Un toast es para confirmar algo que ya pasó, nunca para un error que requiere
 * una decisión: eso necesita un `ErrorState` con reintento, porque un mensaje
 * que se va solo no es un lugar donde tomar una decisión.
 *
 * Se cierra solo, pero también es tocable: si alguien está leyendo despacio,
 * que el aviso desaparezca no lo deja sin salida.
 */
export function Toast({
  message,
  tone = 'neutral',
  action,
  onDismiss,
  durationMs = 4000,
  testID,
}: ToastProps) {
  const { reduceMotion } = useMotion()

  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [durationMs, onDismiss])

  return (
    <Animated.View
      // Con movimiento reducido no se pasan animaciones de entrada y salida en
      // absoluto, en lugar de pasarlas en `undefined`: bajo
      // exactOptionalPropertyTypes no es lo mismo ausente que indefinido.
      {...(reduceMotion ? {} : { entering: FadeIn, exiting: FadeOut })}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      testID={testID}
    >
      <Box
        direction="row"
        align="center"
        justify="space-between"
        gap="sm"
        paddingX="md"
        paddingY="sm"
        radius="md"
        background="surfaceRaised"
        border="borderSubtle"
      >
        <Box flex={1}>
          <Text role="body" color={TONE_COLOR[tone]}>
            {message}
          </Text>
        </Box>

        {action != null ? (
          <Pressable
            onPress={action.onPress}
            accessibilityLabel={action.label}
            style={{
              paddingHorizontal: spacing.xs,
              paddingVertical: spacing.xxs,
            }}
          >
            <Text role="label" color="accent">
              {action.label}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onDismiss}
            accessibilityLabel="Cerrar aviso"
            style={{
              paddingHorizontal: spacing.xs,
              paddingVertical: spacing.xxs,
            }}
          >
            <Text role="label" color="textSecondary">
              Cerrar
            </Text>
          </Pressable>
        )}
      </Box>
    </Animated.View>
  )
}
