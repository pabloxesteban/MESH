/**
 * Laboratorio del mapa de gusto — EXPERIMENTAL, sin ruta a producción.
 *
 * Ver docs/research/MESH-UX-STRATEGY.md §19. El pedido original describía un
 * grafo donde "estilos relacionados están más cerca" y "asociaciones fuertes
 * tienen conexión más fuerte" — eso se dejó afuera a propósito: MESH no
 * calcula relación entre estilos, solo el puntaje de cada estilo contra el
 * gusto de una persona (`TasteEvidence` en packages/domain). Dibujar una
 * cercanía entre "fine-line" y "minimalist" que nadie calculó sería inventar
 * información, y CLAUDE.md lo prohíbe sin excepción — no importa que sea un
 * prototipo.
 *
 * Lo que SÍ se dibuja, y es honesto: el tamaño de cada nodo es el `support`
 * real (cuántas interacciones), y la distancia al centro es `1 - score` — más
 * cerca del centro es más gusto. Cada línea va del nodo al centro, nunca
 * entre dos nodos.
 *
 * Los datos son un fixture, no una consulta real — este archivo no importa
 * `packages/domain`, así que no hay riesgo de que un cambio de forma de datos
 * se cuele sin que el typecheck lo note en un lugar que nadie mira.
 */

import { View, useWindowDimensions } from 'react-native'

import { Box, Text, radius, useTheme } from '@/design-system/index.ts'

interface FixtureEvidence {
  readonly styleSlug: string
  readonly label: string
  readonly score: number
  readonly support: number
}

const FIXTURE: readonly FixtureEvidence[] = [
  { styleSlug: 'fine-line', label: 'Línea fina', score: 0.82, support: 9 },
  { styleSlug: 'japanese', label: 'Japonés', score: 0.61, support: 5 },
  { styleSlug: 'blackwork', label: 'Blackwork', score: 0.44, support: 3 },
  { styleSlug: 'minimalist', label: 'Minimalista', score: 0.38, support: 2 },
]

export function TasteMapLab() {
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const size = Math.min(width - 64, 300)
  const center = size / 2

  return (
    <Box gap="md" padding="md">
      <Text role="body" color="textSecondary">
        Experimental. El tamaño de cada nodo es soporte real (cuántas
        interacciones); la distancia al centro es el puntaje. No hay líneas
        entre estilos: MESH no calcula relación entre estilos, y dibujar una
        sería inventar información.
      </Text>

      <View
        style={{
          width: size,
          height: size,
          alignSelf: 'center',
          borderRadius: radius.lg,
          backgroundColor: theme.surfaceRaised,
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: center - 3,
            top: center - 3,
            width: 6,
            height: 6,
            borderRadius: radius.sm,
            backgroundColor: theme.textTertiary,
          }}
          testID="lab-taste-map-center"
        />

        {FIXTURE.map((entry, index) => {
          const angle = (index / FIXTURE.length) * 2 * Math.PI
          const distance = (1 - entry.score) * (size / 2 - 40)
          const x = center + distance * Math.cos(angle)
          const y = center + distance * Math.sin(angle)
          const nodeSize = 24 + entry.support * 4
          const lineLength = Math.hypot(x - center, y - center)
          const lineAngle = (Math.atan2(y - center, x - center) * 180) / Math.PI

          return (
            <View key={entry.styleSlug}>
              <View
                style={{
                  position: 'absolute',
                  left: center,
                  top: center,
                  width: lineLength,
                  height: 1,
                  backgroundColor: theme.borderSubtle,
                  transform: [{ translateY: 0 }, { rotate: `${lineAngle}deg` }],
                  transformOrigin: '0 0',
                }}
              />
              <View
                testID={`lab-taste-node-${entry.styleSlug}`}
                style={{
                  position: 'absolute',
                  left: x - nodeSize / 2,
                  top: y - nodeSize / 2,
                  width: nodeSize,
                  height: nodeSize,
                  borderRadius: nodeSize / 2,
                  backgroundColor: theme.accentFill,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text role="micro" tint={theme.accentContrast}>
                  {entry.label.slice(0, 1)}
                </Text>
              </View>
            </View>
          )
        })}
      </View>

      <Box gap="xxs">
        {FIXTURE.map((entry) => (
          <Text key={entry.styleSlug} role="micro" color="textTertiary">
            {entry.label} · puntaje {entry.score.toFixed(2)} · {entry.support}{' '}
            interacciones
          </Text>
        ))}
      </Box>
    </Box>
  )
}
