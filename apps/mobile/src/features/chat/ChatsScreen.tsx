/**
 * Los chats. La tercera pestaña de los dos lados.
 *
 * Es la misma pantalla para quien busca y para quien ofrece, pero **el vacío no
 * puede ser el mismo**, porque la regla de ADR-012 no es simétrica: quien busca
 * escribe primero, el artista no puede. Decirle a alguien que está buscando
 * "vos no podés escribir primero" sería mentirle sobre lo único que sí puede
 * hacer, y mandarlo al mazo de búsquedas lo llevaría a una pantalla que no es
 * suya.
 *
 * Por eso el vacío depende de `intent`:
 *
 * · **busca** — "todavía no escribiste a nadie", y la salida es ver artistas.
 * · **ofrece** — "todavía no te escribió nadie", y la salida es su propio mazo
 *   de búsquedas, no un botón de "escribir a alguien" que no existiría.
 *
 * La lista de quién se interesó en tu búsqueda es del lado de quien busca: un
 * artista no tiene búsquedas propias en las que alguien se interese.
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
import type { OnboardingIntent } from '@/features/account/queries.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { InterestList } from '../demand/InterestList.tsx'
import { NotificationList } from '../notifications/NotificationList.tsx'
import { ConversationList } from './ConversationList.tsx'
import { fetchConversations } from './queries.ts'

export interface ChatsScreenProps {
  /** Ausente sin sesión: entonces no hay hilo que abrir. */
  onOpenChat?: ((conversationId: string, title: string) => void) | undefined
  /**
   * Abre el perfil de un artista que se interesó en tu búsqueda.
   *
   * Esa lista vivía en Matches. Matches dejó de existir (ver D-010) y esto es
   * lo único que queda que sea una bandeja: si alguien levantó la mano por vos,
   * tenés que verlo en algún lado.
   */
  onOpenArtist?: ((slug: string) => void) | undefined
  /**
   * Lleva a Inicio: la grilla de artistas si busca, el mazo de búsquedas si
   * ofrece.
   *
   * Obligatorio: el vacío es el estado normal al principio, y un estado vacío
   * sin salida es un callejón.
   */
  onOpenHome: () => void
  /** A qué vino la persona. Decide qué dice el vacío. Ver ADR-014. */
  intent: OnboardingIntent
}

export function ChatsScreen({
  onOpenChat,
  onOpenArtist,
  onOpenHome,
  intent,
}: ChatsScreenProps) {
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

    const ofrece = intent === 'offering'

    return (
      <View style={{ flex: 1 }}>
        <EmptyState
          title={ofrece ? t('chat.empty.artist.title') : t('chat.empty.title')}
          body={ofrece ? t('chat.empty.artist.body') : t('chat.empty.body')}
          action={{
            label: ofrece
              ? t('chat.empty.artist.action')
              : t('chat.empty.action'),
            onPress: onOpenHome,
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
          {t('chat.title')}
        </Text>
      </Box>

      {/* Arriba de todo, porque son hechos que ya ocurrieron y no requieren
          nada de la persona. Si no pasó nada, la sección no existe: una bandeja
          vacía permanente enseña a mirar ahí todos los días, que es justo lo que
          el innegociable 3 prohíbe. Ver ADR-027. */}
      <NotificationList />

      {onOpenArtist != null ? (
        <Box paddingBottom="md">
          <InterestList onOpenProfile={onOpenArtist} />
        </Box>
      ) : null}

      {body}
    </ScrollView>
  )
}
