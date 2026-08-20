/**
 * Una búsqueda, vista por un tatuador.
 *
 * Lo que muestra es lo que la persona escribió y las fotos que eligió subir.
 * Lo que **no** muestra es quién es: ni nombre, ni foto de perfil, ni nada que
 * identifique. La identidad aparece recién si ella abre el chat. Ver ADR-014.
 *
 * Tampoco muestra nada estimado. Sin presupuesto no dice "consultar"; sin
 * barrio no dice "CABA". Un campo vacío se omite, y el que sobrevive es
 * información real.
 */

import { Image } from 'expo-image'
import { View } from 'react-native'

import {
  Box,
  Tag,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { locationLabel } from '@mesh/domain'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import type { OpenSearch } from './queries.ts'

export function SearchCard({
  search,
  isTop,
  testID,
}: {
  search: OpenSearch
  isTop: boolean
  testID?: string
}) {
  const t = useT()
  const theme = useTheme()

  const barrio =
    search.locationSlug == null
      ? null
      : // Ver el comentario en ArtistCard: un partido del conurbano tiene
        // `neighborhood: null` y leerlo directo lo borra de la tarjeta.
        locationLabel(search.locationSlug)

  const portada = search.referenceUrls[0]

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surfaceRaised,
        borderRadius: radius.lg,
        overflow: 'hidden',
      }}
      {...(testID != null ? { testID } : {})}
    >
      <View style={{ flex: 1, backgroundColor: theme.surfaceSunken }}>
        {portada != null ? (
          <Image
            source={portada}
            style={{ flex: 1 }}
            contentFit="cover"
            // Solo la de arriba entra en transición: las de atrás no se ven.
            transition={isTop ? 200 : 0}
            accessibilityLabel={t('demand.card.reference')}
          />
        ) : (
          // Una búsqueda sin fotos existe: alguien puede describir lo que
          // quiere sin tener una referencia. Se dice, no se disimula con un
          // marco vacío.
          <Box flex={1} align="center" justify="center" paddingX="lg">
            <Text role="micro" color="textTertiary" align="center">
              {t('demand.card.noPhotos')}
            </Text>
          </Box>
        )}

        {search.referenceUrls.length > 1 ? (
          <View
            style={{
              position: 'absolute',
              right: spacing.xs,
              bottom: spacing.xs,
            }}
          >
            <Tag
              label={t('demand.card.morePhotos', {
                n: String(search.referenceUrls.length - 1),
              })}
            />
          </View>
        ) : null}
      </View>

      <Box gap="xs" paddingX="md" paddingY="sm">
        <Text role="title" numberOfLines={2}>
          {search.title}
        </Text>

        {search.styleSlugs.length > 0 ? (
          <Box direction="row" gap="xxs" wrap>
            {search.styleSlugs.map((slug) => (
              <Tag
                key={slug}
                label={t(`style.tattoo.${slug}` as TranslationKey)}
                styleSlug={slug}
              />
            ))}
          </Box>
        ) : null}

        {barrio != null ? (
          <Text role="micro" color="textSecondary">
            {barrio}
          </Text>
        ) : null}
      </Box>
    </View>
  )
}
