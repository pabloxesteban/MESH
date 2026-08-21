/**
 * La primera pregunta de todas: ¿sos mayor de 18?
 *
 * Ver ADR-025. Va antes que la de "ofrezco o busco" porque es la única con una
 * consecuencia física del otro lado: MESH arregla turnos, y un turno de tatuaje
 * para un menor sin consentimiento de sus padres es ilegal en Argentina.
 *
 * Tres decisiones, y las tres son sobre no pedir de más:
 *
 * · **No se pide la fecha de nacimiento.** Con ella tendríamos un dato sensible
 *   de cada persona para calcular un booleano que ya nos dieron.
 * · **Decir que no, no cierra la app.** Se puede seguir mirando obra; lo único
 *   que no se puede es cerrar un turno. Un muro completo empuja a mentir, que
 *   es el resultado exactamente contrario al buscado.
 * · **Decir que no no se guarda.** Un `null` es "no lo confirmó", y ahí caen
 *   por igual quien dijo que no y quien todavía no contestó. Guardar "declaró
 *   ser menor" sería armar un registro de menores de edad.
 */

import { useState } from 'react'
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

export interface AgeScreenProps {
  busy: boolean
  /** Declaró ser mayor. Se guarda con su fecha. */
  onConfirm: () => void
  /** Sigue sin declarar. No se guarda nada. */
  onSkip: () => void
}

export function AgeScreen({ busy, onConfirm, onSkip }: AgeScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [dijoQueNo, setDijoQueNo] = useState(false)

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
      testID="screen-onboarding-age"
    >
      <Box gap="xl">
        <Box gap="xs">
          <Text role="display">{t('age.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('age.body')}
          </Text>
        </Box>

        {dijoQueNo ? (
          <Box gap="sm" testID="age-minor">
            <Text role="body">{t('age.minor.body')}</Text>
            <Button
              label={t('age.minor.continue')}
              variant="secondary"
              onPress={onSkip}
              fullWidth
              testID="age-minor-continue"
            />
            <Button
              label={t('age.back')}
              variant="ghost"
              onPress={() => setDijoQueNo(false)}
              testID="age-back"
            />
          </Box>
        ) : (
          <Box gap="sm">
            <Button
              label={t('age.yes')}
              disabled={busy}
              loading={busy}
              onPress={onConfirm}
              fullWidth
              testID="age-yes"
            />
            <Button
              label={t('age.no')}
              variant="secondary"
              disabled={busy}
              onPress={() => setDijoQueNo(true)}
              fullWidth
              testID="age-no"
            />
          </Box>
        )}
      </Box>
    </View>
  )
}
