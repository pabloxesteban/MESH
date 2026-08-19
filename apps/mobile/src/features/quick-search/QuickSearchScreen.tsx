/**
 * Buscar por fotos.
 *
 * Lo más simple posible: elegís hasta 4 fotos de algo que te gusta, tocás
 * Buscar, y listo. Sin título que escribir, sin descripción, sin presupuesto,
 * sin timing, sin elegir un estilo de una lista: eso sigue existiendo en
 * "Crear proyecto" para quien lo quiera, esto es la versión corta.
 *
 * El barrio es opcional y de un solo toque — si no lo elegís, el matching
 * sigue funcionando, solo que sin el componente de ubicación. Nunca se le
 * pide a nadie el barrio con un campo de texto.
 *
 * **De dónde sale el estilo, si nadie lo toca acá.** La primera foto se manda
 * a `classifyReferencePhoto()` — la única llamada a un modelo de IA de toda
 * la app (ver ADR-011), acotada a devolver un slug de la taxonomía real o
 * `null`. El motor de matching en sí (`packages/domain`) sigue siendo
 * puro y determinístico: la IA interpreta lo que subiste, no decide a quién
 * te mostramos ni en qué orden. Si no reconoce ningún estilo, se lo decimos
 * y no se inventa uno.
 */

import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { findLocation } from '@mesh/domain'

