/**
 * Dentro de "Todo" o de una colección: la grilla escalonada de dos columnas.
 *
 * Tres modos, la misma pantalla:
 *
 * 1. **Normal.** Corazón para desguardar (mismo patrón optimista que
 *    `useSaved`) + botón `+` que abre el sheet de pertenencia múltiple.
 * 2. **Adentro de una colección real.** Mismo grid, más un botón fantasma al
 *    pie para borrarla.
 * 3. **Modo agregar** (`addToCollectionId` presente). Se abre "Todo" con esto
 *    encendido desde "Agregar de lo que guardaste": el `+` de cada obra deja
 *    de abrir el sheet y en cambio suma/saca esa obra de la colección de
 *    destino directamente, con el mismo criterio de ADR-030 — insert y
 *    delete, nunca un booleano.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  EmptyState,
  MIN_TOUCH_TARGET,
  Pressable,
  SCREEN_GUTTER,
  Skeleton,
  StaggeredGrid,
  Text,
  Toast,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { FixtureBadge } from '@/components/FixtureBadge.tsx'
import { ratioOf } from '@/features/transitions/geometry.ts'
import { mediaUrl } from '@/features/discovery/queries.ts'
import { SaveHeart } from '@/features/saved/SaveHeart.tsx'
import { fetchSaved, type SavedPiece } from '@/features/saved/queries.ts'
import { useSaved } from '@/features/saved/useSaved.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { ALL_COLLECTION_ID } from './CollectionsScreen.tsx'
import { CollectionMembershipSheet } from './CollectionMembershipSheet.tsx'
import {
  addToCollection,
  deleteCollection,
  fetchCollectionItems,
  fetchMyCollections,
  removeFromCollection,
} from './queries.ts'

export interface CollectionDetailScreenProps {
  userId: string | null
  collectionId: string
  /** Si viene, esta pantalla es "Todo" en modo agregar hacia esta colección. */
  addToCollectionId?: string | null
  onBack: () => void
  onOpenArtist: (slug: string) => void
  onExplore: () => void
  onAddFromSaved: () => void
  onDeleted: () => void
}

const SKELETON_RATIOS = [0.8, 1.3, 1, 0.65, 1.15, 0.9]

