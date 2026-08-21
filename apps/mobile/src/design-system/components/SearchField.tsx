/**
 * El campo de búsqueda.
 *
 * Es la única excepción legítima a la regla de `Input`, y conviene decir por
 * qué existe en vez de reusar aquel. `Input` pone la etiqueta arriba a
 * propósito: un placeholder usado como etiqueta desaparece justo cuando la
 * persona lo necesita —cuando ya escribió y quiere releer qué le estaban
 * pidiendo—. En un campo de búsqueda eso no pasa: una vez que escribiste
 * "roig", "roig" se explica solo. No hay nada que recordar.
 *
 * Lo que **no** es opcional acá:
 *
 * 1. **La etiqueta accesible es obligatoria.** El placeholder es visual; quien
 *    usa un lector de pantalla necesita que el campo diga qué es.
 * 2. **Borrar es un botón de 44pt**, no una cruz de 12. Innegociable 6.
 * 3. **La cruz aparece solo cuando hay algo que borrar.** Un botón que no
 *    hace nada es ruido, y peor: se toca por error.
 *
 * Lo que el campo **no** hace: sugerir, autocompletar ni recordar búsquedas
 * anteriores. Un historial de búsquedas es un dato que hoy no necesitamos
 * guardar, y no se guarda.
 */

import { useState } from 'react'
import { TextInput, View, type TextInputProps } from 'react-native'

import { Pressable } from '../primitives/Pressable.tsx'
import { Text } from '../primitives/Text.tsx'
import { useTheme } from '../providers/ThemeProvider.tsx'
import {
  HAIRLINE,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../tokens/layout.ts'
import { MAX_FONT_SCALE, textRoles } from '../tokens/typography.ts'

export interface SearchFieldProps extends Omit<
  TextInputProps,
  'style' | 'placeholderTextColor' | 'value' | 'onChangeText'
> {
  value: string
  onChangeText: (text: string) => void
  /** Qué es este campo, para un lector de pantalla. Obligatorio. */
  accessibilityLabel: string
  /** Etiqueta del botón de borrar. Obligatoria por la misma razón. */
  clearLabel: string
  testID?: string
}

export function SearchField({
  value,
  onChangeText,
  accessibilityLabel,
  clearLabel,
  testID,
  ...rest
}: SearchFieldProps) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: HAIRLINE,
        borderColor: focused ? theme.textPrimary : theme.borderSubtle,
        borderRadius: radius.full,
        backgroundColor: theme.surfaceRaised,
        paddingLeft: spacing.sm,
        // Sin texto no hay cruz, así que la caja necesita su propio margen
        // derecho para que el cursor no quede pegado al borde.
        paddingRight: value.length > 0 ? 0 : spacing.sm,
      }}
    >
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
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
        testID={testID}
        style={{
          ...textRoles.body,
          flex: 1,
          color: theme.textPrimary,
          minHeight: MIN_TOUCH_TARGET,
          paddingVertical: spacing.xs,
        }}
      />

      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          testID={testID == null ? undefined : `${testID}-clear`}
          style={{
            minWidth: MIN_TOUCH_TARGET,
            minHeight: MIN_TOUCH_TARGET,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text role="body" color="textSecondary">
            ✕
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
