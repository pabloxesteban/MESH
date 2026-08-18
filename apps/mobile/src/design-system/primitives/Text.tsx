import { Text as RNText, type TextProps as RNTextProps } from 'react-native'
import { useTheme } from '../providers/ThemeProvider.tsx'
import {
  MAX_FONT_SCALE,
  textRoles,
  type TextRole,
} from '../tokens/typography.ts'
import type { Theme } from '../tokens/theme.ts'

/** Tokens de color válidos para texto. */
export type TextColor = Extract<
  keyof Theme,
  | 'textPrimary'
  | 'textSecondary'
  | 'textTertiary'
  | 'textInverse'
  | 'accent'
  | 'accentContrast'
  | 'statePositive'
  | 'stateNegative'
  | 'stateWarning'
>

// Se omite `role` de las props de React Native: RN usa ese nombre para el rol
// ARIA, y acá significa rol tipográfico. Para accesibilidad está
// `accessibilityRole`, que es el que usa el resto del sistema.
export interface TextProps extends Omit<RNTextProps, 'style' | 'role'> {
  /**
   * Rol tipográfico. **No hay prop `fontSize`**: no se puede pedir un tamaño
   * que no exista en la escala. Sacar la escotilla de escape es más fuerte que
   * documentar que no se use. Ver ADR-008.
   */
  role?: TextRole
  color?: TextColor
  align?: 'left' | 'center' | 'right'
  /**
   * Color literal, para lo que NO es un token del tema.
   *
   * Existe por un solo motivo: los colores de familia de estilo
   * (`tokens/style-colors.ts`) dependen del estilo, no del rol semántico, así
   * que no pueden ser un `TextColor`. Pisa a `color` cuando está presente.
   *
   * **No es una escotilla para colores sueltos.** El lint sigue rechazando un
   * hex en cualquier archivo fuera del design system, así que lo único que
   * puede llegar acá es algo que ya salió de la paleta.
   */
  tint?: string | undefined
}

export function Text({
  role = 'body',
  color = 'textPrimary',
  align,
  tint,
  ...rest
}: TextProps) {
  const theme = useTheme()
  const style = textRoles[role]

  return (
    <RNText
      // La tipografía dinámica se respeta hasta el tamaño accesible más
      // grande. El texto envuelve; nunca se recorta.
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[
        style,
        { color: tint ?? theme[color] },
        align != null && { textAlign: align },
      ]}
    />
  )
}
