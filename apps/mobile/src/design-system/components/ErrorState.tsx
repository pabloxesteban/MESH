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
 *
 * `permission` y `notFound` son causas distintas acá pero se les pasa el MISMO
 * texto desde arriba: decirle a alguien "no tenés permiso" confirma que el
 * recurso existe, y eso convierte un enlace en una herramienta para sondear qué
 * hay. RLS ya devuelve silencio; la pantalla hace lo mismo. Ver
 * docs/security/threat-model.md §T7.
 */
export type ErrorCause = 'offline' | 'server' | 'notFound' | 'permission'

export interface ErrorStateAction {
  label: string
  onPress: () => void
}

export interface ErrorStateProps {
  cause: ErrorCause
  /**
   * El texto entra por props y no vive acá: todo string de cara al usuario pasa
   * por i18n con es-AR como origen, y el design system no conoce el locale.
   * `components/ErrorView.tsx` es quien los traduce.
   */
  title: string
  body: string
  /** Reintentar. Opcional solo donde no hay nada que reintentar. */
  retry?: ErrorStateAction
  /** Salida alternativa cuando reintentar no aplica. */
  back?: ErrorStateAction
  testID?: string
}

/**
 * Estado de error.
 *
 * Nunca es un callejón: o hay reintentar, o hay volver. Un error sin salida
 * deja a la persona mirando una pantalla muerta.
 */
export function ErrorState({
  cause,
  title,
  body,
  retry,
  back,
  testID,
}: ErrorStateProps) {
  return (
    <Box
      paddingX="lg"
      paddingY="xxl"
      gap="md"
      align="center"
      testID={testID}
      accessibilityRole="alert"
      // El `cause` no cambia lo que se ve, pero sí lo que se puede afirmar en
      // un test sin depender del texto traducido.
      accessibilityValue={{ text: cause }}
    >
      <Text role="title" align="center">
        {title}
      </Text>
      <Text role="body" color="textSecondary" align="center">
        {body}
      </Text>

      <Box gap="xs" align="center" paddingTop="xs">
        {retry != null ? (
          <Button
            label={retry.label}
            onPress={retry.onPress}
            variant="primary"
          />
        ) : null}
        {back != null ? (
          <Button label={back.label} onPress={back.onPress} variant="ghost" />
        ) : null}
      </Box>
    </Box>
  )
}
