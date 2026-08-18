/**
 * Buscar por fotos.
 *
 * Dos toques, no un formulario: elegís hasta 4 fotos de algo que te gusta,
 * tocás qué estilos son, y listo — te lleva directo a la gente cerca tuyo que
 * hace eso. Sin título que escribir, sin descripción, sin presupuesto, sin
 * timing: eso sigue existiendo en "Crear proyecto" para quien lo quiera, esto
 * es la versión corta.
 *
 * El barrio es opcional y de un solo toque — si no lo elegís, el matching
 * sigue funcionando, solo que sin el componente de ubicación. Nunca se le
 * pide a nadie el barrio con un campo de texto.
 *
 * **Lo que este flujo NO hace, a propósito:** no mira el contenido de las
 * fotos. El sistema no sabe qué hay en la imagen — vos se lo decís tocando los
 * estilos. Ver docs/product/product-spec.md y CLAUDE.md: nada de ML en el
 * camino de recomendación.
 */

import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { STYLES, neighborhoodsOf } from '@mesh/domain'

import {
  Box,
  Button,
  FilterChip,
  HAIRLINE,
  Pressable,
  SCREEN_GUTTER,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { createQuickSearch } from './createQuickSearch.ts'

const MAX_PHOTOS = 4

/** Mismo criterio que ProjectFormScreen: V1 es CABA, 48 barrios entran en una grilla. */
const BARRIOS = [...neighborhoodsOf('caba')].sort((a, b) =>
  (a.neighborhood ?? '').localeCompare(b.neighborhood ?? '', 'es-AR'),
)

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

  const [images, setImages] = useState<readonly string[]>([])
  const [styleSlugs, setStyleSlugs] = useState<readonly string[]>([])
  const [locationSlug, setLocationSlug] = useState<string | null>(null)
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

  const canSubmit = images.length > 0 && styleSlugs.length > 0 && !isSubmitting

  const submit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const title = styleSlugs
        .map((slug) => t(`style.tattoo.${slug}` as TranslationKey))
        .join(' + ')

      const result = await createQuickSearch({
        userId,
        title,
        styleSlugs,
        imageUris: images,
        ...(locationSlug != null ? { locationSlug } : {}),
      })

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

        <Box gap="xs">
          <Text role="label" color="textSecondary">
            {t('quickSearch.styles')}
          </Text>
          <Box direction="row" gap="xxs" wrap>
            {STYLES.map((style) => (
              <FilterChip
                key={style.slug}
                label={t(`style.tattoo.${style.slug}` as TranslationKey)}
                selected={styleSlugs.includes(style.slug)}
                onToggle={() =>
                  setStyleSlugs((previous) =>
                    previous.includes(style.slug)
                      ? previous.filter((slug) => slug !== style.slug)
                      : [...previous, style.slug],
                  )
                }
                testID={`quick-search-style-${style.slug}`}
              />
            ))}
          </Box>
        </Box>

        <Box gap="xs">
          <Text role="label" color="textSecondary">
            {t('quickSearch.location')}
          </Text>
          <Text role="micro" color="textTertiary">
            {t('quickSearch.location.hint')}
          </Text>
          <Box direction="row" gap="xxs" wrap>
            {BARRIOS.map((barrio) => (
              <FilterChip
                key={barrio.slug}
                label={barrio.neighborhood ?? barrio.city}
                selected={locationSlug === barrio.slug}
                onToggle={() =>
                  setLocationSlug((previous) =>
                    previous === barrio.slug ? null : barrio.slug,
                  )
                }
                testID={`quick-search-location-${barrio.slug}`}
              />
            ))}
          </Box>
        </Box>

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
