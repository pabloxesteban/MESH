/**
 * Dejar una reseña, desde el turno que la habilita.
 *
 * Vive pegada al turno y no en una pantalla aparte, por el mismo motivo por el
 * que el turno vive en el chat: el contexto es la charla y la fecha. Una
 * pantalla de "mis reseñas pendientes" obligaría a acordarse de con quién fue.
 *
 * **Las estrellas son lo único obligatorio.** El comentario y la foto suman, y
 * la foto suma más que todo lo demás —es el tatuaje ya hecho, y es lo más
 * difícil de falsificar— pero pedirlos obliga a inventar: un campo obligatorio
 * se llena con "todo bien".
 *
 * Lo que la pantalla dice en voz alta antes de que alguien suba una foto: **se
 * publica**. El bucket es de lectura pública y la foto va a estar en el perfil
 * del artista. No se puede descubrir después.
 *
 * Ver ADR-019.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'

import { Box, Button, Input, Text, radius } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { Stars } from './Stars.tsx'
import { createReview } from './queries.ts'
import { uploadReviewPhoto } from './upload.ts'
import { actionErrorKey } from '@/data/actionError.ts'

/** Igual que el check de la tabla. Un texto más largo es una carta. */
const MAX_BODY = 1000

export interface LeaveReviewProps {
  appointmentId: string
  professionalId: string
  userId: string
  onDone: () => void
  onCancel: () => void
}

export function LeaveReview({
  appointmentId,
  professionalId,
  userId,
  onDone,
  onCancel,
}: LeaveReviewProps) {
  const t = useT()
  const client = useQueryClient()

  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [foto, setFoto] = useState<{ uri: string; mediaId: string } | null>(
    null,
  )
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enviar = useMutation({
    mutationFn: () =>
      createReview({
        appointmentId,
        professionalId,
        userId,
        rating,
        body: body.trim() === '' ? null : body.trim(),
        mediaId: foto?.mediaId ?? null,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['reviews'] })
      void client.invalidateQueries({ queryKey: ['reviewable'] })
      onDone()
    },
    onError: (err) => setError(t(actionErrorKey(err, 'reviews.error.send'))),
  })

  const elegirFoto = async () => {
    setError(null)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // Sin recorte forzado: encuadrar el tatuaje de alguien por él es decidir
      // qué parte se ve.
      allowsEditing: false,
      quality: 1,
    })
    if (result.canceled || result.assets[0] == null) return

    setSubiendo(true)
    try {
      // Se sube en el momento y no al enviar: si falla, falla acá, donde la
      // persona todavía tiene el dedo en la pantalla y puede reintentar.
      const subida = await uploadReviewPhoto(userId, result.assets[0].uri)
      setFoto({ uri: result.assets[0].uri, mediaId: subida.mediaId })
    } catch {
      setError(t('reviews.error.photo'))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <Box gap="sm" testID="leave-review">
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('reviews.leave.title')}
        </Text>
        <Text role="label" color="textTertiary">
          {t('reviews.leave.hint')}
        </Text>
      </Box>

      <Stars value={rating} onChange={setRating} testID="review-stars" />

      <Input
        label={t('reviews.leave.body')}
        value={body}
        onChangeText={(value) => {
          setBody(value)
          setError(null)
        }}
        maxLength={MAX_BODY}
        multiline
        testID="review-body"
      />

      {foto != null ? (
        <Box gap="xxs">
          <Image
            source={{ uri: foto.uri }}
            style={{ width: '100%', height: 200, borderRadius: radius.md }}
            contentFit="cover"
            accessibilityLabel={t('reviews.leave.photo.attached')}
          />
          <Button
            label={t('reviews.leave.photo.remove')}
            variant="ghost"
            size="sm"
            onPress={() => setFoto(null)}
            testID="review-photo-remove"
          />
        </Box>
      ) : (
        <Box gap="xxs">
          <Button
            label={t('reviews.leave.photo')}
            variant="secondary"
            size="sm"
            loading={subiendo}
            onPress={() => void elegirFoto()}
            testID="review-photo"
          />
          {/* Antes de subir, no después: una foto publicada no se despublica
              de la memoria de quien ya la vio. */}
          <Text role="label" color="textTertiary">
            {t('reviews.leave.photo.public')}
          </Text>
        </Box>
      )}

      {error != null ? (
        <Text role="body" color="stateNegative" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Box direction="row" gap="xs">
        <Button
          label={t('reviews.leave.submit')}
          // Sin estrellas no hay reseña: es lo único que se promedia, y una
          // reseña de cero estrellas no es "mala", es vacía.
          disabled={rating === 0}
          loading={enviar.isPending}
          onPress={() => enviar.mutate()}
          testID="review-submit"
        />
        <Button
          label={t('common.cancel')}
          variant="ghost"
          onPress={onCancel}
          testID="review-cancel"
        />
      </Box>
    </Box>
  )
}
