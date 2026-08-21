/**
 * El estudio: lo que ve un artista de su propio perfil.
 *
 * Es la única superficie de MESH donde alguien ESCRIBE en el catálogo. Todo lo
 * demás lee. Por eso el estado vacío no es decorativo: alguien que abre esto sin
 * perfil tiene que entender en una línea qué le falta y de dónde sale.
 *
 * Hay dos caminos hasta tener un perfil, y el orden en pantalla dice cuál es el
 * normal: **crear el tuyo**, arriba, y canjear un código abajo para quien ya
 * tiene un perfil que armamos nosotros. Antes solo existía el segundo, y eso
 * hacía imposible recorrer el producto entero sin que alguien preparara una
 * fila con la service-role key. Ver ADR-013.
 */

import type { GeoCoordinates } from '@mesh/domain'
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

import { StudioSaves } from '@/features/saved/StudioSaves.tsx'
import { AvailabilityEditor } from '@/features/scheduling/AvailabilityEditor.tsx'
import { Agenda } from '@/features/scheduling/Agenda.tsx'
import { fetchReplyHabit } from '@/features/profile/queries.ts'
import type { TranslationKey } from '@/i18n/index.ts'

import { readDeviceGps } from './gps.ts'
import {
  addPiece,
  claimProfessional,
  createOwnProfessional,
  fetchOwnedPieces,
  fetchOwnedProfessional,
  removePiece,
  setOwnStyles,
  setStudioLocation,
} from './queries.ts'
import { uploadPortfolioPiece } from './upload.ts'
import { MAX_STYLES_PER_PIECE } from './weights.ts'
import { MAX_OWN_STYLES, StylePicker } from './StylePicker.tsx'
import { actionErrorKey } from '@/data/actionError.ts'

/** Coordenadas leídas del GPS, todavía sin publicar. */
interface PendingLocation {
  readonly coordinates: GeoCoordinates
  readonly neighborhoodSlug: string | null
}

export interface StudioScreenProps {
  userId: string | null
  onBack: () => void
  /**
   * Abrir el chat del que salió un turno de la agenda.
   *
   * Opcional para que el preview y los tests puedan montar la pantalla sin
   * navegación; sin esto, cada turno se ve pero no lleva a ningún lado.
   */
  onOpenChat?:
    | ((conversationId: string, counterpartName: string | null) => void)
    | undefined
}

