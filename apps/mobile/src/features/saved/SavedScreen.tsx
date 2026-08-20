/**
 * Lo que guardaste.
 *
 * Una grilla de las obras con corazón, ordenada por lo último que guardaste.
 * **Cada obra sigue llevando a la persona que la hizo**, igual que en Inicio y
 * en Explorar: una pantalla de imágenes sueltas de la que no se sale a nadie
 * sería un álbum, y MESH no es un álbum.
 *
 * Guardar es privado. El texto del estado vacío lo dice, porque es la primera
 * pregunta de cualquiera que va a guardar algo en una app donde también hay
 * gente del otro lado.
 */

import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { ScrollView, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  EmptyState,
  Pressable,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { FixtureBadge } from '@/components/FixtureBadge.tsx'
import { mediaUrl } from '@/features/discovery/queries.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { SaveHeart } from './SaveHeart.tsx'
import { fetchSaved } from './queries.ts'
import { useSaved } from './useSaved.ts'

export interface SavedScreenProps {
  userId: string | null
  onOpenArtist: (slug: string) => void
  onExplore: () => void
  onBack: () => void
}

export function SavedScreen({
  userId,
  onOpenArtist,
  onExplore,
  onBack,
}: SavedScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const saved = useSaved(userId)

  const query = useQuery({ queryKey: ['saved'], queryFn: fetchSaved })

  const body = (() => {
    if (query.error != null) {
      return (
        <ErrorView
          error={query.error}
          onRetry={() => void query.refetch()}
          testID="saved-error"
        />
      )
    }

    if (query.isPending) {
      return (
        <Box gap="sm" testID="saved-loading">
          <Skeleton height={180} radius="md" />
          <Skeleton height={180} radius="md" />
        </Box>
      )
    }

    // Lo que se desguarda desaparece al instante, sin esperar a refrescar: si
    // siguiera ahí después de vaciar el corazón, parecería que no se guardó el
    // cambio.
    const visibles = query.data.filter((piece) =>
      saved.isSaved(piece.portfolioItemId),
    )

    if (visibles.length === 0) {
      return (
        <EmptyState
          title={t('saved.empty.title')}
          body={t('saved.empty.body')}
          action={{ label: t('saved.empty.action'), onPress: onExplore }}
          testID="saved-empty"
        />
      )
    }

    return <Grid pieces={visibles} onOpenArtist={onOpenArtist} saved={saved} />
  })()

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <ScrollView
        contentContainerStyle={{
          padding: SCREEN_GUTTER,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        testID="screen-saved"
      >
        <Box gap="lg">
          <Box gap="xs">
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              testID="saved-back"
              style={{ alignSelf: 'flex-start', paddingVertical: spacing.xs }}
            >
              <Text role="label">{t('common.back')}</Text>
            </Pressable>
            <Text role="titleLg">{t('saved.title')}</Text>
          </Box>
          {body}
        </Box>
      </ScrollView>
    </View>
  )
}

function Grid({
  pieces,
  onOpenArtist,
  saved,
}: {
  pieces: readonly Awaited<ReturnType<typeof fetchSaved>>[number][]
  onOpenArtist: (slug: string) => void
  saved: ReturnType<typeof useSaved>
}) {
  const t = useT()
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const columnWidth = (width - SCREEN_GUTTER * 2 - spacing.xxs) / 2

  return (
    <Box direction="row" gap="xxs" wrap>
      {pieces.map((piece) => (
        <View key={piece.portfolioItemId} style={{ width: columnWidth, gap: spacing.xxs }}>
          <View>
            <Pressable
              onPress={() => onOpenArtist(piece.professionalSlug)}
              accessibilityRole="button"
              accessibilityLabel={t('artists.card.open', {
                nombre: piece.professionalName,
              })}
              testID={`saved-piece-${piece.portfolioItemId}`}
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
                  width: columnWidth,
                  aspectRatio: 1,
                  borderRadius: radius.md,
                  backgroundColor: theme.surfaceRaised,
                }}
              />
            </Pressable>
            <View
              style={{
                position: 'absolute',
                right: spacing.xxs,
                bottom: spacing.xxs,
              }}
            >
              <SaveHeart
                isSaved={saved.isSaved(piece.portfolioItemId)}
                onToggle={() => saved.toggle(piece.portfolioItemId)}
                testID={`saved-heart-${piece.portfolioItemId}`}
              />
            </View>
          </View>
          <Box direction="row" gap="xxs" align="center" wrap>
            <Text role="label" numberOfLines={1}>
              {piece.professionalName}
            </Text>
            {piece.isFixture ? <FixtureBadge /> : null}
          </Box>
        </View>
      ))}
    </Box>
  )
}
