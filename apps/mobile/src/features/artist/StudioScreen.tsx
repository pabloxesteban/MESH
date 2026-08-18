/**
 * El estudio: lo que ve un artista de su propio perfil.
 *
 * Es la única superficie de MESH donde alguien ESCRIBE en el catálogo. Todo lo
 * demás lee. Por eso el estado vacío no es decorativo: alguien que abre esto sin
 * haber reclamado un perfil tiene que entender en una línea qué le falta y de
 * dónde sale.
 *
 * Lo que este flujo NO hace: crear un perfil. MESH sigue siendo curado — el
 * perfil existe antes, lo armamos nosotros, y el código habilita a la persona a
 * mantenerlo. La diferencia con el seeder es quién opera, no quién decide.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  Input,
  SCREEN_GUTTER,
  Skeleton,
  Tag,
  Text,
  Toast,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { mediaUrl } from '@/features/discovery/queries.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import {
  addPiece,
  claimProfessional,
  fetchOwnedPieces,
  fetchOwnedProfessional,
  removePiece,
} from './queries.ts'
import { uploadPortfolioPiece } from './upload.ts'
import { MAX_STYLES_PER_PIECE } from './weights.ts'
import { StylePicker } from './StylePicker.tsx'

export interface StudioScreenProps {
  userId: string | null
  onBack: () => void
}

export function StudioScreen({ userId, onBack }: StudioScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const client = useQueryClient()

  const [code, setCode] = useState('')
  const [claimError, setClaimError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const profile = useQuery({
    queryKey: ['studio', 'professional'],
    queryFn: fetchOwnedProfessional,
  })

  const professional = profile.data ?? null

  const pieces = useQuery({
    queryKey: ['studio', 'pieces', professional?.id],
    queryFn: () => fetchOwnedPieces(professional?.id as string),
    enabled: professional != null,
  })

  const claim = useMutation({
    mutationFn: (value: string) => claimProfessional(value),
    onSuccess: () => {
      setClaimError(null)
      setCode('')
      void client.invalidateQueries({ queryKey: ['studio'] })
    },
    // El mensaje crudo de Postgres no se muestra: dice más de nuestro esquema
    // que de lo que la persona tiene que hacer.
    onError: () => setClaimError(t('studio.claim.invalid')),
  })

  const upload = useMutation({
    mutationFn: async (input: {
      uri: string
      styleSlugs: readonly string[]
      isFeatured: boolean
    }) => {
      if (professional == null || userId == null) return
      const media = await uploadPortfolioPiece(
        professional.slug,
        userId,
        input.uri,
      )
      await addPiece({
        professionalId: professional.id,
        mediaId: media.mediaId,
        styleSlugsInOrder: input.styleSlugs,
        isFeatured: input.isFeatured,
      })
    },
    onSuccess: () => {
      setUploadError(null)
      setToast(t('studio.upload.done'))
      void client.invalidateQueries({ queryKey: ['studio', 'pieces'] })
    },
    onError: () => setUploadError(t('studio.upload.failed')),
  })

  const borrar = useMutation({
    mutationFn: (id: string) => removePiece(id),
    onSuccess: () => {
      setToast(t('studio.piece.removed'))
      void client.invalidateQueries({ queryKey: ['studio', 'pieces'] })
    },
  })

  const body = (() => {
    if (profile.error != null) {
      return (
        <ErrorView
          error={profile.error}
          onRetry={() => void profile.refetch()}
          onBack={onBack}
          testID="studio-error"
        />
      )
    }

    if (profile.isPending) {
      return (
        <Box gap="sm" testID="studio-loading">
          <Skeleton width="60%" height={28} />
          <Skeleton height={140} radius="md" />
        </Box>
      )
    }

    if (professional == null) {
      return (
        <Box gap="md" testID="studio-claim">
          <Box gap="xs">
            <Text role="titleLg">{t('studio.claim.title')}</Text>
            <Text role="body" color="textSecondary">
              {t('studio.claim.body')}
            </Text>
          </Box>

          <Input
            label={t('studio.claim.label')}
            value={code}
            onChangeText={(value) => {
              // Se normaliza al escribir: el código vive en mayúsculas y nadie
              // debería tener que acordarse de eso.
              setCode(
                value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 8),
              )
              setClaimError(null)
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            {...(claimError != null ? { error: claimError } : {})}
            testID="studio-claim-code"
          />

          <Button
            label={t('studio.claim.submit')}
            disabled={code.length !== 8}
            loading={claim.isPending}
            onPress={() => claim.mutate(code)}
            fullWidth
            testID="studio-claim-submit"
          />
        </Box>
      )
    }

    return (
      <Box gap="lg" testID="studio-content">
        <Box gap="xxs">
          <Text role="micro" color="textSecondary">
            {t('studio.eyebrow')}
          </Text>
          <Text role="display" numberOfLines={2}>
            {professional.displayName}
          </Text>
          {!professional.isPublished ? (
            <Text role="micro" color="stateWarning">
              {t('studio.unpublished')}
            </Text>
          ) : null}
        </Box>

        <AddPiece
          busy={upload.isPending}
          onPick={(uri, styleSlugs, isFeatured) =>
            upload.mutate({ uri, styleSlugs, isFeatured })
          }
          {...(uploadError != null ? { error: uploadError } : {})}
        />

        {pieces.isPending ? (
          <Skeleton height={160} radius="md" />
        ) : (pieces.data ?? []).length === 0 ? (
          // No es `EmptyState`: ese componente exige una acción hacia adelante,
          // y acá la acción ya está montada JUSTO ARRIBA — el botón de subir.
          // Repetirla debajo sería dos botones para lo mismo a diez píxeles de
          // distancia.
          <Box gap="xxs" testID="studio-empty">
            <Text role="title">{t('studio.empty.title')}</Text>
            <Text role="body" color="textSecondary">
              {t('studio.empty.body')}
            </Text>
          </Box>
        ) : (
          <Box gap="sm" testID="studio-pieces">
            {(pieces.data ?? []).map((piece) => (
              <Box
                key={piece.id}
                direction="row"
                gap="sm"
                align="center"
                testID={`studio-piece-${piece.id}`}
              >
                <Image
                  source={mediaUrl(piece.mediaPath, 'sm')}
                  contentFit="cover"
                  style={{
                    width: 72,
                    height: 90,
                    borderRadius: radius.sm,
                    backgroundColor: theme.surfaceRaised,
                  }}
                  accessible={false}
                />
                <Box flex={1} gap="xxs">
                  <Box direction="row" gap="xxs" wrap>
                    {piece.styleSlugs.map((slug, index) => (
                      <Tag
                        key={slug}
                        label={t(`style.tattoo.${slug}` as TranslationKey)}
                        styleSlug={slug}
                        filled={index === 0}
                      />
                    ))}
                  </Box>
                  {piece.isFeatured ? (
                    <Text role="micro" color="textTertiary">
                      {t('studio.piece.featured')}
                    </Text>
                  ) : null}
                </Box>
                <Button
                  label={t('studio.piece.remove')}
                  variant="ghost"
                  size="sm"
                  onPress={() => borrar.mutate(piece.id)}
                  testID={`studio-remove-${piece.id}`}
                />
              </Box>
            ))}
          </Box>
        )}
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
        testID="screen-studio"
      >
        {body}
      </ScrollView>
      {toast != null ? (
        <Toast
          message={toast}
          tone="positive"
          onDismiss={() => setToast(null)}
          testID="studio-toast"
        />
      ) : null}
    </View>
  )
}

/**
 * Elegir una foto y etiquetarla.
 *
 * El orden de la interfaz es el orden de la decisión: primero los estilos,
 * después la foto. Al revés, la persona elige la imagen y queda esperando con la
 * pantalla a medias mientras piensa las etiquetas.
 */
