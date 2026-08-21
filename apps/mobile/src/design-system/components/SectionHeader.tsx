import { Text } from '../primitives/Text.tsx'
import { Box } from '../primitives/Box.tsx'

export interface SectionHeaderProps {
  title: string
  /** Aclaración breve debajo del título, cuando el nombre de la sección no alcanza. */
  hint?: string
  testID?: string
}

/**
 * Encabezado de una sección de pantalla.
 *
 * Existe por una sola regla: **`accessibilityRole="header"` no se puede
 * olvidar.** Configuración agrupa Cuenta / Preferencias / Notificaciones /
 * Privacidad y bloqueo / Datos y legal, y sin el rol de encabezado un lector
 * de pantalla los lee igual que cualquier otro texto — nada le dice a alguien
 * que navega por encabezados que ahí empieza una sección nueva.
 *
 * Antes de este componente, cada pantalla escribía `<Text role="label"
 * color="textSecondary">` a mano para lo mismo (`AccountScreen`,
 * `StudioScreen`), y ninguna de esas copias tenía el rol de encabezado. Es
 * exactamente el tipo de detalle que una revisión visual no encuentra.
 */
export function SectionHeader({ title, hint, testID }: SectionHeaderProps) {
  return (
    <Box gap="xxs" testID={testID}>
      <Text role="label" color="textSecondary" accessibilityRole="header">
        {title}
      </Text>
      {hint != null ? (
        <Text role="label" color="textTertiary">
          {hint}
        </Text>
      ) : null}
    </Box>
  )
}
