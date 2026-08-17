import { Box } from '../primitives/Box.tsx'
import { Text } from '../primitives/Text.tsx'
import { Button } from './Button.tsx'

/**
 * Causas de error que se le pueden mostrar a una persona.
 *
 * Es un conjunto cerrado a propósito. Los mensajes crudos de Supabase o
 * Postgres nunca llegan a la pantalla: filtran nombres de tablas y columnas, y
 * no le dicen nada útil a nadie. `data/errors.ts` mapea lo que venga a una de
 * estas.
 */
export type ErrorCause = 'offline' | 'server' | 'notFound' | 'permission'

const COPY: Record<ErrorCause, { title: string; body: string }> = {
  offline: {
    title: 'Sin conexión',
    body: 'Revisá tu conexión y volvé a intentar.',
  },
  server: {
    title: 'Algo se rompió de nuestro lado',
    body: 'No es tu conexión. Probá de nuevo en un momento.',
  },
  notFound: {
    title: 'No encontramos esto',
    body: 'Puede que ya no exista o que el enlace esté mal.',
  },
  permission: {
    title: 'No encontramos esto',
    body: 'Puede que ya no exista o que el enlace esté mal.',
  },
}

export interface ErrorStateProps {
  cause: ErrorCause
  /** Reintentar. Opcional solo para los casos donde no hay nada que reintentar. */
  onRetry?: () => void
  /** Salida alternativa cuando reintentar no aplica. */
  onBack?: () => void
  testID?: string
}

/**
 * Estado de error.
 *
 * `permission` y `notFound` comparten copy a propósito: decirle a alguien "no
 * tenés permiso" confirma que el recurso existe, y eso convierte un enlace en
 * una herramienta para sondear qué hay. RLS ya devuelve silencio; la pantalla
 * hace lo mismo. Ver docs/security/threat-model.md §T7.
 */
export function ErrorState({
  cause,
  onRetry,
  onBack,
  testID,
}: ErrorStateProps) {
  const copy = COPY[cause]

  return (
    <Box
      paddingX="lg"
      paddingY="xxl"
      gap="md"
      align="center"
      testID={testID}
      accessibilityRole="alert"
    >
      <Text role="title" align="center">
        {copy.title}
      </Text>
      <Text role="body" color="textSecondary" align="center">
        {copy.body}
      </Text>

      <Box gap="xs" align="center" paddingTop="xs">
        {onRetry != null ? (
          <Button label="Reintentar" onPress={onRetry} variant="primary" />
        ) : null}
        {onBack != null ? (
          <Button label="Volver" onPress={onBack} variant="ghost" />
        ) : null}
      </Box>
    </Box>
  )
}
