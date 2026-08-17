import { Box } from '../primitives/Box.tsx'
import { Text } from '../primitives/Text.tsx'
import { Button } from './Button.tsx'

export interface EmptyStateAction {
  label: string
  onPress: () => void
}

export interface EmptyStateProps {
  /** Qué es cierto. Una frase, sin disculpas teatrales. */
  title: string
  /** Qué hacer después. */
  body?: string
  /** Acción principal. Requerida: un estado vacío sin salida es un callejón. */
  action: EmptyStateAction
  secondaryAction?: EmptyStateAction
  testID?: string
}

/**
 * Estado vacío.
 *
 * Dice qué es cierto y qué hacer después. Nunca se limita a pedir disculpas, y
 * nunca se rellena con contenido de mentira para que la pantalla se vea
 * poblada — una lista corta y honesta le gana a una rellenada.
 *
 * `action` es obligatoria a propósito: toda pantalla tiene una acción hacia
 * adelante desde todos sus estados, y hacerlo un tipo requerido es más fuerte
 * que documentarlo.
 */
export function EmptyState({
  title,
  body,
  action,
  secondaryAction,
  testID,
}: EmptyStateProps) {
  return (
    <Box
      paddingX="lg"
      paddingY="xxl"
      gap="md"
      align="center"
      testID={testID}
      accessibilityRole="summary"
    >
      <Text role="title" align="center">
        {title}
      </Text>

      {body != null ? (
        <Text role="body" color="textSecondary" align="center">
          {body}
        </Text>
      ) : null}

      <Box gap="xs" align="center" paddingTop="xs">
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="primary"
        />
        {secondaryAction != null ? (
          <Button
            label={secondaryAction.label}
            onPress={secondaryAction.onPress}
            variant="ghost"
          />
        ) : null}
      </Box>
    </Box>
  )
}
