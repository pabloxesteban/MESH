import { View } from 'react-native'

import { Text } from '../primitives/Text.tsx'
import { useTheme } from '../providers/ThemeProvider.tsx'
import { HAIRLINE, radius, spacing } from '../tokens/layout.ts'
import { styleColor } from '../tokens/style-colors.ts'

export interface TagProps {
  label: string
  /**
   * Slug del estilo, para colorear la etiqueta con su familia.
   *
   * **El color acá es información.** Un chip turquesa siempre es línea fina, uno
   * violeta siempre es blackwork. Sin slug la etiqueta queda neutra, que es lo
   * correcto para cualquier cosa que no sea un estilo.
   */
  styleSlug?: string | undefined
  /** Rellena el fondo con el color del estilo en vez de solo el borde. */
  filled?: boolean
  testID?: string
}

/**
 * Etiqueta de estilo. No es interactiva: para filtrar está `FilterChip`.
 *
 * El texto va en `micro`, que es mayúsculas con tracking. La etiqueta que
 * recibe ya viene traducida — los slugs de estilo nunca se muestran.
 *
 * **El color nunca es el único portador de significado.** La etiqueta dice qué
 * estilo es en palabras; el color solo hace que se reconozca de un vistazo
 * cuando ya se sabe leer. Alguien que no distingue los tonos pierde velocidad,
 * no información.
 */
export function Tag({ label, styleSlug, filled = false, testID }: TagProps) {
  const theme = useTheme()
  const color = styleSlug != null ? styleColor(styleSlug, theme) : null

  const background = filled && color != null ? color.vivid : 'transparent'
  const border =
    color != null ? (filled ? color.vivid : color.text) : theme.borderSubtle

  return (
    <View
      testID={testID}
      style={{
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xxs,
        borderRadius: radius.sm,
        borderWidth: HAIRLINE,
        borderColor: border,
        backgroundColor: background,
      }}
    >
      {/* `tint` y no `color`: el color de una familia de estilo no es un rol
          semántico del tema, así que no puede ser un token. */}
      <Text
        role="micro"
        color="textSecondary"
        {...(color != null
          ? { tint: filled ? color.onVivid : color.text }
          : {})}
      >
        {label}
      </Text>
    </View>
  )
}