function AddPiece({
  busy,
  error,
  onPick,
}: {
  busy: boolean
  error?: string
  onPick: (
    uri: string,
    styleSlugs: readonly string[],
    isFeatured: boolean,
  ) => void
}) {
  const t = useT()
  const [styleSlugs, setStyleSlugs] = useState<readonly string[]>([])
  const [isFeatured, setIsFeatured] = useState(false)

  return (
    <Box gap="sm" testID="studio-add">
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('studio.add.styles')}
        </Text>
        <Text role="micro" color="textTertiary">
          {t('studio.add.styles.hint')}
        </Text>
      </Box>

      <StylePicker
        selected={styleSlugs}
        max={MAX_STYLES_PER_PIECE}
        onChange={setStyleSlugs}
      />

      <Button
        label={
          isFeatured
            ? t('studio.add.featured.on')
            : t('studio.add.featured.off')
        }
        variant="secondary"
        onPress={() => setIsFeatured((previous) => !previous)}
        testID="studio-featured-toggle"
      />

      {error != null ? (
        <Text role="micro" color="stateNegative" testID="studio-upload-error">
          {error}
        </Text>
      ) : null}

      <Button
        label={t('studio.add.pick')}
        disabled={styleSlugs.length === 0}
        loading={busy}
        fullWidth
        testID="studio-pick"
        onPress={() => {
          void (async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              // Sin recorte forzado: encuadrar la obra de alguien por él es
              // decidir qué parte de su trabajo se ve.
              allowsEditing: false,
              // La calidad de acá no importa: `upload.ts` recodifica igual, y
              // esa recodificación es la que limpia el EXIF.
              quality: 1,
            })
            const uri = result.assets?.[0]?.uri
            if (result.canceled || uri == null) return
            onPick(uri, styleSlugs, isFeatured)
            setStyleSlugs([])
            setIsFeatured(false)
          })()
        }}
      />
    </Box>
  )
}
