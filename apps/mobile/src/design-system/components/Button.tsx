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

  // El acento aparece como máximo una vez por pantalla; `primary` es quien lo
  // usa. Ver docs/design/visual-language.md §4.
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
        <Text role="label" color={style.text}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}
