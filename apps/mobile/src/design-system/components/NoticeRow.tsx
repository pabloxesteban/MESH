import { ActivityIndicator } from 'react-native'

import { Box } from '../primitives/Box.tsx'
import { Text } from '../primitives/Text.tsx'
import { Pressable } from '../primitives/Pressable.tsx'
import { useTheme } from '../providers/ThemeProvider.tsx'
import { MIN_TOUCH_TARGET, spacing } from '../tokens/layout.ts'

export interface NoticeRowAction {
  label: string
  onPress: () => void
}

export interface NoticeRowProps {
  /** Una línea. El texto entra traducido: el design system no conoce el locale. */
  message: string
  action?: NoticeRowAction
  onDismiss: () => void
  /** Etiqueta del botón ✕, traducida por quien llama (p. ej. `t('notice.dismiss')`). */
  dismissAccessibilityLabel: string
  /** Mientras descartar dispara una mutación. El ✕ se reemplaza por un indicador. */
  dismissing?: boolean
  testID?: string
}

/**
 * Fila compacta de un aviso puntual, descartable.
 *
 * Una línea de texto, una acción opcional, y un botón de cerrar. Pensado para
 * apilarse — como mucho dos a la vez es una decisión de la pantalla que lo
 * usa, no de este componente, así que acá no se impone ningún límite.
 *
 * El botón de descartar es puro texto (`✕`), nunca solo un ícono sin
 * etiqueta: el área visual es chica a propósito, pero el área táctil llega a
 * 44pt igual que cualquier otro control.
 */
export function NoticeRow({
  message,
  action,
  onDismiss,
  dismissAccessibilityLabel,
  dismissing = false,
  testID,
}: NoticeRowProps) {
  const theme = useTheme()

  return (
    <Box
      direction="row"
      align="center"
      gap="xs"
      paddingX="sm"
      paddingY="xxs"
      radius="md"
      background="surfaceRaised"
      testID={testID}
    >
      <Box flex={1}>
        <Text role="body" numberOfLines={2}>
          {message}
        </Text>
      </Box>

      {action != null ? (
        <Pressable
          onPress={action.onPress}
          disabled={dismissing}
          accessibilityLabel={action.label}
          style={{
            minHeight: MIN_TOUCH_TARGET,
            paddingHorizontal: spacing.xxs,
            justifyContent: 'center',
          }}
        >
          <Text role="label" color="accent">
            {action.label}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onDismiss}
        disabled={dismissing}
        accessibilityLabel={dismissAccessibilityLabel}
        accessibilityState={{ disabled: dismissing, busy: dismissing }}
        style={{
          minWidth: MIN_TOUCH_TARGET,
          minHeight: MIN_TOUCH_TARGET,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {dismissing ? (
          <ActivityIndicator color={theme.textSecondary} />
        ) : (
          <Text role="label" color="textSecondary">
            ✕
          </Text>
        )}
      </Pressable>
    </Box>
  )
}
