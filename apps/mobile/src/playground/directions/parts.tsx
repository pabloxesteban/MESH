/**
 * Piezas compartidas por las cuatro direcciones visuales.
 *
 * Lo mínimo indispensable: un sustituto de obra y un marco de viñeta. Todo lo
 * demás —cómo se componen, con cuánto aire, con qué tipografía— es justamente
 * lo que cada dirección decide distinto, y meterlo acá borraría la diferencia
 * que se está evaluando.
 */

import { View, type DimensionValue, type ViewStyle } from 'react-native'

import {
  Box,
  Text,
  radius as radiusTokens,
  spacing,
  styleColor,
  useTheme,
  type Radius,
} from '@/design-system/index.ts'

/**
 * Una fracción 0–1 como ancho porcentual.
 *
 * Existe para no repetir el mismo cast en cuatro archivos: el tipo de estilo de
 * React Native quiere `` `${number}%` `` y un template literal armado con
 * `String()` se pierde en `string`.
 */
export function percentWidth(fraction: number): DimensionValue {
  return `${Math.round(fraction * 100)}%`
}

/**
 * El lugar donde iría una obra.
 *
 * No es una foto: lo que se compara entre direcciones es la composición, y una
 * grilla que solo funciona porque la foto es linda no es una grilla que
 * funcione.
 *
 * **La primera versión usaba `vivid` como campo completo y hubo que
 * cambiarla.** Ocho bloques saturados en una pantalla se leen como una carta
 * de colores, no como obra: el prototipo terminaba midiendo la intensidad del
 * relleno en vez del layout, y la dirección más densa salía perjudicada por
 * una razón que no tenía nada que ver con su apuesta. Es además un hallazgo
 * real sobre el design system, no solo del prototipo — `vivid` está calculado
 * para chips y barras, y **no puede usarse como campo grande**.
 *
 * Lo que se usa ahora se parece mucho más a una foto de tatuaje: un campo
 * oscuro y neutro, con el color de familia reducido a una banda al pie. Lo
 * neutro domina, el color identifica.
 */
export function ArtworkSlot({
  styleSlug,
  ratio = 1,
  radius = 'md',
  width,
  overlay,
}: {
  styleSlug: string
  ratio?: number
  radius?: Radius | 'none'
  width?: number | `${number}%`
  /** Contenido sobre la obra — el caso que hay que mirar con lupa: no tapar. */
  overlay?: React.ReactNode
}) {
  const theme = useTheme()
  const color = styleColor(styleSlug, theme)

  const base: ViewStyle = {
    aspectRatio: 1 / ratio,
    backgroundColor: theme.surfaceRaised,
    borderRadius: radius === 'none' ? 0 : radiusTokens[radius],
    overflow: 'hidden',
    justifyContent: 'flex-end',
  }

  return (
    <View style={[base, width != null ? { width } : { flex: 1 }]}>
      {/* La banda de familia: identifica el estilo sin ocupar la obra. Va
          arriba del overlay para que el texto siga siendo lo último. */}
      <View style={{ height: spacing.xxs, backgroundColor: color.vivid }} />
      {overlay}
    </View>
  )
}

/**
 * El marco de cada superficie dentro de una dirección.
 *
 * El encabezado no es decoración: dice **qué se está probando**. Una dirección
 * sin esa frase se evalúa por si "queda linda", que es exactamente la
 * conversación que este playground existe para evitar.
 */
export function Vignette({
  surface,
  probe,
  children,
}: {
  surface: string
  probe: string
  children: React.ReactNode
}) {
  const theme = useTheme()

  return (
    <Box gap="xs" paddingBottom="xl">
      <Box gap="xxs" paddingX="md">
        <Text role="micro" color="textTertiary">
          {surface}
        </Text>
        <Text role="micro" color="textSecondary">
          {probe}
        </Text>
      </Box>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.borderSubtle,
          paddingTop: spacing.sm,
        }}
      >
        {children}
      </View>
    </Box>
  )
}

/**
 * El fondo de una dirección.
 *
 * Existe porque la dirección B corre sobre tema claro y el resto sobre oscuro:
 * sin un fondo propio, la viñeta hereda el del playground y se evalúa una
 * dirección que no es la que se propuso.
 */
export function DirectionCanvas({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  return (
    <View style={{ backgroundColor: theme.surface, paddingTop: spacing.md }}>
      {children}
    </View>
  )
}
