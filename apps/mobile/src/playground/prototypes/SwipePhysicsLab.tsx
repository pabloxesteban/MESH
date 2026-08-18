/**
 * Laboratorio de física de arrastre.
 *
 * No reemplaza a `SwipeCard.tsx` — lo reproduce con los tres números que
 * decidirían un rediseño expuestos como estado, para poder ajustarlos con la
 * mano en vez de leyendo el valor en el código. Ver
 * docs/research/decisions/swipe-physics-confirmed.md: la conclusión de esta
 * investigación fue que los valores actuales ya coinciden con lo que se ve en
 * productos reales, así que este laboratorio es para la PRÓXIMA vez que
 * alguien dude de esos números, no una propuesta de cambio ahora.
 */

import { useState } from 'react'
import { View, useWindowDimensions, type ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import {
  Box,
  Button,
  Text,
  duration,
  radius,
  spacing,
  spring,
  useTheme,
} from '@/design-system/index.ts'

const DEFAULT_COMMIT_RATIO = 0.28
const DEFAULT_FLICK_VELOCITY = 800
const DEFAULT_ROTATION_DEG = 8

export function SwipePhysicsLab() {
  const theme = useTheme()

  const [commitRatio, setCommitRatio] = useState(DEFAULT_COMMIT_RATIO)
  const [flickVelocity, setFlickVelocity] = useState(DEFAULT_FLICK_VELOCITY)
  const [rotationDeg, setRotationDeg] = useState(DEFAULT_ROTATION_DEG)
  const [lastDecision, setLastDecision] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  return (
    <Box gap="md" padding="md">
      <Text role="body" color="textSecondary">
        Arrastrá la tarjeta. Los controles cambian el umbral de decisión, la
        velocidad de flick y el rango de rotación — los tres números que un
        rediseño de SwipeCard.tsx tendría que justificar cambiar.
      </Text>

      <View
        style={{
          height: 320,
          borderRadius: radius.lg,
          backgroundColor: theme.surfaceRaised,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <PhysicsCard
          key={key}
          commitRatio={commitRatio}
          flickVelocity={flickVelocity}
          rotationDeg={rotationDeg}
          onDecide={(direction) => setLastDecision(direction)}
        />
      </View>

      <Text role="micro" color="textTertiary" testID="lab-last-decision">
        {lastDecision != null
          ? `Última decisión: ${lastDecision}`
          : 'Todavía no soltaste la tarjeta.'}
      </Text>

      <Stepper
        label="Umbral de decisión"
        value={`${Math.round(commitRatio * 100)}% del ancho`}
        onDecrease={() =>
          setCommitRatio((v) =>
            Math.max(0.1, Math.round((v - 0.02) * 100) / 100),
          )
        }
        onIncrease={() =>
          setCommitRatio((v) =>
            Math.min(0.6, Math.round((v + 0.02) * 100) / 100),
          )
        }
      />
      <Stepper
        label="Velocidad de flick"
        value={`${flickVelocity} px/s`}
        onDecrease={() => setFlickVelocity((v) => Math.max(200, v - 100))}
        onIncrease={() => setFlickVelocity((v) => Math.min(2000, v + 100))}
      />
      <Stepper
        label="Rotación máxima"
        value={`±${rotationDeg}°`}
        onDecrease={() => setRotationDeg((v) => Math.max(0, v - 1))}
        onIncrease={() => setRotationDeg((v) => Math.min(20, v + 1))}
      />

      <Button
        label="Reiniciar tarjeta"
        variant="secondary"
        onPress={() => {
          setLastDecision(null)
          setKey((k) => k + 1)
        }}
        testID="lab-reset"
      />
    </Box>
  )
}

function Stepper({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string
  value: string
  onDecrease: () => void
  onIncrease: () => void
}) {
  return (
    <Box direction="row" align="center" gap="sm">
      <Box flex={1}>
        <Text role="label" color="textSecondary">
          {label}
        </Text>
        <Text role="body">{value}</Text>
      </Box>
      <Button label="−" size="sm" variant="secondary" onPress={onDecrease} />
      <Button label="+" size="sm" variant="secondary" onPress={onIncrease} />
    </Box>
  )
}

function PhysicsCard({
  commitRatio,
  flickVelocity,
  rotationDeg,
  onDecide,
}: {
  commitRatio: number
  flickVelocity: number
  rotationDeg: number
  onDecide: (direction: 'left' | 'right') => void
}) {
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const x = useSharedValue(0)
  const threshold = width * commitRatio

  const pan = Gesture.Pan()
    .onChange((event) => {
      x.value += event.changeX
    })
    .onEnd((event) => {
      if (x.value > threshold || event.velocityX > flickVelocity) {
        x.value = withTiming(width * 1.4, { duration: duration.quick })
        runOnJS(onDecide)('right')
        return
      }
      if (x.value < -threshold || event.velocityX < -flickVelocity) {
        x.value = withTiming(-width * 1.4, { duration: duration.quick })
        runOnJS(onDecide)('left')
        return
      }
      x.value = withSpring(0, spring.deck)
    })

  const style = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: x.value },
      {
        rotate: `${interpolate(x.value, [-width, 0, width], [-rotationDeg, 0, rotationDeg])}deg`,
      },
    ],
  }))

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID="lab-physics-card"
        style={[
          {
            width: 180,
            height: 260,
            borderRadius: radius.md,
            backgroundColor: theme.accentFill,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.md,
          },
          style,
        ]}
      >
        <Text role="title" tint={theme.accentContrast}>
          Arrastrame
        </Text>
      </Animated.View>
    </GestureDetector>
  )
}