import {
  Box,
  Button,
  HAIRLINE,
  Pressable,
  SCREEN_GUTTER,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { track } from '@/analytics/track.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { useDeviceLocation } from '../location/useDeviceLocation.ts'
import { classifyReferencePhoto } from './classify.ts'
import { createQuickSearch } from './createQuickSearch.ts'

const MAX_PHOTOS = 4

export interface QuickSearchScreenProps {
  userId: string
  onCreated: (projectId: string) => void
  onCancel: () => void
}

export function QuickSearchScreen({
  userId,
  onCreated,
  onCancel,
}: QuickSearchScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const device = useDeviceLocation()

  const [images, setImages] = useState<readonly string[]>([])
  // Apagado. Estas fotos las subió para sí misma; que las vea un tatuador es
  // una decisión suya, y una decisión no se toma por default. Ver ADR-014.
  const [openToPros, setOpenToPros] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Ausente hasta que la búsqueda corrió; con valor, algunas fotos no
  // subieron y se espera un segundo toque antes de seguir a los resultados.
  // No se navega solo — informar y esperar confirmación es lo mínimo cuando
  // parte de lo que la persona pidió no se pudo hacer.
  const [pending, setPending] = useState<{
    readonly projectId: string
    readonly failedUploads: number
  } | null>(null)

  const canSubmit = images.length > 0 && !isSubmitting

  const submit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const firstPhoto = images[0]
      if (firstPhoto == null) return

      const styleSlug = await classifyReferencePhoto({
        uri: firstPhoto,
        categorySlug: 'tattoo',
      })

      if (styleSlug == null) {
        setError(t('quickSearch.unrecognized'))
        return
      }

      const title = t(`style.tattoo.${styleSlug}` as TranslationKey)

      // El barrio sale del GPS, no de una grilla de 48 chips. Si no hay
      // permiso o el geocoder no reconoció nada, va sin barrio y el
      // componente de ubicación del matching se omite — exactamente lo que
      // pasaba antes cuando alguien no elegía ninguno.
      const locationSlug = device.location?.neighborhoodSlug ?? null

      const result = await createQuickSearch({
        userId,
        title,
        styleSlugs: [styleSlug],
        imageUris: images,
        openToProfessionals: openToPros,
        ...(locationSlug != null ? { locationSlug } : {}),
      })

      track({ name: 'search_opened', props: { is_open: openToPros } })

      if (result.failedUploads > 0) {
        setPending(result)
      } else {
        onCreated(result.projectId)
      }
    } catch {
      setError(t('quickSearch.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        padding: SCREEN_GUTTER,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      testID="screen-quick-search"
    >
      <Box gap="lg">
        <Box gap="xxs">
          <Text role="titleLg">{t('quickSearch.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('quickSearch.subtitle')}
          </Text>
        </Box>

        <Box gap="xs">
          <Text role="label" color="textSecondary">
            {t('quickSearch.photos')}
          </Text>
          <Box direction="row" gap="xs" wrap>
            {images.map((uri, index) => (
              <Pressable
                key={uri}
                onPress={() =>
                  setImages((previous) =>
                    previous.filter((_, i) => i !== index),
                  )
                }
                accessibilityLabel={t('quickSearch.photo.remove', {
                  n: String(index + 1),
                })}
                testID={`quick-search-photo-${index}`}
              >
                <Image
                  source={uri}
                  contentFit="cover"
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: radius.md,
                    backgroundColor: theme.surfaceRaised,
                  }}
                  accessible={false}
                />
              </Pressable>
            ))}

            {images.length < MAX_PHOTOS ? (
              <Pressable
                onPress={() => {
                  void (async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ['images'],
                      allowsMultipleSelection: true,
                      selectionLimit: MAX_PHOTOS - images.length,
                      quality: 1,
                    })
                    if (result.canceled) return
                    const uris = result.assets.map((asset) => asset.uri)
                    setImages((previous) =>
                      [...previous, ...uris].slice(0, MAX_PHOTOS),
                    )
                  })()
                }}
                accessibilityLabel={t('quickSearch.photo.add')}
                testID="quick-search-add-photo"
              >
                <View
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: radius.md,
                    borderWidth: HAIRLINE,
                    borderColor: theme.borderStrong,
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text role="title" color="textSecondary">
                    +
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </Box>
        </Box>

        <LocationRow
          status={device.status}
          neighborhoodSlug={device.location?.neighborhoodSlug ?? null}
          onRequest={device.request}
        />

        <OpenToProsRow
          open={openToPros}
          onToggle={() => setOpenToPros((previous) => !previous)}
        />

        {error != null ? (
          <Text role="micro" color="stateNegative" testID="quick-search-error">
            {error}
          </Text>
        ) : null}

        {pending != null ? (
          <Box gap="xs" testID="quick-search-partial">
            <Text role="micro" color="stateWarning">
              {t('quickSearch.uploadsFailed', {
                ok: String(images.length - pending.failedUploads),
                total: String(images.length),
              })}
            </Text>
            <Button
              label={t('common.continue')}
              onPress={() => onCreated(pending.projectId)}
              fullWidth
              testID="quick-search-continue"
            />
          </Box>
        ) : (
          <Box gap="xs">
            <Button
              label={t('quickSearch.submit')}
              disabled={!canSubmit}
              loading={isSubmitting}
              onPress={() => void submit()}
              fullWidth
              testID="quick-search-submit"
            />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              onPress={onCancel}
              fullWidth
              testID="quick-search-cancel"
            />
          </Box>
        )}
      </Box>
    </ScrollView>
  )
}

/**
 * La ubicación, sin que nadie la elija.
 *
 * Antes acá había una grilla de 48 barrios. El barrio ahora sale del GPS: se
 * pide el permiso una vez, con la razón al lado, y el geocoder del sistema lo
 * traduce a un barrio de la taxonomía.
 *
 * Tres estados y ninguno miente:
 * · sin permiso   → un botón que lo pide, diciendo para qué
 * · con barrio    → lo nombra, para que se pueda ver que acertó
 * · sin reconocer → lo dice, y la búsqueda sigue sin el componente de
 *                   ubicación. No inventamos un barrio cercano.
 */
function LocationRow({
  status,
  neighborhoodSlug,
  onRequest,
}: {
  status: 'checking' | 'unrequested' | 'granted' | 'denied'
  neighborhoodSlug: string | null
  onRequest: () => void
}) {
  const t = useT()

  if (status === 'checking') return null

  if (status === 'granted') {
    return (
      <Box gap="xxs" testID="quick-search-location-on">
        <Text role="label" color="textSecondary">
          {t('quickSearch.location')}
        </Text>
        <Text role="micro" color="textTertiary">
          {neighborhoodSlug == null
            ? t('quickSearch.location.unknown')
            : t('quickSearch.location.near', {
                barrio:
                  findLocation(neighborhoodSlug)?.neighborhood ??
                  neighborhoodSlug,
              })}
        </Text>
      </Box>
    )
  }

  return (
    <Box gap="xs" testID="quick-search-location-off">
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('quickSearch.location')}
        </Text>
        <Text role="micro" color="textTertiary">
          {status === 'denied'
            ? t('quickSearch.location.denied')
            : t('quickSearch.location.hint')}
        </Text>
      </Box>
      {status === 'unrequested' ? (
        <Button
          label={t('quickSearch.location.action')}
          variant="secondary"
          size="sm"
          onPress={onRequest}
          testID="quick-search-location-request"
        />
      ) : null}
    </Box>
  )
}

/**
 * El interruptor que decide si un tatuador puede ver esta búsqueda.
 *
 * Arranca apagado y la etiqueta dice qué pasa si se enciende, con las dos
 * consecuencias que importan: **qué se muestra** (las fotos y el estilo) y
 * **qué no** (quién sos). Sin eso, "que los tatuadores lo vean" suena a
 * publicar el perfil.
 *
 * Mismo patrón que el interruptor de datos de uso: un botón con el estado
 * escrito arriba. MESH no tiene un `Switch` propio, y un control cuyo estado
 * solo se lee del color no se lee.
 */
function OpenToProsRow({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  const t = useT()

  return (
    <Box gap="xxs" testID="quick-search-open">
      <Text role="label" color="textSecondary">
        {t('quickSearch.open.title')}
      </Text>
      <Text role="body" color="textSecondary">
        {t('quickSearch.open.body')}
      </Text>
      <Text role="micro" color="textTertiary">
        {t(open ? 'quickSearch.open.on' : 'quickSearch.open.off')}
      </Text>
      <Button
        label={t(
          open ? 'quickSearch.open.toggle.on' : 'quickSearch.open.toggle.off',
        )}
        variant="secondary"
        onPress={onToggle}
        fullWidth
        testID="quick-search-open-toggle"
      />
    </Box>
  )
}
