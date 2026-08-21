/**
 * Nombrar una colección nueva.
 *
 * Un solo campo. Al confirmar, aterriza DENTRO de la colección recién creada
 * — no vuelve a la grilla — porque lo que sigue naturalmente a "creá esto" es
 * empezar a sumarle obra, no mirar una grilla con la colección vacía adentro.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  Input,
  SCREEN_GUTTER,
  Text,
  haptic,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { actionErrorKey } from '@/data/actionError.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { offerJustCreated } from './justCreated.ts'
import { createCollection } from './queries.ts'

const MAX_NAME = 40

export interface NewCollectionScreenProps {
  userId: string
  onCancel: () => void
  onCreated: (collectionId: string) => void
}

export function NewCollectionScreen({
  userId,
  onCancel,
  onCreated,
}: NewCollectionScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const client = useQueryClient()

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () => createCollection(userId, name.trim()),
    onSuccess: (id) => {
      // Confirmación de una decisión que la persona acaba de tomar — mismo
      // criterio e intención que usa `SaveHeart` al guardar. Antes de
      // `onCreated`: el háptico marca el momento en que la colección pasó a
      // existir, no el de la navegación que sigue.
      haptic('save')
      offerJustCreated(id)
      void client.invalidateQueries({ queryKey: ['collections'] })
      onCreated(id)
    },
    onError: (err) => setError(t(actionErrorKey(err, 'collections.new.error'))),
  })

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <ScrollView
        contentContainerStyle={{
          padding: SCREEN_GUTTER,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        testID="screen-new-collection"
      >
        <Box gap="lg">
          <Text role="titleLg">{t('collections.new.title')}</Text>

          <Input
            label={t('collections.new.name.label')}
            value={name}
            onChangeText={(value) => {
              setName(value)
              setError(null)
            }}
            maxLength={MAX_NAME}
            showCounter
            autoCapitalize="sentences"
            testID="new-collection-name"
          />

          {error != null ? (
            <Text role="body" color="stateNegative" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Button
            label={t('collections.new.create')}
            disabled={name.trim() === ''}
            loading={create.isPending}
            onPress={() => create.mutate()}
            fullWidth
            testID="new-collection-submit"
          />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            onPress={onCancel}
            testID="new-collection-cancel"
          />
        </Box>
      </ScrollView>
    </View>
  )
}
