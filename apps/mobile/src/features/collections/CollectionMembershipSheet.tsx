/**
 * "Agregar a colección": el checklist de pertenencia múltiple de una obra.
 *
 * Cada colección es una fila con casilla. Marcar inserta en `collection_items`,
 * desmarcar borra esa fila — nunca un booleano que se togglea (ADR-030). La
 * casilla de la colección desde la que se abrió este sheet ya viene marcada:
 * es el mismo estado que el resto, no un caso especial.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
} from 'react-native-reanimated'

import {
  Box,
  Button,
  HAIRLINE,
  MIN_TOUCH_TARGET,
  Pressable,
  Text,
  duration,
  easing,
  radius,
  spacing,
  spring,
  useMotion,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import {
  addToCollection,
  fetchCollectionsForItem,
  fetchMyCollections,
  removeFromCollection,
} from './queries.ts'

export interface CollectionMembershipSheetProps {
  savedItemId: string
  onClose: () => void
}

/**
 * No es un `Modal` de React Native — un panel fijo al pie de la pantalla sobre
 * un velo, mismo criterio visual que el resto de MESH. Tocar el velo o
 * "Listo" cierra igual: son dos caminos al mismo lugar, no dos acciones.
 */
export function CollectionMembershipSheet({
  savedItemId,
  onClose,
}: CollectionMembershipSheetProps) {
  const t = useT()
  const theme = useTheme()
  const client = useQueryClient()
  const { reduceMotion } = useMotion()

  // Mismo criterio que el mazo de descarte (`SwipeCard`): la salida es más
  // rápida que la entrada. El velo se funde parejo; el panel entra con
  // resorte desde abajo y sale con un fundido corto hacia el mismo lugar.
  const backdropTransition = reduceMotion
    ? {}
    : {
        entering: FadeIn.duration(duration.quick),
        exiting: FadeOut.duration(duration.quick),
      }

  const panelTransition = reduceMotion
    ? {}
    : {
        entering: FadeInDown.springify()
          .damping(spring.standard.damping)
          .stiffness(spring.standard.stiffness)
          .mass(spring.standard.mass),
        exiting: FadeOutDown.duration(duration.quick).easing(
          Easing.bezier(...easing.in),
        ),
      }

  const collections = useQuery({
    queryKey: ['collections', 'list'],
    queryFn: fetchMyCollections,
  })
  const membership = useQuery({
    queryKey: ['collections', 'for-item', savedItemId],
    queryFn: () => fetchCollectionsForItem(savedItemId),
  })

  const toggle = useMutation({
    mutationFn: async (input: { collectionId: string; checked: boolean }) => {
      if (input.checked) await addToCollection(input.collectionId, savedItemId)
      else await removeFromCollection(input.collectionId, savedItemId)
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['collections'] })
    },
  })

  const memberIds = membership.data ?? new Set<string>()

  return (
    <View
      style={StyleSheet.absoluteFill}
      testID="collection-membership-sheet"
    >
      <Animated.View style={{ flex: 1 }} {...backdropTransition}>
        <Pressable
          onPress={onClose}
          accessibilityLabel={t('common.close')}
          style={{ flex: 1, backgroundColor: theme.overlayScrim }}
          testID="collection-membership-backdrop"
        />
      </Animated.View>

      <Animated.View
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        {...panelTransition}
      >
        <Box
          background="surface"
          border="borderSubtle"
          radius="lg"
          padding="lg"
          gap="sm"
        >
          <Text role="title">{t('collections.membership.title')}</Text>

          {collections.isPending ? null : (collections.data ?? []).length === 0 ? (
            <Text role="body" color="textSecondary">
              {t('collections.membership.noneYet')}
            </Text>
          ) : (
            <Box gap="xxs">
              {(collections.data ?? []).map((collection) => {
                const checked = memberIds.has(collection.id)
                return (
                  <Pressable
                    key={collection.id}
                    onPress={() =>
                      toggle.mutate({ collectionId: collection.id, checked: !checked })
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={collection.name}
                    testID={`collection-membership-${collection.id}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.xs,
                      minHeight: MIN_TOUCH_TARGET,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: radius.sm,
                        borderWidth: HAIRLINE * 2,
                        borderColor: checked ? theme.accentFill : theme.borderStrong,
                        backgroundColor: checked ? theme.accentFill : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {checked ? (
                        <Text role="micro" color="accentContrast">
                          ✓
                        </Text>
                      ) : null}
                    </View>
                    <Text role="body">{collection.name}</Text>
                  </Pressable>
                )
              })}
            </Box>
          )}

          {collections.error != null || membership.error != null ? (
            <Text role="label" color="stateNegative" accessibilityRole="alert">
              {t('collections.membership.error')}
            </Text>
          ) : null}

          <Button
            label={t('collections.membership.done')}
            onPress={onClose}
            fullWidth
            testID="collection-membership-done"
          />
        </Box>
      </Animated.View>
    </View>
  )
}