export function StudioScreen({
  userId,
  onBack,
  onOpenChat,
}: StudioScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const client = useQueryClient()

  const [code, setCode] = useState('')
  const [claimError, setClaimError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pendingLocation, setPendingLocation] =
    useState<PendingLocation | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locatingDevice, setLocatingDevice] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [stylesError, setStylesError] = useState<string | null>(null)

  // Sin `enabled`: una consulta apagada se queda en `isPending` para siempre y
  // la pantalla mostraría el esqueleto sin fin. Quien no entró todavía no tiene
  // estudio, que es exactamente `null`, y `null` ya tiene su pantalla.
  const profile = useQuery({
    queryKey: ['studio', 'professional', userId],
    queryFn: () => (userId == null ? null : fetchOwnedProfessional(userId)),
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
    //
    // Y sin señal **no** se dice "ese código no sirve": el código sirve, lo que
    // falta es conexión, y decirle a alguien que su código es inválido cuando
    // no lo es es inventar. Es el peor de los trece casos que arregló
    // `actionErrorKey`, y por eso está anotado.
    onError: (err) =>
      setClaimError(t(actionErrorKey(err, 'studio.claim.invalid'))),
  })

  const create = useMutation({
    mutationFn: (input: {
      displayName: string
      instagram: string
      whatsapp: string
    }) =>
      createOwnProfessional({
        displayName: input.displayName,
        ...(input.instagram !== '' ? { instagram: input.instagram } : {}),
        ...(input.whatsapp !== '' ? { whatsapp: input.whatsapp } : {}),
      }),
    onSuccess: () => {
      setCreateError(null)
      void client.invalidateQueries({ queryKey: ['studio'] })
    },
    onError: (err) =>
      setCreateError(t(actionErrorKey(err, 'studio.create.failed'))),
  })

  const styles = useMutation({
    mutationFn: (slugs: readonly string[]) => setOwnStyles(slugs),
    onSuccess: () => {
      setStylesError(null)
      setToast(t('studio.styles.saved'))
      void client.invalidateQueries({ queryKey: ['studio', 'professional'] })
    },
    onError: (err) =>
      setStylesError(t(actionErrorKey(err, 'studio.styles.failed'))),
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
    onError: (err) =>
      setUploadError(t(actionErrorKey(err, 'studio.upload.failed'))),
  })

  const saveLocation = useMutation({
    mutationFn: (pending: PendingLocation) =>
      setStudioLocation(pending.coordinates, pending.neighborhoodSlug),
    onSuccess: () => {
      setPendingLocation(null)
      setLocationError(null)
      setToast(t('studio.location.set'))
      void client.invalidateQueries({ queryKey: ['studio', 'professional'] })
    },
    onError: (err) =>
      setLocationError(t(actionErrorKey(err, 'studio.location.error.save'))),
  })

  async function requestDeviceLocation(): Promise<void> {
    setLocationError(null)
    setLocatingDevice(true)
    try {
      const reading = await readDeviceGps()
      if (!reading.granted || reading.coordinates == null) {
        setLocationError(t('studio.location.error.permission'))
        return
      }
      setPendingLocation({
        coordinates: reading.coordinates,
        neighborhoodSlug: reading.neighborhoodSlug,
      })
    } catch {
      setLocationError(t('studio.location.error.unavailable'))
    } finally {
      setLocatingDevice(false)
    }
  }

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
        <Box gap="xl" testID="studio-signup">
          <CreateProfile
            busy={create.isPending}
            error={createError}
            onCreate={(input) => create.mutate(input)}
            onEdit={() => setCreateError(null)}
          />

          <Box gap="sm" testID="studio-claim">
            <Box gap="xxs">
              <Text role="label" color="textSecondary">
                {t('studio.claim.title')}
              </Text>
              <Text role="label" color="textTertiary">
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
              variant="secondary"
              disabled={code.length !== 8}
              loading={claim.isPending}
              onPress={() => claim.mutate(code)}
              fullWidth
              testID="studio-claim-submit"
            />
          </Box>
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
            <Text role="label" color="stateWarning">
              {t('studio.unpublished')}
            </Text>
          ) : null}
        </Box>

        {/* Primero la semana: es lo que un artista abre el Estudio para ver.
            Todo lo demás —estilos, ubicación, obra— se toca cada tanto; esto
            cambia todos los días. Enmienda a ADR-018. */}
        <Agenda {...(onOpenChat != null ? { onOpenChat } : {})} />

        {/* Arriba de todo lo editable: es lo único de esta pantalla que cambia
            sin que el artista haga nada, así que es lo que vino a mirar. */}
        {userId != null ? <StudioSaves userId={userId} /> : null}

        {/* Lo mismo que ve cualquiera en su perfil, y por eso está acá: un
            indicador público sobre una persona que esa persona no puede ver es
            una calificación a sus espaldas. Ver ADR-022. */}
        <OwnReplyHabit professionalId={professional.id} />

        {/* El horario va con el resto de lo que el artista configura sobre sí
            mismo. Ver ADR-018. */}
        <AvailabilityEditor professionalId={professional.id} />

        <OwnStyles
          saved={professional.styleSlugs}
          saving={styles.isPending}
          error={stylesError}
          onSave={(slugs) => styles.mutate(slugs)}
        />

        <StudioLocation
          hasSavedLocation={professional.studioCoordinates != null}
          pendingLocation={pendingLocation}
          busy={locatingDevice}
          saving={saveLocation.isPending}
          error={locationError}
          onRequestLocation={() => void requestDeviceLocation()}
          onConfirm={(pending) => saveLocation.mutate(pending)}
          onCancel={() => setPendingLocation(null)}
        />

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
 * Ubicación real del estudio. Dos pasos siempre, nunca uno: el GPS del
 * teléfono se lee al tocar el botón, pero no se publica hasta que la persona
 * confirma que ESA es la ubicación que quiere mostrar — así el consentimiento
 * que describe la migración (`set_studio_location`) también existe en la
 * pantalla, no solo en la base.
 */
