/**
 * Lo más guardado de la semana o del mes.
 *
 * Va arriba de Explorar y es una fila horizontal, no una grilla: es una
 * entrada, no un destino. La grilla de abajo sigue siendo el lugar donde se
 * busca de verdad.
 *
 * **Muestra el número, no el puesto.** "12 guardados" es un hecho medido;
 * "#1 de la semana" es la misma información convertida en competencia, y de ahí
 * salen las cosas que MESH no hace. Ver ADR-017.
 *
 * Si no hay nada guardado en la ventana, la fila **no se dibuja**. Un ranking
 * vacío con un cartel de "todavía no hay nada" ocupa lugar para no decir nada.
 */

import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'

import {
  Box,
  FilterChip,
  SCREEN_GUTTER,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { FixtureBadge } from '@/components/FixtureBadge.tsx'
import { mediaUrl } from '@/features/discovery/queries.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { Pressable } from '@/design-system/index.ts'
import { fetchTopSaved, type RankingWindow } from './ranking.ts'

/** Ancho de cada obra. Dos y media entran en una pantalla de 390. */
const PIECE_WIDTH = 132

export interface RankingRowProps {
  categorySlug: string
  onOpenArtist: (slug: string) => void
}

export function RankingRow({ categorySlug, onOpenArtist }: RankingRowProps) {
  const t = useT()
  const theme = useTheme()
  const [window, setWindow] = useState<RankingWindow>('week')

  const query = useQuery({
    queryKey: ['top-saved', categorySlug, window],
    queryFn: () => fetchTopSaved(categorySlug, window),
  })

  // Ni mientras carga ni si falla: es una sección de más, y una sección de más
  // que muestra un esqueleto o un error le roba la primera pantalla a la
  // grilla, que es lo que la persona vino a ver.
  if (query.data == null || query.data.length === 0) return null

  return (
    <Box gap="xs" testID="ranking-row">
      <Box paddingX="lg" gap="xxs">
        <Text role="titleLg">{t('ranking.title')}</Text>
        <Box direction="row" gap="xxs">
          <FilterChip
            label={t('ranking.week')}
            selected={window === 'week'}
            onToggle={() => setWindow('week')}
            testID="ranking-week"
          />
          <FilterChip
            label={t('ranking.month')}
            selected={window === 'month'}
            onToggle={() => setWindow('month')}
            testID="ranking-month"
          />
        </Box>
      </Box>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          gap: spacing.xxs,
        }}
      >
        {query.data.map((piece) => (
          <View key={piece.portfolioItemId} style={{ width: PIECE_WIDTH }}>
            <Pressable
              onPress={() => onOpenArtist(piece.professionalSlug)}
              accessibilityRole="button"
              accessibilityLabel={t('ranking.open', {
                nombre: piece.professionalName,
                n: String(piece.saves),
              })}
              testID={`ranking-piece-${piece.portfolioItemId}`}
            >
              <Image
                source={mediaUrl(piece.mediaPath, 'sm')}
                placeholder={
                  piece.blurhash != null ? { blurhash: piece.blurhash } : null
                }
                placeholderContentFit="cover"
                contentFit="cover"
                recyclingKey={piece.portfolioItemId}
                transition={0}
                accessible={false}
                style={{
                  width: PIECE_WIDTH,
                  aspectRatio: 4 / 5,
                  borderRadius: radius.md,
                  backgroundColor: theme.surfaceRaised,
                }}
              />
            </Pressable>
            <Box gap="xxs" paddingY="xxs">
              <Text role="label" numberOfLines={1}>
                {piece.professionalName}
              </Text>
              {/* El número, y nada más. Sin "#1", sin flecha de subida. */}
              <Text role="micro" color="textTertiary">
                {t('ranking.saves', { n: String(piece.saves) })}
              </Text>
              {piece.isFixture ? <FixtureBadge /> : null}
            </Box>
          </View>
        ))}
      </ScrollView>
    </Box>
  )
}
