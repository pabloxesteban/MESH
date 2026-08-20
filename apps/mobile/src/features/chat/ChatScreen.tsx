/**
 * Una conversación.
 *
 * Lo que MESH no hace acá, a propósito:
 *
 * · **No hay "escribiendo…" ni "visto".** Los dos convierten una conversación
 *   en una obligación de responder rápido. La persona del otro lado está
 *   tatuando, no esperando el teléfono.
 * · **No hay notificaciones que empujen a volver.** El no-leído se ve al
 *   entrar y nada más.
 * · **No se edita ni se borra un mensaje.** La base tampoco lo permite: lo
 *   dicho quedó dicho, y media conversación borrada le rompe el hilo al otro.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  Input,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'

import { AppointmentCard } from '@/features/scheduling/AppointmentCard.tsx'
import { ScheduleFromChat } from '@/features/scheduling/ScheduleFromChat.tsx'
import {
  fetchAppointments,
  fetchOwnProfessionalForConversation,
} from '@/features/scheduling/queries.ts'

import {
  fetchMessages,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
  type ChatMessage,
} from './queries.ts'

export interface ChatScreenProps {
  conversationId: string
  userId: string
  title: string
  onBack: () => void
}

export function ChatScreen({
  conversationId,
  userId,
  title,
  onBack,
}: ChatScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const client = useQueryClient()

  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const messages = useQuery({
    queryKey: ['chat', conversationId],
    queryFn: () => fetchMessages(conversationId),
  })

  // Los turnos de esta conversación. Los ven las dos partes: el que da el turno
  // y el que lo recibe miran lo mismo.
  const turnos = useQuery({
    queryKey: ['appointments'],
    queryFn: fetchAppointments,
  })
  const deEsteChat = (turnos.data ?? []).filter(
    (turno) => turno.conversationId === conversationId,
  )

  // Si quien mira es el artista de este hilo. Se pregunta acá y no se recibe
  // como prop: quien puede dar un turno es el dueño de la agenda, y eso lo dice
  // la fila del profesional. Una pantalla que lo reciba de afuera se equivoca
  // en cuanto alguien la use desde otra ruta. Ver ADR-018.
  const propio = useQuery({
    queryKey: ['conversation-owner', conversationId, userId],
    queryFn: () => fetchOwnProfessionalForConversation(conversationId, userId),
  })
  const ownProfessionalId = propio.data ?? null

  // El canal se abre al entrar y se cierra al salir. Sin el cleanup, cada
  // visita deja una suscripción viva y el mismo mensaje llega N veces.
  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, () => {
      void client.invalidateQueries({ queryKey: ['chat', conversationId] })
    })
    return unsubscribe
  }, [conversationId, client])

  // Marcar leído al abrir, no al salir: si la app se cierra de golpe, lo que
  // la persona ya vio no debería seguir contando como pendiente.
  useEffect(() => {
    void markConversationRead(conversationId)
      .then(() => client.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => undefined)
  }, [conversationId, client])

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(conversationId, userId, body),
    onSuccess: () => {
      setDraft('')
      setError(null)
      void client.invalidateQueries({ queryKey: ['chat', conversationId] })
      void client.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: () => setError(t('chat.error')),
  })

  const body = (() => {
    if (messages.error != null) {
      return (
        <ErrorView
          error={messages.error}
          onRetry={() => void messages.refetch()}
          onBack={onBack}
          testID="chat-error"
        />
      )
    }

    if (messages.isPending) {
      return (
        <Box gap="sm" testID="chat-loading">
          <Skeleton height={44} radius="md" />
          <Skeleton height={44} radius="md" />
        </Box>
      )
    }

    return (
      <Box gap="xs" testID="chat-messages">
        {(messages.data ?? []).map((message) => (
          <Bubble
            key={message.id}
            message={message}
            mine={message.senderUserId === userId}
          />
        ))}
      </Box>
    )
  })()

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="screen-chat"
    >
      <ScrollView
        contentContainerStyle={{
          padding: SCREEN_GUTTER,
          paddingTop: insets.top + spacing.md,
        }}
      >
        <Box paddingBottom="md" gap="xs">
          <Button
            label={t('common.back')}
            variant="ghost"
            size="sm"
            onPress={onBack}
            testID="chat-back"
          />
          <Text role="titleLg" numberOfLines={1}>
            {title}
          </Text>
        </Box>
        {body}

        {/* El turno, arriba del compositor y debajo de los mensajes: es el
            resultado de la charla, y su lugar es al final de ella. */}
        {deEsteChat.length > 0 ? (
          <Box paddingY="md" gap="xs">
            {deEsteChat.map((turno) => (
              <AppointmentCard
                key={turno.id}
                appointment={turno}
                testID={`appointment-${turno.id}`}
              />
            ))}
          </Box>
        ) : null}
      </ScrollView>

      <View
        style={{
          padding: SCREEN_GUTTER,
          paddingBottom: insets.bottom + spacing.sm,
          gap: spacing.xs,
        }}
      >
        {ownProfessionalId != null ? (
          <ScheduleFromChat
            conversationId={conversationId}
            professionalId={ownProfessionalId}
            onScheduled={() => setError(null)}
          />
        ) : null}

        {error != null ? (
          <Text role="micro" color="stateNegative" testID="chat-send-error">
            {error}
          </Text>
        ) : null}
        <Input
          label={t('chat.placeholder')}
          value={draft}
          onChangeText={(value) => {
            setDraft(value)
            setError(null)
          }}
          maxLength={2000}
          multiline
          testID="chat-input"
        />
        <Button
          label={t('chat.send')}
          disabled={draft.trim().length === 0}
          loading={send.isPending}
          onPress={() => send.mutate(draft)}
          fullWidth
          testID="chat-send"
        />
      </View>
    </KeyboardAvoidingView>
  )
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const theme = useTheme()

  return (
    <View
      testID={`chat-message-${message.id}`}
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        borderRadius: radius.md,
        padding: spacing.sm,
        backgroundColor: mine ? theme.accentFill : theme.surfaceRaised,
      }}
    >
      <Text role="body" color={mine ? 'accentContrast' : 'textPrimary'}>
        {message.body}
      </Text>
    </View>
  )
}
