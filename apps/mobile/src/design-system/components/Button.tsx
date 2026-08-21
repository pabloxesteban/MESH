import { ActivityIndicator, View } from 'react-native'
import { Text } from '../primitives/Text.tsx'
import { Pressable } from '../primitives/Pressable.tsx'
import { useTheme } from '../providers/ThemeProvider.tsx'
import {
  HAIRLINE,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../tokens/layout.ts'
import type { HapticIntent } from '../tokens/haptics.ts'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  /** Mientras carga, el botón queda deshabilitado y anuncia el estado. */
  loading?: boolean
  hapticIntent?: HapticIntent
  accessibilityLabel?: string
  accessibilityHint?: string
  testID?: string
  fullWidth?: boolean
}

const HEIGHT: Record<ButtonSize, number> = {
  sm: MIN_TOUCH_TARGET,
  md: 48,
  lg: 56,
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  hapticIntent = 'none',
  accessibilityLabel,
  accessibilityHint,
  testID,
  fullWidth = false,
}: ButtonProps) {
  const theme = useTheme()

  // `primary` es el único con permiso de llevar `accentFill` como relleno
  // grande — el acento de ACCIÓN, que sigue limitado a uno por pantalla
  // incluso después de ADR-032 (que sí volvió recurrente al acento de
  // ESTADO: tab activo, chip seleccionado, foco de un campo). Ver
  // docs/design/visual-language.md §4.
  const palette = {
    primary: {
      background: theme.accentFill,
      text: 'accentContrast',
      border: null,
    },
    secondary: {
      background: 'transparent',
      text: 'textPrimary',
      border: theme.borderStrong,
    },
    ghost: { background: 'transparent', text: 'textSecondary', border: null },
    destructive: {
      background: 'transparent',
      text: 'stateNegative',
      border: theme.stateNegative,
    },
  } as const

  const style = palette[variant]
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hapticIntent={hapticIntent}
      // Compresión física solo en `primary` — ADR-031, segunda etapa. Sigue
      // siendo el único con relleno grande de acento (acento de ACCIÓN,
      // ADR-032), y este feedback tiene que reforzar esa regla, no volverse
      // un efecto genérico de cualquier botón.
      pressedScale={variant === 'primary'}
      accessibilityLabel={accessibilityLabel ?? label}
      {...(accessibilityHint != null ? { accessibilityHint } : {})}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={{
        minHeight: HEIGHT[size],
        paddingHorizontal: spacing.lg,
        borderRadius: radius.full,
        backgroundColor: style.background,
        ...(style.border != null && {
          borderWidth: HAIRLINE,
          borderColor: style.border,
        }),
        alignItems: 'center',
        justifyContent: 'center',
        ...(fullWidth && { alignSelf: 'stretch' }),
      }}
    >
      {/* El indicador reemplaza a la etiqueta sin cambiar el alto, así el
          layout no salta cuando arranca la carga.

          Sin etiqueta propia: `accessibilityState.busy` ya hace que el lector
          de pantalla anuncie "ocupado" en el idioma del sistema. Un string acá
          sería texto de cara al usuario fuera de i18n, y encima en un solo
          idioma. */}
      {loading ? (
        <View accessible={false}>
          <ActivityIndicator color={theme[style.text]} />
        </View>
      ) : (
        // `labelBold` (InstrumentSans-Bold) en `primary` — ADR-031. Desde
        // ADR-032 `labelBold` ya no es exclusivo de este botón (el tab
        // activo y el chip seleccionado también lo llevan, como acento de
        // ESTADO), pero acá sigue marcando el único acento de ACCIÓN de la
        // pantalla.
        <Text
          role={variant === 'primary' ? 'labelBold' : 'label'}
          color={style.text}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}
