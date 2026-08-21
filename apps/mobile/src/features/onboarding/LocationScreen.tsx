/**
 * La ubicación, preguntada una sola vez.
 *
 * Es el patrón que usa cualquier app con GPS y el que MESH no tenía: hasta acá
 * la preferencia arrancaba en "mi ubicación" sin permiso concedido, y en Inicio
 * aparecía un cartel pidiéndolo **en cada sesión** hasta que alguien cediera.
 * Un pedido que vuelve es un pedido que se aprende a ignorar.
 *
 * Tres cosas que esta pantalla hace y el cartel no hacía:
 *
 * 1. **Pregunta con el contexto delante**, antes de que la lista exista, en vez
 *    de arriba de una lista ya ordenada de una manera que nadie eligió.
 * 2. **Ofrece las dos salidas con el mismo peso.** "Ahora no" no es un enlace
 *    chiquito abajo: es un botón, porque es una respuesta válida. Sin ubicación
 *    la app funciona entera — no se esconde a nadie, cambia el orden.
 * 3. **Respeta el "no".** Se marca que ya se preguntó y no se vuelve a
 *    preguntar nunca. Cambiar de idea se hace desde el encabezado de Inicio.
 *
 * Lo que **no** hace: prometer que va a ser mejor. No dice "para una mejor
 * experiencia" — dice qué cambia exactamente, que es el orden de la lista y los
 * kilómetros de cada tarjeta.
 */

import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  SCREEN_GUTTER,
  Text,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

export interface LocationScreenProps {
  busy: boolean
  /** Pide el permiso del sistema. */
  onAllow: () => void
  /** Sigue sin ubicación. Es una respuesta, no una postergación. */
  onSkip: () => void
}

export function LocationScreen({ busy, onAllow, onSkip }: LocationScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        padding: SCREEN_GUTTER,
        paddingTop: insets.top + spacing.xxl,
        paddingBottom: insets.bottom + spacing.lg,
        justifyContent: 'center',
      }}
      testID="screen-onboarding-location"
    >
      <Box gap="xl">
        <Box gap="xs">
          <Text role="display">{t('onboardingLocation.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('onboardingLocation.body')}
          </Text>
          <Text role="label" color="textTertiary">
            {t('onboardingLocation.privacy')}
          </Text>
        </Box>

        <Box gap="xs">
          <Button
            label={t('onboardingLocation.allow')}
            onPress={onAllow}
            loading={busy}
            fullWidth
            testID="onboarding-location-allow"
          />
          {/* Secundario por jerarquía, no por castigo: los dos son botones y
              los dos llevan a la app entera. */}
          <Button
            label={t('onboardingLocation.skip')}
            variant="secondary"
            onPress={onSkip}
            fullWidth
            testID="onboarding-location-skip"
          />
        </Box>
      </Box>
    </View>
  )
}
