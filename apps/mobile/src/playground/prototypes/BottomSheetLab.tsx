/**
 * Laboratorio de hoja inferior.
 *
 * Ver docs/research/mobile-patterns.md § "Hoja inferior". Candidata real para
 * detalle de estilo y explicación de match — sin promover a producción
 * todavía.
 *
 * Se construye acá y no como componente de `design-system/` directamente
 * porque todavía no pasó por `design-system-engineer`: es un prototipo, no un
 * componente aprobado. Si se promueve, este archivo se borra y el componente
 * final vive en `design-system/components/`.
 */

import { useState } from 'react'
import { View, useWindowDimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import {
  Box,
  Button,
  HAIRLINE,
  Text,
  radius,
  spacing,
  spring,
  useTheme,
} from '@/design-system/index.ts'

type SnapPoint = 'peek' | 'half' | 'full'

export function BottomSheetLab() {
  const theme = useTheme()
  const { height } = useWindowDimensions()
  const [snap, setSnap] = useState<SnapPoint>('peek')
  const [visible, setVisible] = useState(true)

  const heights: Record<SnapPoint, number> = {
    peek: 120,
    half: Math.round(height * 0.45),
    full: Math.round(height * 0.85),
  }

  const y = useSharedValue(0)

  const drag = Gesture.Pan()
    .onChange((event) => {
      y.value += event.changeY
    })
    .onEnd(() => {
      // Arrastrar hacia arriba suma altura porque la hoja crece hacia arriba
      // desde el borde inferior — invertido respecto de `y` de pantalla.
      const dragged = -y.value
      y.value = withSpring(0, spring.standard)

      const current = heights[snap]
      const target = current + dragged
      const points = (['peek', 'half', 'full'] as const).map((point) => ({
        point,
        distance: Math.abs(heights[point] - target),
      }))
      points.sort((a, b) => a.distance - b.distance)
      const closest = points[0]?.point
      if (closest != null) setSnap(closest)
    })

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }))

  return (
    <Box gap="md" padding="md">
      <Text role="body" color="textSecondary">
        Arrastrá el tirador entre los tres puntos de ajuste, o cerrá con el
        botón. El botón de cerrar es la alternativa sin gesto — no es opcional.
      </Text>

      {!visible ? (
        <Button
          label="Abrir hoja"
          onPress={() => {
            setVisible(true)
            setSnap('peek')
          }}
          testID="lab-sheet-open"
        />
      ) : null}

      {visible ? (
        <View
          style={{
            height: 360,
            borderRadius: radius.lg,
            backgroundColor: theme.surfaceRaised,
            overflow: 'hidden',
            justifyContent: 'flex-end',
          }}
        >
          <GestureDetector gesture={drag}>
            <Animated.View
              testID="lab-sheet"
              style={[
                {
                  height: heights[snap],
                  backgroundColor: theme.surface,
                  borderTopLeftRadius: radius.lg,
                  borderTopRightRadius: radius.lg,
                  borderWidth: HAIRLINE,
                  borderColor: theme.borderSubtle,
                  padding: spacing.md,
                },
                style,
              ]}
            >
              <View
                style={{
                  alignSelf: 'center',
                  width: 36,
                  height: 4,
                  borderRadius: radius.sm,
                  backgroundColor: theme.borderStrong,
                  marginBottom: spacing.sm,
                }}
              />
              <Text role="label" color="textSecondary">
                Punto de ajuste: {snap}
              </Text>
              <Text role="body">Fine-line</Text>
              <Text role="micro" color="textTertiary">
                Líneas continuas, sin sombreado. Contornos limpios, poco
                relleno.
              </Text>
            </Animated.View>
          </GestureDetector>
        </View>
      ) : null}

      {visible ? (
        <Button
          label="Cerrar"
          variant="secondary"
          onPress={() => setVisible(false)}
          testID="lab-sheet-close"
        />
      ) : null}
    </Box>
  )
}
