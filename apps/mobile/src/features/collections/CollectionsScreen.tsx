/**
 * Guardados → Colecciones: la grilla de nivel superior.
 *
 * "Todo" no es una fila de `collections` — es `fetchSaved()` de
 * `features/saved/queries.ts` sin ningún filtro encima, así que la tarjeta se
 * arma acá con lo que esa consulta ya trae. Ver ADR-030.
 *
 * **Estado vacío total.** Si no hay ni un solo guardado, no se dibuja NINGÚN
 * tile — ni "Todo", ni "+ Nueva colección". El corazón es la única puerta de
 * entrada a esta pantalla teniendo algo adentro.
 */

import { useQuery } from '@tanstack/react-query'
import { ScrollView, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  CollectionTile,
  EmptyState,
  HAIRLINE,
  Pressable,
  SCREEN_GUTTER,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { mediaUrl } from '@/features/discovery/queries.ts'
import { fetchSaved } from '@/features/saved/queries.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { fetchMyCollections } from './queries.ts'

/** El id que representa "Todo" en las rutas. Nunca una fila real. */
export const ALL_COLLECTION_ID = 'todo'

export interface CollectionsScreenProps {
  onBack: () => void
  onOpenCollection: (id: string) => void
  onNewCollection: () => void
  onExplore: () => void
}

export function CollectionsScreen({
  onBack,
  onOpenCollection,
  onNewCollection,
  onExplore,
}: CollectionsScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()

  const saved = useQuery({ queryKey: ['saved'], queryFn: fetchSaved })
  const collections = useQuery({
    queryKey: ['collections', 'list'],
    queryFn: fetchMyCollections,
    // Sin sentido pedir esto si no hay nada guardado: no puede haber
    // colecciones con contenido, y evita un round trip que no aporta nada al
    // estado vacío total.
    enabled: (saved.data?.length ?? 0) > 0,
  })

  const tileWidth = (width - SCREEN_GUTTER * 2 - spacing.sm) / 2

  const body = (() => {
    if (saved.error != null) {
      return (
        <ErrorView
          error={saved.error}
          onRetry={() => void saved.refetch()}
          testID="collections-error"
        />
      )
    }

    if (saved.isPending) {
      return (
        <Box direction="row" gap="sm" wrap testID="collections-loading">
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={{ width: tileWidth }}>
              <CollectionTile
                loading
                name=""
                countLabel=""
                thumbnails={[]}
                onPress={() => undefined}
                accessibilityLabel=""
              />
            </View>
          ))}
        </Box>
      )
    }

    if (saved.data.length === 0) {
      return (
        <EmptyState
          title={t('saved.empty.title')}
          body={t('saved.empty.body')}
          action={{ label: t('saved.empty.action'), onPress: onExplore }}
          testID="collections-empty"
        />
      )
    }

    if (collections.error != null) {
      return (
        <ErrorView
          error={collections.error}
          onRetry={() => void collections.refetch()}
          testID="collections-list-error"
        />
      )
    }

    const allCount = saved.data.length
    const allCountLabel =
      allCount === 1 ? t('collections.count.one') : t('collections.count', { n: String(allCount) })
    const allThumbnails = saved.data.slice(0, 4).map((piece) => mediaUrl(piece.mediaPath, 'sm'))

    return (
      <Box direction="row" gap="sm" wrap testID="collections-content">
        <View style={{ width: tileWidth }}>
          <CollectionTile
            name={t('collections.all.name')}
            countLabel={allCountLabel}
            thumbnails={allThumbnails}
            onPress={() => onOpenCollection(ALL_COLLECTION_ID)}
            accessibilityLabel={t('collections.tile.a11y', {
              nombre: t('collections.all.name'),
              cantidad: allCountLabel,
            })}
            testID="collection-tile-all"
          />
        </View>

        {collections.isPending
          ? [0, 1].map((index) => (
              <View key={index} style={{ width: tileWidth }}>
                <CollectionTile
                  loading
                  name=""
                  countLabel=""
                  thumbnails={[]}
                  onPress={() => undefined}
                  accessibilityLabel=""
                />
              </View>
            ))
          : (collections.data ?? []).map((collection) => {
              const countLabel =
                collection.itemCount === 1
                  ? t('collections.count.one')
                  : t('collections.count', { n: String(collection.itemCount) })
              return (
                <View key={collection.id} style={{ width: tileWidth }}>
                  <CollectionTile
                    name={collection.name}
                    countLabel={countLabel}
                    thumbnails={collection.coverMediaPaths.map((path) =>
                      mediaUrl(path, 'sm'),
                    )}
                    onPress={() => onOpenCollection(collection.id)}
                    accessibilityLabel={t('collections.tile.a11y', {
                      nombre: collection.name,
                      cantidad: countLabel,
                    })}
                    testID={`collection-tile-${collection.id}`}
                  />
                </View>
              )
            })}

        <View style={{ width: tileWidth }}>
          <NewCollectionTile onPress={onNewCollection} />
        </View>
      </Box>
    )
  })()

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <ScrollView
        contentContainerStyle={{
          padding: SCREEN_GUTTER,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        testID="screen-collections"
      >
        <Box gap="xs" paddingBottom="md">
          <Button
            label={t('common.back')}
            variant="ghost"
            size="sm"
            onPress={onBack}
            testID="collections-back"
          />
          <Text role="titleLg">{t('saved.title')}</Text>
        </Box>
        {body}
      </ScrollView>
    </View>
  )
}

/**
 * El tile especial de "+ Nueva colección": mismo alto aproximado que un
 * `CollectionTile`, sin mosaico — un cuadrado con el borde de una tarjeta
 * vacía en vez de portadas que todavía no existen.
 */
function NewCollectionTile({ onPress }: { onPress: () => void }) {
  const t = useT()
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={t('collections.new')}
      testID="collections-new"
      style={{
        aspectRatio: 1,
        borderRadius: radius.md,
        borderWidth: HAIRLINE,
        borderColor: theme.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surfaceRaised,
      }}
    >
      <Text role="body" color="accent" align="center">
        {t('collections.new')}
      </Text>
    </Pressable>
  )
}
