import { Pressable } from '../primitives/Pressable.tsx'
import { Text } from '../primitives/Text.tsx'
import { useTheme } from '../providers/ThemeProvider.tsx'
import {
  HAIRLINE,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../tokens/layout.ts'

export interface FilterChipProps {
  label: string
  selected: boolean
  onToggle: () => void
  disabled?: boolean
  testID?: string
}

/**
 * Chip de filtro seleccionable.
 *
 * La selección no se comunica solo con color: el chip seleccionado cambia el
 * fondo Y expone `accessibilityState.selected`, así que un lector de pantalla y
 * alguien que no distingue el contraste de fondo reciben la misma información.
 * El color nunca es el único portador de significado.
 */
export function FilterChip({
  label,
  selected,
  onToggle,
  disabled = false,
  testID,
}: FilterChipProps) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ selected, checked: selected, disabled }}
      accessibilityLabel={label}
      testID={testID}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        borderRadius: radius.full,
        borderWidth: HAIRLINE,
        borderColor: selected ? theme.textPrimary : theme.borderSubtle,
        backgroundColor: selected ? theme.textPrimary : 'transparent',
      }}
    >
      <Text role="label" color={selected ? 'textInverse' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  )
}
