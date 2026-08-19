/**
 * Los hilos abiertos, arriba de los matches.
 *
 * Va en la misma pestaña que los matches y no en una propia: son las mismas
 * personas en dos momentos —a quién te recomendamos, y a quién ya le
 * escribiste— y separarlas en dos pestañas obliga a recordar en cuál estaba
 * cada una.
 *
 * Si no hay ninguna conversación no se muestra nada: un encabezado vacío
 * arriba de la lista de matches sería ruido permanente para alguien que
 * todavía no escribió a nadie.
 */

import { useQuery } from '@tanstack/react-query'
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

import { fetchConversations } from './queries.ts'

export function ConversationList({
  onOpen,
}: {
  onOpen: (conversationId: string, title: string) => void
}) {
  const t = useT()
  const theme = useTheme()

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  })

  const items = conversations.data ?? []
  if (items.length === 0) return null

  return (
    <Box gap="xs" testID="conversation-list">
      <Text role="label" color="textSecondary">
        {t('chat.title')}
      </Text>
      {items.map((conversation) => (
        <Pressable
          key={conversation.id}
          onPress={() => onOpen(conversation.id, conversation.professionalName)}
          accessibilityRole="button"
          accessibilityLabel={`${conversation.professionalName}${
            conversation.hasUnread ? `. ${t('chat.unread')}` : ''
          }`}
          testID={`conversation-${conversation.id}`}
          style={{
            borderRadius: radius.md,
            backgroundColor: theme.surfaceRaised,
            padding: spacing.sm,
          }}
        >
          <Box direction="row" align="center" gap="xs">
            <Box flex={1}>
              <Text role="title" numberOfLines={1}>
                {conversation.professionalName}
              </Text>
            </Box>
            {/* El no leído no es un número: contar mensajes pendientes es una
                cuenta que empuja a volver. Un punto dice lo mismo sin
                presionar. */}
            {conversation.hasUnread ? (
              <View
                accessible
                accessibilityLabel={t('chat.unread')}
                style={{
                  width: spacing.sm,
                  height: spacing.sm,
                  borderRadius: radius.full,
                  backgroundColor: theme.accentFill,
                }}
              />
            ) : null}
          </Box>
        </Pressable>
      ))}
    </Box>
  )
}
