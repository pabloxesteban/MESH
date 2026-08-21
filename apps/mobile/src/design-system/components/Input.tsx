import { useId, useState } from 'react'
import { TextInput, type TextInputProps } from 'react-native'
import { Box } from '../primitives/Box.tsx'
import { Text } from '../primitives/Text.tsx'
import { useTheme } from '../providers/ThemeProvider.tsx'
import {
  HAIRLINE,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../tokens/layout.ts'
import { MAX_FONT_SCALE, textRoles } from '../tokens/typography.ts'

export interface InputProps extends Omit<
  TextInputProps,
  'style' | 'placeholderTextColor'
> {
  label: string
  /** Ayuda breve debajo del campo. Se oculta cuando hay error. */
  hint?: string
  /** Mensaje de error. Su presencia es lo que pone el campo en estado de error. */
  error?: string
  /** Muestra un contador cuando hay `maxLength`. */
  showCounter?: boolean
}

export function Input({
  label,
  hint,
  error,
  showCounter = false,
  maxLength,
  value,
  ...rest
}: InputProps) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)
  const errorId = useId()

  const hasError = error != null && error.length > 0
  const borderColor = hasError
    ? theme.stateNegative
    : focused
      ? theme.textPrimary
      : theme.borderSubtle

  return (
    <Box gap="xxs">
      {/* La etiqueta es un elemento propio, no un placeholder: un placeholder
          usado como etiqueta desaparece justo cuando la persona lo necesita. */}
      <Text role="label" color="textSecondary">
        {label}
      </Text>

      <TextInput
        {...rest}
        value={value}
        maxLength={maxLength}
        accessibilityLabel={label}
        // El error se anuncia junto al campo, no solo con el borde rojo: el
        // color nunca es el único portador de significado.
        accessibilityHint={hasError ? error : hint}
        aria-errormessage={hasError ? errorId : undefined}
        aria-invalid={hasError}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        placeholderTextColor={theme.textTertiary}
        onFocus={(event) => {
          setFocused(true)
          rest.onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          rest.onBlur?.(event)
        }}
        style={{
          ...textRoles.body,
          color: theme.textPrimary,
          // Un campo de varias líneas nace con lugar para cuatro. Con la altura
          // de uno solo, el texto que uno escribe se le va abajo del borde
          // mientras lo escribe — que es exactamente cuando hay que poder
          // releerlo. Cuatro líneas cubren un mensaje de chat o el resumen de
          // un pedido sin volverse una hoja en blanco.
          minHeight:
            rest.multiline === true
              ? textRoles.body.lineHeight * 4 + spacing.xs * 2
              : MIN_TOUCH_TARGET,
          // Android alinea el texto al medio de la caja si no se le dice.
          ...(rest.multiline === true
            ? { textAlignVertical: 'top' as const }
            : {}),
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderWidth: HAIRLINE,
          borderColor,
          borderRadius: radius.md,
          backgroundColor: theme.surfaceRaised,
        }}
      />

      <Box direction="row" justify="space-between" gap="xs">
        {hasError ? (
          <Text role="label" color="stateNegative" nativeID={errorId}>
            {error}
          </Text>
        ) : hint != null ? (
          <Text role="label" color="textTertiary">
            {hint}
          </Text>
        ) : (
          <Box />
        )}

        {showCounter && maxLength != null ? (
          <Text role="label" color="textTertiary">
            {`${value?.length ?? 0}/${maxLength}`}
          </Text>
        ) : null}
      </Box>
    </Box>
  )
}
