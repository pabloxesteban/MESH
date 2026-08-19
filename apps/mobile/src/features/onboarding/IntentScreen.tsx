/**
 * La primera pregunta: ¿venís a ofrecer, o a buscar?
 *
 * Aparece una sola vez, apenas hay sesión y todavía no hay respuesta. Es la
 * única pregunta del onboarding — no hay tour, no hay carrusel de bienvenida,
 * no hay formulario. Dos botones grandes y listo.
 *
 * **No es un rol excluyente.** Elegir "ofrezco" no te saca de poder buscar, y
 * al revés: lo único que decide es qué pantalla se abre primero y si mostramos
 * el acceso al estudio. Ver el comentario de `profiles.onboarding_intent`.
 *
 * Elegir "ofrezco" tampoco te da de alta como profesional: te lleva a canjear
 * el código que MESH te entregó. El catálogo sigue siendo curado.
 */

import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Pressable,
  SCREEN_GUTTER,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import type { OnboardingIntent } from '../account/queries.ts'

export interface IntentScreenProps {
  busy: boolean
  onChoose: (intent: OnboardingIntent) => void
}

export function IntentScreen({ busy, onChoose }: IntentScreenProps) {
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
      testID="screen-onboarding-intent"
    >
      <Box gap="xl">
        <Box gap="xs">
          <Text role="display">{t('onboarding.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('onboarding.body')}
          </Text>
        </Box>

        <Box gap="sm">
          <IntentCard
            title={t('onboarding.looking.title')}
            body={t('onboarding.looking.body')}
            disabled={busy}
            onPress={() => onChoose('looking')}
            testID="onboarding-looking"
          />
          <IntentCard
            title={t('onboarding.offering.title')}
            body={t('onboarding.offering.body')}
            disabled={busy}
            onPress={() => onChoose('offering')}
            testID="onboarding-offering"
          />
        </Box>
      </Box>
    </View>
  )
}

function IntentCard({
  title,
  body,
  disabled,
  onPress,
  testID,
}: {
  title: string
  body: string
  disabled: boolean
  onPress: () => void
  testID: string
}) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      testID={testID}
      style={{
        borderRadius: radius.md,
        backgroundColor: theme.surfaceRaised,
        padding: spacing.md,
        gap: spacing.xxs,
      }}
    >
      <Text role="title">{title}</Text>
      <Text role="body" color="textSecondary">
        {body}
      </Text>
    </Pressable>
  )
}
