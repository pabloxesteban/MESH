import { router } from 'expo-router'

import { Box, Button, Text } from '@/design-system/index.ts'
import { useSession } from '@/features/auth/SessionProvider.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'

/**
 * Inicio.
 *
 * Andamio de la Fase 6: existe para poder llegar a la cuenta y comprobar que
 * hay sesión desde el primer frame. El mazo de descubrimiento lo reemplaza en
 * la Fase 8.
 */
export default function HomeScreen() {
  const t = useT()
  const { isAnonymous, userId } = useSession()

  return (
    <Box padding="lg" gap="lg" testID="screen-home">
      <Text role="display">MESH</Text>

      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {isAnonymous
            ? t('auth.account.anonymous.title')
            : t('auth.account.title')}
        </Text>
        {/* El id de sesión se muestra solamente mientras esto es un andamio:
            confirma a simple vista que la sesión anónima arrancó. Se va con la
            pantalla, en la Fase 8. */}
        <Text role="micro" color="textTertiary">
          {userId ?? ''}
        </Text>
      </Box>

      <Box gap="xs">
        <Button
          label={t('auth.account.title')}
          onPress={() => router.push('/cuenta')}
          fullWidth
        />
        <Button
          label="Galería del design system"
          onPress={() => router.push('/galeria')}
          variant="ghost"
          fullWidth
        />
      </Box>
    </Box>
  )
}
