/**
 * Elegir y recortar la foto de perfil. Un solo paso, sin wizard.
 *
 * 1. Origen: galería o cámara. El permiso se pide recién al tocar cada botón —
 *    nunca antes, y nunca los dos juntos al entrar a la pantalla.
 * 2. Recorte circular con preview en vivo (`AvatarCropper`).
 * 3. Subir (`uploadAvatar.ts`), que además sincroniza la foto de la tarjeta de
 *    Inicio si esta persona tiene un perfil de artista propio.
 *
 * Se queda en esta pantalla durante la subida —mismo patrón que el resto de
 * los flujos de subida de la app (`AddPiece` en el Estudio, `LeaveReview`)— en
 * vez de navegar antes de saber si funcionó: así un error de red muestra
 * "Probá de nuevo" sin haber perdido el recorte, y el header de Perfil nunca
 * muestra una foto que después hay que deshacer.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  Toast,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import { actionErrorKey } from '@/data/actionError.ts'
import { fetchOwnedProfessional } from '@/features/artist/queries.ts'

import { AvatarCropper } from './AvatarCropper.tsx'
import { uploadAvatar, type AvatarCrop } from './uploadAvatar.ts'

type Step =
  | { readonly kind: 'choose' }
  | { readonly kind: 'cameraDenied' }
  | { readonly kind: 'cropping'; readonly uri: string; readonly width: number; readonly height: number }

export interface AvatarPickerScreenProps {
  userId: string
  onBack: () => void
  onDone: () => void
}

export function AvatarPickerScreen({
  userId,
  onBack,
  onDone,
}: AvatarPickerScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const client = useQueryClient()

  // Mismo `queryKey` que el Estudio y el header de Perfil: si ya se cargó en
  // esta sesión, esto no pide nada nuevo. `null` es una respuesta válida —
  // quien busca no tiene perfil de artista, y la foto solo se sincroniza con
  // `profiles`.
  const professional = useQuery({
    queryKey: ['studio', 'professional', userId],
    queryFn: () => fetchOwnedProfessional(userId),
  })
  const professionalId = professional.data?.id ?? null

  const [step, setStep] = useState<Step>({ kind: 'choose' })
  const [imageReady, setImageReady] = useState(false)
  const [crop, setCrop] = useState<AvatarCrop | null>(null)
  const [succeeded, setSucceeded] = useState(false)

  const upload = useMutation({
    mutationFn: async () => {
      if (step.kind !== 'cropping' || crop == null) {
        throw new Error('todavía no hay recorte')
      }
      return uploadAvatar(userId, step.uri, crop, { professionalId })
    },
    onSuccess: () => {
      // El caché pinta el recorte local en el mismo cuadro — no hace falta
      // esperar un round trip para ver el cambio en el header de Perfil.
      if (step.kind === 'cropping') {
        client.setQueryData(
          ['account'],
          (previous: Record<string, unknown> | undefined) =>
            previous == null ? previous : { ...previous, avatarUrl: step.uri },
        )
      }
      void client.invalidateQueries({ queryKey: ['account'] })
      void client.invalidateQueries({ queryKey: ['studio', 'professional'] })
      void client.invalidateQueries({ queryKey: ['account-notices'] })
      setSucceeded(true)
    },
  })

  async function fromGallery(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    })
    const asset = result.assets?.[0]
    if (result.canceled || asset == null) return
    setImageReady(false)
    setCrop(null)
    setStep({
      kind: 'cropping',
      uri: asset.uri,
      width: asset.width > 0 ? asset.width : 1200,
      height: asset.height > 0 ? asset.height : 1200,
    })
  }

  async function fromCamera(): Promise<void> {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      setStep({ kind: 'cameraDenied' })
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    })
    const asset = result.assets?.[0]
    if (result.canceled || asset == null) return
    setImageReady(false)
    setCrop(null)
    setStep({
      kind: 'cropping',
      uri: asset.uri,
      width: asset.width > 0 ? asset.width : 1200,
      height: asset.height > 0 ? asset.height : 1200,
    })
  }

  const body = (() => {
    if (step.kind === 'cameraDenied') {
      return (
        <Box gap="sm" testID="avatar-picker-camera-denied">
          <Text role="title">{t('avatarPicker.permission.denied.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('avatarPicker.permission.denied.body')}
          </Text>
          <Button
            label={t('avatarPicker.source.gallery')}
            onPress={() => void fromGallery()}
            fullWidth
            testID="avatar-picker-fallback-gallery"
          />
        </Box>
      )
    }

    if (step.kind === 'cropping') {
      return (
        <Box gap="md" align="center" testID="avatar-picker-cropping">
          {!imageReady ? (
            <Skeleton width={260} height={260} radius="full" />
          ) : null}
          <View style={{ display: imageReady ? 'flex' : 'none' }}>
            <AvatarCropper
              uri={step.uri}
              imageWidth={step.width}
              imageHeight={step.height}
              onCropChange={setCrop}
              onImageLoad={() => setImageReady(true)}
              testID="avatar-cropper"
            />
          </View>

          {upload.isError ? (
            <Text
              role="body"
              color="stateNegative"
              accessibilityRole="alert"
              testID="avatar-picker-upload-error"
            >
              {t(actionErrorKey(upload.error, 'avatarPicker.upload.error'))}
            </Text>
          ) : null}

          <Button
            label={t('avatarPicker.confirm')}
            disabled={crop == null || !imageReady}
            loading={upload.isPending}
            onPress={() => upload.mutate()}
            fullWidth
            testID="avatar-picker-confirm"
          />
        </Box>
      )
    }

    return (
      <Box gap="sm" testID="avatar-picker-choose">
        <Button
          label={t('avatarPicker.source.gallery')}
          onPress={() => void fromGallery()}
          fullWidth
          testID="avatar-picker-gallery"
        />
        <Button
          label={t('avatarPicker.source.camera')}
          variant="secondary"
          onPress={() => void fromCamera()}
          fullWidth
          testID="avatar-picker-camera"
        />
      </Box>
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
        testID="screen-avatar-picker"
      >
        <Box gap="lg">
          <Box gap="xs">
            <Button
              label={t('common.back')}
              variant="ghost"
              size="sm"
              onPress={onBack}
              testID="avatar-picker-back"
            />
            <Text role="titleLg">{t('avatarPicker.title')}</Text>
          </Box>
          {body}
        </Box>
      </ScrollView>
      {succeeded ? (
        <Toast
          message={t('avatarPicker.success')}
          tone="positive"
          onDismiss={onDone}
          durationMs={1200}
          testID="avatar-picker-toast"
        />
      ) : null}
    </View>
  )
}
