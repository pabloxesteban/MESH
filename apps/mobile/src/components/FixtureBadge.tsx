/**
 * "Esto es un registro de prueba."
 *
 * Antes esta garantía vivía en el nombre: los fixtures se llamaban
 * `[Fixture] Irezumi`. Era efectivo y se filtraba a todos lados — a las
 * capturas, al mensaje de contacto precargado, a los eventos de analytics.
 *
 * Ahora vive acá, y la regla es más estricta que antes: **toda superficie que
 * renderiza un fixture monta esta insignia.** El prefijo se podía borrar
 * editando un YAML; esta insignia la maneja `is_fixture`, que viene de la base
 * y que la carga a producción rechaza. Ver content-policy §4.
 *
 * No lleva `styleSlug`: no es un estilo, y no tiene que competir por el mismo
 * vocabulario visual que los estilos. Es advertencia, no clasificación.
 */

import { View } from 'react-native'

import {
  HAIRLINE,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

export interface FixtureBadgeProps {
  /** `full` para el perfil, donde hay lugar para la frase entera. */
  variant?: 'compact' | 'full'
  testID?: string
}

export function FixtureBadge({
  variant = 'compact',
  testID,
}: FixtureBadgeProps) {
  const theme = useTheme()
  const t = useT()

  return (
    <View
      testID={testID}
      // El lector de pantalla lo anuncia como un texto más. No es un control, y
      // marcarlo como alerta haría que se lea antes que el nombre del artista.
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xxs,
        borderRadius: radius.sm,
        borderWidth: HAIRLINE,
        borderColor: theme.stateWarning,
      }}
    >
      <Text role="micro" color="stateWarning">
        {variant === 'full' ? t('profile.fixture') : t('common.fixture')}
      </Text>
    </View>
  )
}
