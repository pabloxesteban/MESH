/**
 * El asistente que ayuda a decir qué querés tatuarte.
 *
 * Ver ADR-021. Tres decisiones de esta pantalla, y las tres son sobre honestidad
 * más que sobre diseño:
 *
 * · **Se ve que no es una persona.** Cada turno del asistente lleva su etiqueta
 *   arriba y un fondo distinto del de la persona. Un bot que se hace pasar por
 *   alguien es la forma más barata de que una app se vuelva insoportable, y acá
 *   además del otro lado hay tatuadores de verdad a un toque de distancia.
 * · **Lo primero que se dice es lo que NO hace.** Precio, disponibilidad y
 *   recomendaciones son las tres cosas que la gente le va a preguntar, y las
 *   tres son las que tiene prohibidas. Decirlo antes de la primera pregunta
 *   evita la frustración de descubrirlo a la tercera.
 * · **El hilo se puede tirar a la basura.** Sin confirmación con letra chica y
 *   sin "¿estás seguro?" tres veces: alguien que contó qué se quiere tatuar y
 *   por qué tiene que poder borrarlo con un toque.
 *
 * El botón de mandar tiene su equivalente por teclado y las opciones son
 * botones de verdad — el innegociable 6 vale también acá, aunque no haya gestos.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  HAIRLINE,
  Input,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { track } from '@/analytics/track.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { sendToAssistant, type AssistantBrief } from './assistant.ts'
import {
  deleteAssistantThread,
  fetchAssistantTurns,
  startAssistantThread,
  type AssistantTurn,
} from './queries.ts'
import { BriefReview } from './BriefReview.tsx'
import { ReportSheet } from '@/features/moderation/ReportSheet.tsx'
import { actionErrorKey } from '@/data/actionError.ts'

export interface AssistantScreenProps {
  userId: string
  onBack: () => void
  /** Cuando el pedido ya se publicó. Lleva a la lista de propuestas. */
  onPublished: (projectId: string) => void
}

