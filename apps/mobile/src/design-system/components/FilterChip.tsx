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
 * ADR-032: la selección es un **acento de estado** — recurrente, sin tope de
 * cantidad por pantalla, porque marca qué está elegido y no compite con el
 * único CTA de relleno grande de la pantalla. El borde y la etiqueta pasan a
 * `accentFill`/`accent` en vez del `textPrimary`/borde neutro que usaba antes
 * de esta ADR.
 *
 * La selección no se comunica solo con color: el chip seleccionado cambia el
 * borde Y la etiqueta Y expone `accessibilityState.selected`, así que un
 * lector de pantalla y alguien que no distingue el contraste reciben la misma
 * información. El color nunca es el único portador de significado.
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
        borderColor: selected ? theme.accentFill : theme.borderSubtle,
        backgroundColor: 'transparent',
      }}
    >
      {/* labelBold cuando está seleccionado: el mismo peso que ya lleva el
          botón primario, reforzando el mismo lugar donde cambia el color en
          vez de vivir en un solo botón. ADR-032. */}
      <Text
        role={selected ? 'labelBold' : 'label'}
        color={selected ? 'accent' : 'textSecondary'}
      >
        {label}
      </Text>
    </Pressable>
  )
}