function StudioLocation({
  hasSavedLocation,
  pendingLocation,
  busy,
  saving,
  error,
  onRequestLocation,
  onConfirm,
  onCancel,
}: {
  hasSavedLocation: boolean
  pendingLocation: PendingLocation | null
  busy: boolean
  saving: boolean
  error: string | null
  onRequestLocation: () => void
  onConfirm: (pending: PendingLocation) => void
  onCancel: () => void
}) {
  const t = useT()

  if (pendingLocation != null) {
    return (
      <Box gap="sm" testID="studio-location-confirm">
        <Box gap="xxs">
          <Text role="title">{t('studio.location.confirm.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('studio.location.confirm.body')}
          </Text>
        </Box>
        <Box direction="row" gap="sm">
          <Button
            label={t('studio.location.confirm.cancel')}
            variant="secondary"
            onPress={onCancel}
            testID="studio-location-cancel"
          />
          <Button
            label={t('studio.location.confirm.submit')}
            loading={saving}
            onPress={() => onConfirm(pendingLocation)}
            testID="studio-location-confirm-submit"
          />
        </Box>
      </Box>
    )
  }

  return (
    <Box gap="sm" testID="studio-location">
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('studio.location.title')}
        </Text>
        <Text role="label" color="textTertiary">
          {t('studio.location.body')}
        </Text>
        {hasSavedLocation ? (
          <Text role="micro" color="statePositive">
            {t('studio.location.set')}
          </Text>
        ) : null}
      </Box>

      {error != null ? (
        <Text role="micro" color="stateNegative" testID="studio-location-error">
          {error}
        </Text>
      ) : null}

      <Button
        label={t(
          hasSavedLocation
            ? 'studio.location.button.update'
            : 'studio.location.button',
        )}
        variant="secondary"
        loading={busy}
        onPress={onRequestLocation}
        testID="studio-location-request"
      />
    </Box>
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
        <Text role="label" color="textTertiary">
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

/**
 * Crear el perfil propio: nombre y por dónde te escriben.
 *
 * Tres campos y ni uno más. Bio, precios, disponibilidad y barrio se cargan
 * después, desde el perfil ya creado — pedirlos acá convierte "quiero mostrar
 * mi trabajo" en un formulario, y el trabajo todavía no se subió.
 *
 * El contacto no es opcional aunque los dos campos lo parezcan: la base tiene
 * una restricción (`professionals_published_is_contactable`) que impide
 * publicar un perfil al que no se le puede escribir. Un perfil publicado sin
 * contacto es un callejón sin salida para quien lo encuentra.
 */
function CreateProfile({
  busy,
  error,
  onCreate,
  onEdit,
}: {
  busy: boolean
  error: string | null
  onCreate: (input: {
    displayName: string
    instagram: string
    whatsapp: string
  }) => void
  onEdit: () => void
}) {
  const t = useT()
  const [displayName, setDisplayName] = useState('')
  const [instagram, setInstagram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const hasContact = instagram.trim() !== '' || whatsapp.trim() !== ''
  const canSubmit = displayName.trim() !== '' && hasContact

  function edit<T>(set: (value: T) => void): (value: T) => void {
    return (value) => {
      set(value)
      onEdit()
    }
  }

  return (
    <Box gap="md" testID="studio-create">
      <Box gap="xs">
        <Text role="titleLg">{t('studio.create.title')}</Text>
        <Text role="body" color="textSecondary">
          {t('studio.create.body')}
        </Text>
      </Box>

      <Input
        label={t('studio.create.name')}
        value={displayName}
        onChangeText={edit(setDisplayName)}
        autoCapitalize="words"
        maxLength={60}
        testID="studio-create-name"
      />

      <Box gap="xxs">
        <Input
          label={t('studio.create.instagram')}
          value={instagram}
          // Se saca la arroba al escribir: la columna guarda el handle sin
          // arroba, y nadie tiene por qué saber eso.
          onChangeText={edit((value: string) =>
            setInstagram(value.replace(/[@\s]/g, '')),
          )}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
          testID="studio-create-instagram"
        />
        <Input
          label={t('studio.create.whatsapp')}
          value={whatsapp}
          onChangeText={edit(setWhatsapp)}
          keyboardType="phone-pad"
          maxLength={20}
          testID="studio-create-whatsapp"
        />
        <Text role="label" color="textTertiary">
          {t('studio.create.contact.hint')}
        </Text>
      </Box>

      {error != null ? (
        <Text role="micro" color="stateNegative" testID="studio-create-error">
          {error}
        </Text>
      ) : null}

      <Button
        label={t('studio.create.submit')}
        disabled={!canSubmit}
        loading={busy}
        fullWidth
        onPress={() =>
          onCreate({
            displayName: displayName.trim(),
            instagram: instagram.trim(),
            whatsapp: whatsapp.trim(),
          })
        }
        testID="studio-create-submit"
      />
    </Box>
  )
}

/**
 * Los estilos que el artista declara para sí. Distintos de los de cada pieza.
 *
 * Sin esto el perfil existe y no aparece nunca: el componente Estilo del
 * matching pesa 0,70, y un profesional sin `professional_styles` saca cero en
 * él. Por eso el texto no dice "opcional" — dice qué pasa si no está.
 *
 * El botón de guardar solo aparece cuando la selección cambió. Un botón
 * siempre visible sobre algo ya guardado invita a tocarlo por las dudas.
 */
function OwnStyles({
  saved,
  saving,
  error,
  onSave,
}: {
  saved: readonly string[]
  saving: boolean
  error: string | null
  onSave: (slugs: readonly string[]) => void
}) {
  const t = useT()
  const [selected, setSelected] = useState<readonly string[]>(saved)

  const changed =
    selected.length !== saved.length ||
    selected.some((slug, index) => saved[index] !== slug)

  return (
    <Box gap="sm" testID="studio-own-styles">
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('studio.styles.title')}
        </Text>
        <Text role="label" color="textTertiary">
          {t('studio.styles.body')}
        </Text>
      </Box>

      <StylePicker
        selected={selected}
        max={MAX_OWN_STYLES}
        onChange={setSelected}
        testIDPrefix="studio-own-style"
      />

      {error != null ? (
        <Text role="micro" color="stateNegative" testID="studio-styles-error">
          {error}
        </Text>
      ) : null}

      {changed ? (
        <Button
          label={t('studio.styles.save')}
          variant="secondary"
          disabled={selected.length === 0}
          loading={saving}
          onPress={() => onSave(selected)}
          testID="studio-styles-save"
        />
      ) : null}
    </Box>
  )
}

/**
 * Con qué frecuencia contesta, tal como lo ve cualquiera en su perfil.
 *
 * Está acá por una sola razón: un indicador público sobre una persona que esa
 * persona no puede ver es una calificación a sus espaldas. Si todavía no hay
 * datos suficientes, no se dibuja nada — igual que en el perfil. Ver ADR-022.
 */
function OwnReplyHabit({ professionalId }: { professionalId: string }) {
  const t = useT()

  const habito = useQuery({
    queryKey: ['reply-habit', professionalId],
    queryFn: () => fetchReplyHabit(professionalId),
  })

  if (habito.data == null) return null

  return (
    <Box gap="xxs" testID="studio-reply-habit">
      <Text role="label" color="textSecondary">
        {t('replyHabit.own')}
      </Text>
      <Text role="body">
        {t(`replyHabit.${habito.data}` as TranslationKey)}
      </Text>
      <Text role="label" color="textTertiary">
        {t('replyHabit.source')}
      </Text>
    </Box>
  )
}
