/**
 * Los chats, para quien ofrece un servicio.
 *
 * Del lado de quien busca, los hilos viven arriba de los matches: son las
 * mismas personas en dos momentos. Del lado del artista no hay matches —MESH
 * no le recomienda tatuadores a un tatuador— así que la pestaña es esto y nada
 * más.
 *
 * El vacío es el estado normal al principio y por eso no se disculpa: dice de
 * dónde va a venir el primer mensaje. Un artista no puede escribir primero
 * (ver ADR-012), así que la acción hacia adelante es su propio mazo, no un
 * botón de "escribir a alguien" que no existiría.
 */

import { useQuery } from '@tanstack/react-query'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  EmptyState,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { ConversationList } from './ConversationList.tsx'
import { fetchConversations } from './queries.ts'

export interface ChatsScreenProps {
  /** Ausente sin sesión: entonces no hay hilo que abrir. */
  onOpenChat?: ((conversationId: string, title: string) => void) | undefined
  /**
   * Lleva al mazo de búsquedas.
   *
   * Obligatorio: el vacío es el estado normal al principio, y un estado vacío
   * sin salida es un callejón.
   */
  onOpenDeck: () => void
}

export function ChatsScreen({ onOpenChat, onOpenDeck }: ChatsScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  // La misma clave que usa `ConversationList`: React Query la comparte, así que
  // esto no es un segundo pedido — es saber si hay algo antes de decidir entre
  // la lista y el vacío.
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  })

  const hasThreads = (conversations.data ?? []).length > 0

  const body = (() => {
    if (conversations.isPending) {
      return (
        <Box gap="xs" testID="chats-loading">
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
        </Box>
      )
    }

    if (hasThreads && onOpenChat != null) {
      return <ConversationList onOpen={onOpenChat} />
    }

    return (
      <View style={{ flex: 1 }}>
        <EmptyState
          title={t('chat.empty.artist.title')}
          body={t('chat.empty.artist.body')}
          action={{
            label: t('chat.empty.artist.action'),
            onPress: onOpenDeck,
          }}
          testID="chats-empty"
        />
      </View>
    )
  })()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingHorizontal: SCREEN_GUTTER,
        flexGrow: 1,
      }}
      testID="screen-chats"
    >
      <Box paddingY="sm">
        <Text role="label" color="textSecondary">
          {t('matches.title')}
        </Text>
      </Box>

      {body}
    </ScrollView>
  )
}
