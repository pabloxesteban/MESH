/**
 * Escribirle a un artista.
 *
 * El traspaso, no la conversación. MESH no tiene mensajería y no la va a tener
 * en V1: una bandeja de entrada obliga a moderar, a responder y a estar. Lo que
 * hace acá es armar un mensaje decente y abrir el canal que el artista publicó.
 *
 * Tres reglas:
 *
 * 1. **El mensaje se muestra y se puede editar antes de mandarlo.** No es una
 *    formalidad: es la última verificación de que dice lo que la persona quiere
 *    decir, con sus palabras.
 * 2. **Solo contiene lo que la persona escribió.** Ver el test golden de
 *    `packages/domain/src/contact/message.test.ts`.
 * 3. **Si no hay canal, el botón cambia; no se finge uno.** Un perfil sin
 *    contacto es un callejón, y decirlo es más útil que un botón que no hace
 *    nada.
 */

import * as Clipboard from 'expo-clipboard'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Linking, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { composeContactMessage, instagramUrl, whatsappUrl } from '@mesh/domain'

import {
  Box,
  Button,
  EmptyState,
  Input,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  Toast,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { fetchProfile } from '@/features/profile/queries.ts'
import { useI18n } from '@/i18n/I18nProvider.tsx'

export interface ContactScreenProps {
  slug: string
  onBack: () => void
  /** Se inyecta en los tests para no abrir nada de verdad. */
  openUrl?: (url: string) => Promise<unknown>
  copyToClipboard?: (text: string) => Promise<unknown>
}

export function ContactScreen({
  slug,
  onBack,
  openUrl = (url) => Linking.openURL(url),
  copyToClipboard = (text) => Clipboard.setStringAsync(text),
}: ContactScreenProps) {
  const { t } = useI18n()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const query = useQuery({
    queryKey: ['profile', slug],
    queryFn: () => fetchProfile(slug),
  })

  const professional = query.data?.professional ?? null

  useEffect(() => {
    if (professional == null) return
    // El mensaje se arma una sola vez. Si se recalculara en cada render,
    // pisaría lo que la persona acaba de escribir.
    setMessage(
      composeContactMessage({
        professionalName: professional.displayName,
        labels: {
          greeting: t('contact.message.greeting'),
          styles: t('contact.message.styles'),
          budget: t('contact.message.budget'),
          timing: t('contact.message.timing'),
          references: t('contact.message.references'),
          closing: t('contact.message.closing'),
        },
      }),
    )
    // Depende SOLO del id, a propósito. `t` y el objeto `professional` cambian
    // de identidad en cada render, y meterlos en las dependencias haría que el
    // efecto vuelva a correr y pise lo que la persona acaba de escribir.
  }, [professional?.id])

  const body = (() => {
    if (query.error != null) {
      return (
        <ErrorView
          error={query.error}
          onRetry={() => void query.refetch()}
          onBack={onBack}
          testID="contact-error"
        />
      )
    }

    if (query.isPending) {
      return (
        <Box gap="sm" testID="contact-loading">
          <Skeleton width="60%" height={28} />
          <Skeleton height={180} radius="md" />
        </Box>
      )
    }

    if (professional == null) {
      return (
        <ErrorView
          cause="notFound"
          onBack={onBack}
          testID="contact-not-found"
        />
      )
    }

    const hasWhatsapp = professional.whatsappE164 != null
    const hasInstagram = professional.instagramHandle != null

    if (!hasWhatsapp && !hasInstagram) {
      // No se finge un canal. Un perfil sin contacto es un callejón, y decirlo
      // es más útil que un botón que no hace nada.
      return (
        <EmptyState
          title={t('contact.noChannel.title')}
          body={t('contact.noChannel.body')}
          action={{ label: t('contact.noChannel.action'), onPress: onBack }}
          testID="contact-no-channel"
        />
      )
    }

    return (
      <Box gap="lg" testID="contact-content">
        <Box gap="xs">
          <Text role="titleLg">
            {t('contact.title', { nombre: professional.displayName })}
          </Text>
          <Text role="body" color="textSecondary">
            {t('contact.body')}
          </Text>
        </Box>

        <MessageField
          value={message}
          onChange={setMessage}
          label={t('contact.edit')}
        />

        <Box gap="xs">
          {hasWhatsapp ? (
            <Button
              label={t('contact.whatsapp')}
              onPress={() => {
                void openUrl(
                  whatsappUrl(professional.whatsappE164 as string, message),
                )
              }}
              fullWidth
              testID="contact-whatsapp"
            />
          ) : null}

          {hasInstagram ? (
            <Box gap="xxs">
              <Button
                label={t('contact.instagram')}
                variant={hasWhatsapp ? 'secondary' : 'primary'}
                onPress={() => {
                  // Se copia ANTES de abrir: si se abriera primero, la app
                  // pasa a segundo plano y el portapapeles puede no escribirse.
                  void copyToClipboard(message).then(() => setCopied(true))
                  void openUrl(
                    instagramUrl(professional.instagramHandle as string),
                  )
                }}
                fullWidth
                testID="contact-instagram"
              />
              {/* Se dice de antemano, no después: prometer que el mensaje va a
                  aparecer escrito sería mentir sobre lo que hace el botón. */}
              <Text role="micro" color="textTertiary">
                {t('contact.instagram.note')}
              </Text>
            </Box>
          ) : null}
        </Box>
      </Box>
    )
  })()

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.surface }}
        contentContainerStyle={{
          padding: SCREEN_GUTTER,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        testID="screen-contact"
      >
        {body}
      </ScrollView>

      {copied ? (
        <Toast
          message={t('contact.copied')}
          onDismiss={() => setCopied(false)}
          testID="contact-copied"
        />
      ) : null}
    </>
  )
}

function MessageField({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (next: string) => void
  label: string
}) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChange}
      multiline
      numberOfLines={10}
      testID="contact-message"
    />
  )
}
