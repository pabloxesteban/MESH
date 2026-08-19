/**
 * Selector de estilo, para reconocer y no para leer.
 *
 * Hay gente que sabe lo que quiere pero no sabe cómo se llama el estilo — así
 * que la pregunta no es "¿cuál es tu estilo?" sino "¿se parece a esto?". Cada
 * casillero es una foto real y ya publicada del catálogo (nunca inventada,
 * nunca inferida del lado de un modelo: viene de `get_style_examples`, la
 * pieza de mayor peso declarado para ese estilo). El nombre va abajo, chico,
 * como confirmación — no como la forma principal de elegir.
 *
 * La selección nunca depende solo del color: el casillero elegido suma un
 * borde de otro grosor Y una marca en la esquina, y expone
 * `accessibilityState.selected` para quien usa lector de pantalla.
 */

import { Image } from 'expo-image'
import { View } from 'react-native'

import {
  Box,
  Pressable,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { mediaUrl } from '../discovery/queries.ts'
import type { StyleExample } from './queries.ts'

const TILE_SIZE = 108

export interface StyleExampleGridProps {
  examples: readonly StyleExample[]
  selected: readonly string[]
  onToggle: (styleSlug: string) => void
}

export function StyleExampleGrid({
  examples,
  selected,
  onToggle,
}: StyleExampleGridProps) {
  const t = useT()
  const theme = useTheme()

  return (
    <Box direction="row" gap="sm" wrap>
      {examples.map((example) => {
        const isSelected = selected.includes(example.styleSlug)
        const label = t(`style.tattoo.${example.styleSlug}` as TranslationKey)

        return (
          <Pressable
            key={example.styleSlug}
            onPress={() => onToggle(example.styleSlug)}
            accessibilityRole="checkbox"
            accessibilityState={{ selected: isSelected, checked: isSelected }}
            accessibilityLabel={label}
            testID={`quick-search-style-${example.styleSlug}`}
          >
            <View
              style={{ width: TILE_SIZE, gap: spacing.xxs, alignItems: 'center' }}
            >
              <View
                style={{
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  borderRadius: radius.md,
                  borderWidth: isSelected ? 3 : 0,
                  borderColor: theme.accentFill,
                  overflow: 'hidden',
                  backgroundColor: theme.surfaceRaised,
                }}
              >
                <Image
                  source={mediaUrl(example.mediaPath, 'sm')}
                  contentFit="cover"
                  style={{ width: '100%', height: '100%' }}
                  accessible={false}
                />
                {isSelected ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: spacing.xxs,
                      right: spacing.xxs,
                      width: 24,
                      height: 24,
                      borderRadius: radius.full,
                      backgroundColor: theme.accentFill,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text role="label" color="accentContrast">
                      ✓
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                role="micro"
                color={isSelected ? 'textPrimary' : 'textSecondary'}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </Box>
  )
}