export function CollectionDetailScreen({
  userId,
  collectionId,
  addToCollectionId = null,
  onBack,
  onOpenArtist,
  onExplore,
  onAddFromSaved,
  onDeleted,
}: CollectionDetailScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const client = useQueryClient()
  const saved = useSaved(userId)

  const isAll = collectionId === ALL_COLLECTION_ID

  const items = useQuery({
    queryKey: isAll ? ['saved'] : ['collections', 'items', collectionId],
    queryFn: () => (isAll ? fetchSaved() : fetchCollectionItems(collectionId)),
  })

  const list = useQuery({
    queryKey: ['collections', 'list'],
    queryFn: fetchMyCollections,
    enabled: !isAll,
  })
  const collectionSummary = list.data?.find((c) => c.id === collectionId) ?? null
  const targetSummary = addToCollectionId != null
    ? (list.data?.find((c) => c.id === addToCollectionId) ?? null)
    : null

  const [membershipTarget, setMembershipTarget] = useState<SavedPiece | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deletedToast, setDeletedToast] = useState<string | null>(null)

  const remove = useMutation({
    mutationFn: () => deleteCollection(collectionId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['collections'] })
      setDeletedToast(t('collections.delete.toast', { nombre: collectionSummary?.name ?? '' }))
    },
  })

  // --- membresía en modo agregar ---------------------------------------------
  const targetItems = useQuery({
    queryKey: ['collections', 'items', addToCollectionId],
    queryFn: () => fetchCollectionItems(addToCollectionId as string),
    enabled: addToCollectionId != null,
  })
  const [memberIds, setMemberIds] = useState<ReadonlySet<string> | null>(null)
  const currentMemberIds =
    memberIds ?? new Set((targetItems.data ?? []).map((piece) => piece.savedItemId))

  function toggleMembership(savedItemId: string): void {
    if (addToCollectionId == null) return
    const already = currentMemberIds.has(savedItemId)
    const next = new Set(currentMemberIds)
    if (already) next.delete(savedItemId)
    else next.add(savedItemId)
    setMemberIds(next)

    const write = already
      ? removeFromCollection(addToCollectionId, savedItemId)
      : addToCollection(addToCollectionId, savedItemId)
    void write
      .then(() => void client.invalidateQueries({ queryKey: ['collections'] }))
      .catch(() => {
        // Vuelta atrás: mismo criterio que `useSaved`.
        const rollback = new Set(currentMemberIds)
        setMemberIds(rollback)
      })
  }

  const title = isAll ? t('collections.all.name') : (collectionSummary?.name ?? '')

  const body = (() => {
    if (items.error != null) {
      return (
        <ErrorView
          error={items.error}
          onRetry={() => void items.refetch()}
          testID="collection-detail-error"
        />
      )
    }

    if (items.isPending) {
      return (
        <StaggeredGrid
          items={SKELETON_RATIOS.map((ratio, index) => ({ ratio, index }))}
          ratioOf={(entry) => entry.ratio}
          keyExtractor={(entry) => String(entry.index)}
          renderItem={(entry) => (
            <View style={{ aspectRatio: entry.ratio }}>
              <Skeleton height="100%" radius="md" />
            </View>
          )}
          testID="collection-detail-loading"
        />
      )
    }

    if (items.data.length === 0) {
      if (isAll) {
        return (
          <EmptyState
            title={t('saved.empty.title')}
            body={t('saved.empty.body')}
            action={{ label: t('saved.empty.action'), onPress: onExplore }}
            testID="collection-detail-empty"
          />
        )
      }
      return (
        <EmptyState
          title={t('collections.emptyCollection.title')}
          action={{
            label: t('collections.emptyCollection.addFromSaved'),
            onPress: onAddFromSaved,
          }}
          secondaryAction={{
            label: t('collections.emptyCollection.keepExploring'),
            onPress: onExplore,
          }}
          testID="collection-detail-empty"
        />
      )
    }

    return (
      <StaggeredGrid
        items={items.data}
        ratioOf={(piece) => ratioOf(piece.width, piece.height)}
        keyExtractor={(piece) => piece.savedItemId}
        renderItem={(piece) => (
          <CollectionGridItem
            piece={piece}
            onOpenArtist={onOpenArtist}
            addMode={addToCollectionId != null}
            isMember={addToCollectionId != null && currentMemberIds.has(piece.savedItemId)}
            targetName={targetSummary?.name ?? ''}
            onToggleMembership={() => toggleMembership(piece.savedItemId)}
            isSaved={saved.isSaved(piece.portfolioItemId)}
            onToggleSaved={() => saved.toggle(piece.portfolioItemId)}
            onOpenSheet={() => setMembershipTarget(piece)}
          />
        )}
        testID="collection-detail-grid"
      />
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
        testID="screen-collection-detail"
      >
        <Box gap="xs" paddingBottom="md">
          <Button
            label={t('common.back')}
            variant="ghost"
            size="sm"
            onPress={onBack}
            testID="collection-detail-back"
          />
          <Text role="titleLg">
            {addToCollectionId != null
              ? t('collections.addMode.title', { nombre: targetSummary?.name ?? '' })
              : title}
          </Text>
        </Box>

        {body}

        {addToCollectionId != null ? (
          <Box paddingTop="lg">
            <Button
              label={t('collections.addMode.done')}
              onPress={onBack}
              fullWidth
              testID="collection-detail-add-done"
            />
          </Box>
        ) : null}

        {!isAll && addToCollectionId == null ? (
          <Box paddingTop="lg">
            {confirmingDelete ? (
              <Box gap="sm" testID="collection-delete-confirm">
                <Text role="title">
                  {t('collections.delete.confirm.title', { nombre: collectionSummary?.name ?? '' })}
                </Text>
                <Text role="body" color="textSecondary">
                  {t('collections.delete.confirm.body')}
                </Text>
                <Box direction="row" gap="sm">
                  <Button
                    label={t('common.cancel')}
                    variant="secondary"
                    onPress={() => setConfirmingDelete(false)}
                    testID="collection-delete-cancel"
                  />
                  <Button
                    label={t('collections.delete.confirm.submit')}
                    variant="destructive"
                    loading={remove.isPending}
                    onPress={() => remove.mutate()}
                    testID="collection-delete-submit"
                  />
                </Box>
              </Box>
            ) : (
              <Button
                label={t('collections.delete.entry')}
                variant="ghost"
                size="sm"
                onPress={() => setConfirmingDelete(true)}
                testID="collection-delete-entry"
              />
            )}
          </Box>
        ) : null}
      </ScrollView>

      {membershipTarget != null ? (
        <CollectionMembershipSheet
          savedItemId={membershipTarget.savedItemId}
          onClose={() => setMembershipTarget(null)}
        />
      ) : null}

      {deletedToast != null ? (
        <Toast
          message={deletedToast}
          tone="positive"
          onDismiss={onDeleted}
          testID="collection-delete-toast"
        />
      ) : null}
    </View>
  )
}

function CollectionGridItem({
  piece,
  onOpenArtist,
  addMode,
  isMember,
  targetName,
  onToggleMembership,
  isSaved,
  onToggleSaved,
  onOpenSheet,
}: {
  piece: SavedPiece
  onOpenArtist: (slug: string) => void
  addMode: boolean
  isMember: boolean
  targetName: string
  onToggleMembership: () => void
  isSaved: boolean
  onToggleSaved: () => void
  onOpenSheet: () => void
}) {
  const t = useT()
  const theme = useTheme()
  const aspectRatio = ratioOf(piece.width, piece.height)

  return (
    <View>
      <Pressable
        onPress={() => onOpenArtist(piece.professionalSlug)}
        accessibilityRole="button"
        accessibilityLabel={t('artists.card.open', { nombre: piece.professionalName })}
        testID={`collection-item-${piece.savedItemId}`}
      >
        <Image
          source={mediaUrl(piece.mediaPath, 'sm')}
          placeholder={piece.blurhash != null ? { blurhash: piece.blurhash } : null}
          placeholderContentFit="cover"
          contentFit="cover"
          recyclingKey={piece.portfolioItemId}
          transition={0}
          accessible={false}
          style={{
            width: '100%',
            aspectRatio,
            borderRadius: radius.md,
            backgroundColor: theme.surfaceRaised,
          }}
        />
        {piece.isFixture ? (
          <View style={{ position: 'absolute', top: spacing.xxs, left: spacing.xxs }}>
            <FixtureBadge />
          </View>
        ) : null}
      </Pressable>

      <View style={{ position: 'absolute', right: spacing.xxs, bottom: spacing.xxs }}>
        {addMode ? (
          <Pressable
            onPress={onToggleMembership}
            accessibilityRole="button"
            accessibilityState={{ selected: isMember }}
            accessibilityLabel={t(
              isMember
                ? 'collections.addMode.itemA11y.remove'
                : 'collections.addMode.itemA11y.add',
              { nombre: targetName },
            )}
            testID={`collection-item-toggle-${piece.savedItemId}`}
            style={{
              minWidth: MIN_TOUCH_TARGET,
              minHeight: MIN_TOUCH_TARGET,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.full,
              backgroundColor: theme.overlayScrim,
            }}
          >
            <Text role="bodyLg" color={isMember ? 'accentFill' : 'overlayContent'}>
              {isMember ? '✓' : '+'}
            </Text>
          </Pressable>
        ) : (
          <SaveHeart isSaved={isSaved} onToggle={onToggleSaved} testID={`collection-heart-${piece.savedItemId}`} />
        )}
      </View>

      {!addMode ? (
        <View style={{ position: 'absolute', left: spacing.xxs, bottom: spacing.xxs }}>
          <Pressable
            onPress={onOpenSheet}
            accessibilityRole="button"
            accessibilityLabel={t('collections.item.addToCollection')}
            testID={`collection-item-add-${piece.savedItemId}`}
            style={{
              minWidth: MIN_TOUCH_TARGET,
              minHeight: MIN_TOUCH_TARGET,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.full,
              backgroundColor: theme.overlayScrim,
            }}
          >
            <Text role="bodyLg" color="overlayContent">
              +
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