export function AssistantScreen({
  userId,
  onBack,
  onPublished,
}: AssistantScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const client = useQueryClient()

  const [draft, setDraft] = useState('')
  const [options, setOptions] = useState<readonly string[]>([])
  const [brief, setBrief] = useState<AssistantBrief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [denunciando, setDenunciando] = useState(false)

  // El hilo se abre al entrar, una sola vez. Cada pedido arranca de cero: no hay
  // memoria entre hilos, que es lo que evita que esto se vuelva un perfil de
  // gustos guardado por la puerta de atrás.
  const hilo = useQuery({
    queryKey: ['assistant-thread', userId],
    queryFn: async () => {
      const id = await startAssistantThread(userId)
      track({ name: 'assistant_started', props: {} })
      return id
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
  const threadId = hilo.data ?? null

  const turns = useQuery({
    queryKey: ['assistant-turns', threadId],
    queryFn: () =>
      threadId == null
        ? Promise.resolve([] as readonly AssistantTurn[])
        : fetchAssistantTurns(threadId),
  })

  const mandar = useMutation({
    mutationFn: (message: string) => {
      if (threadId == null) throw new Error('todavía no hay hilo')
      return sendToAssistant({ threadId, message })
    },
    onSuccess: (reply) => {
      setDraft('')
      setError(null)
      void client.invalidateQueries({ queryKey: ['assistant-turns', threadId] })

      if (reply.kind === 'question') {
        setOptions(reply.options)
        return
      }

      setOptions([])
      setBrief(reply)
      track({
        name: 'assistant_brief_closed',
        props: {
          trait_count: reply.traits.length,
          has_style: reply.styleSlug != null,
          turn_count: (turns.data ?? []).length,
        },
      })
    },
    onError: (err) => setError(t(actionErrorKey(err, 'assistant.error'))),
  })

  const tirar = useMutation({
    mutationFn: () =>
      threadId == null ? Promise.resolve() : deleteAssistantThread(threadId),
    onSuccess: () => {
      track({
        name: 'assistant_thread_discarded',
        props: { turn_count: (turns.data ?? []).length },
      })
      onBack()
    },
  })

  // El último turno del asistente. Es lo que se denuncia: la respuesta concreta
  // que estuvo mal, no la conversación entera.
  const ultimoDelAsistente = [...(turns.data ?? [])]
    .reverse()
    .find((turn) => turn.role === 'assistant')

  if (brief != null && threadId != null) {
    return (
      <BriefReview
        userId={userId}
        threadId={threadId}
        brief={brief}
        onBack={() => setBrief(null)}
        onPublished={onPublished}
      />
    )
  }

  const cuerpo = (() => {
    if (hilo.error != null) {
      return (
        <ErrorView
          error={hilo.error}
          onRetry={() => void hilo.refetch()}
          onBack={onBack}
          testID="assistant-error"
        />
      )
    }

    if (hilo.isPending || turns.isPending) {
      return (
        <Box gap="sm" testID="assistant-loading">
          <Skeleton height={44} radius="md" />
          <Skeleton height={44} radius="md" />
        </Box>
      )
    }

    return (
      <Box gap="sm" testID="assistant-turns">
        <Opening />
        {(turns.data ?? []).map((turn) => (
          <Turn key={turn.id} turn={turn} />
        ))}
        {mandar.isPending ? (
          <Box testID="assistant-thinking">
            <Text role="micro" color="textTertiary">
              {t('assistant.thinking')}
            </Text>
          </Box>
        ) : null}

        {/* **La vía por la que nos enteramos de que el asistente rompió una de
            sus siete reglas.** Un precio, una disponibilidad, el nombre de un
            tatuador: el prompt las prohíbe, pero un prompt no es una garantía y
            esta ADR lo dice. Sin este botón, la única forma de enterarnos sería
            que alguien nos escriba. Ver ADR-021 y ADR-023. */}
        {ultimoDelAsistente != null && !denunciando ? (
          <Button
            label={t('report.assistant')}
            variant="ghost"
            size="sm"
            onPress={() => setDenunciando(true)}
            testID="assistant-report"
          />
        ) : null}

        {ultimoDelAsistente != null && denunciando ? (
          <ReportSheet
            userId={userId}
            target={{
              kind: 'assistant',
              assistantTurnId: ultimoDelAsistente.id,
            }}
            onDone={() => setDenunciando(false)}
            onCancel={() => setDenunciando(false)}
          />
        ) : null}
      </Box>
    )
  })()

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="screen-assistant"
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
            testID="assistant-back"
          />
          <Text role="titleLg">{t('assistant.title')}</Text>
        </Box>
        {cuerpo}
      </ScrollView>

      <View
        style={{
          padding: SCREEN_GUTTER,
          paddingBottom: insets.bottom + spacing.sm,
          gap: spacing.xs,
        }}
      >
        {options.length > 0 ? (
          <Box direction="row" gap="xxs" wrap testID="assistant-options">
            {options.map((option) => (
              <Button
                key={option}
                label={option}
                variant="secondary"
                size="sm"
                onPress={() => mandar.mutate(option)}
                testID={`assistant-option-${option}`}
              />
            ))}
          </Box>
        ) : null}

        {error != null ? (
          <Text
            role="micro"
            color="stateNegative"
            accessibilityRole="alert"
            testID="assistant-send-error"
          >
            {error}
          </Text>
        ) : null}

        <Input
          label={t('assistant.placeholder')}
          value={draft}
          onChangeText={(value) => {
            setDraft(value)
            setError(null)
          }}
          maxLength={2000}
          multiline
          testID="assistant-input"
        />
        <Button
          label={t('assistant.send')}
          disabled={draft.trim().length === 0 || threadId == null}
          loading={mandar.isPending}
          onPress={() => mandar.mutate(draft.trim())}
          fullWidth
          testID="assistant-send"
        />
        <Button
          label={t('assistant.discard')}
          variant="ghost"
          size="sm"
          loading={tirar.isPending}
          onPress={() => tirar.mutate()}
          testID="assistant-discard"
        />
      </View>
    </KeyboardAvoidingView>
  )
}

/**
 * Lo primero que se lee, y no lo escribe ningún modelo.
 *
 * Es texto de la app, con sus claves de i18n: qué hace el asistente y qué tiene
 * prohibido. Si esto lo generara el modelo, sería el modelo prometiendo cumplir
 * sus propias reglas, que no es una garantía de nada.
 */
function Opening() {
  const t = useT()
  const theme = useTheme()

  return (
    <View
      testID="assistant-opening"
      style={{
        borderRadius: radius.md,
        borderWidth: HAIRLINE,
        borderColor: theme.borderSubtle,
        padding: spacing.sm,
        gap: spacing.xxs,
      }}
    >
      <Text role="micro" color="textTertiary">
        {t('assistant.badge')}
      </Text>
      <Text role="body">{t('assistant.opening')}</Text>
      {/* `label` y no `micro`: el rol micro va SIEMPRE en mayúsculas, y tres
          renglones en mayúscula no se leen, se gritan. Micro es para un
          antetítulo de dos palabras, como la etiqueta de arriba. */}
      <Text role="label" color="textSecondary">
        {t('assistant.limits')}
      </Text>
    </View>
  )
}

function Turn({ turn }: { turn: AssistantTurn }) {
  const t = useT()
  const theme = useTheme()
  const mine = turn.role === 'person'

  return (
    <Box gap="xxs" testID={`assistant-turn-${turn.id}`}>
      {/* La etiqueta va SIEMPRE, no solo la primera vez: en un hilo largo, "de
          quién era esto" se pierde a los tres mensajes. */}
      {!mine ? (
        <Text role="micro" color="textTertiary">
          {t('assistant.badge')}
        </Text>
      ) : null}
      <View
        style={{
          alignSelf: mine ? 'flex-end' : 'flex-start',
          maxWidth: '85%',
          borderRadius: radius.md,
          padding: spacing.sm,
          backgroundColor: mine ? theme.accentFill : theme.surfaceRaised,
        }}
      >
        <Text role="body" color={mine ? 'accentContrast' : 'textPrimary'}>
          {turn.body}
        </Text>
      </View>
    </Box>
  )
}
