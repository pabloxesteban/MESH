import { Box } from '../primitives/Box.tsx'
import { Text } from '../primitives/Text.tsx'

export interface TagProps {
  label: string
  testID?: string
}

/**
 * Etiqueta de estilo. No es interactiva: para filtrar está `FilterChip`.
 *
 * El texto va en `micro`, que es mayúsculas con tracking. La etiqueta que
 * recibe ya viene traducida — los slugs de estilo nunca se muestran.
 */
export function Tag({ label, testID }: TagProps) {
  return (
    <Box
      paddingX="xs"
      paddingY="xxs"
      radius="sm"
      border="borderSubtle"
      testID={testID}
    >
      <Text role="micro" color="textSecondary">
        {label}
      </Text>
    </Box>
  )
}
