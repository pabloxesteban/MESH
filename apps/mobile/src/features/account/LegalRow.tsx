/**
 * Privacidad, términos y moderación, al pie de Perfil.
 *
 * Se dibuja solo lo que tiene URL. Ver `legal.ts`: hasta que los textos estén
 * publicados de verdad, un enlace muerto es peor que ninguno.
 */

import { Linking } from 'react-native'

import { Box, Button, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { legalLinks } from './legal.ts'

const FILAS: readonly {
  key: TranslationKey
  campo: keyof ReturnType<typeof legalLinks>
}[] = [
  { key: 'legal.privacy', campo: 'privacy' },
  { key: 'legal.terms', campo: 'terms' },
  { key: 'legal.moderation', campo: 'moderation' },
]

export function LegalRow() {
  const t = useT()
  const enlaces = legalLinks()

  const disponibles = FILAS.filter(({ campo }) => enlaces[campo] != null)
  if (disponibles.length === 0) return null

  return (
    <Box gap="xxs" testID="legal-row">
      {disponibles.map(({ key, campo }) => (
        <Button
          key={campo}
          label={t(key)}
          variant="ghost"
          size="sm"
          onPress={() => {
            void Linking.openURL(enlaces[campo] as string)
          }}
          testID={`legal-${campo}`}
        />
      ))}
      <Text role="label" color="textTertiary">
        {t('legal.note')}
      </Text>
    </Box>
  )
}
