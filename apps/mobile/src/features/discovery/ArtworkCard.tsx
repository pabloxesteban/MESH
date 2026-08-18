/**
 * Una obra.
 *
 * La imagen manda: el nombre del artista y los estilos van abajo, chicos, sin
 * competirle. La tarjeta no muestra puntaje, ni "97% match", ni cuánta gente le
 * dio me gusta. Nada de eso es información que tengamos.
 */

import { Image } from 'expo-image'
import { memo } from 'react'
import { View } from 'react-native'

import { Box, Tag, Text, radius, useTheme } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { mediaUrl, type FeedItem } from './queries.ts'

export interface ArtworkCardProps {
  item: FeedItem
  /** Solo la de arriba anuncia su contenido; las de atrás son decorado. */
  isTop?: boolean
  testID?: string
}

function ArtworkCardImpl({ item, isTop = false, testID }: ArtworkCardProps) {
  const theme = useTheme()
  const t = useT()

  const aspectRatio =
    item.mediaWidth != null && item.mediaHeight != null && item.mediaHeight > 0
      ? item.mediaWidth / item.mediaHeight
      : 4 / 5

  return (
    <View
      testID={testID}
      accessible={isTop}
      accessibilityRole="image"
      // El lector de pantalla necesita saber de quién es la obra antes de que
      // los botones de decisión tengan sentido.
      accessibilityLabel={`${item.professionalName}. ${item.styles
        .map((style) => t(`style.tattoo.${style.slug}` as TranslationKey))
        .join(', ')}`}
      style={{
        flex: 1,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: theme.surfaceRaised,
      }}
    >
      <Image
        // `md` y no `lg`: el mazo nunca baja una imagen de 1600px para una
        // tarjeta que mide menos que el ancho de la pantalla.
        source={mediaUrl(item.mediaPath, 'md')}
        // El blurhash se pinta mientras carga. Sin él la tarjeta es un rectángulo
        // gris, y un mazo de rectángulos grises no se puede evaluar.
        placeholder={item.blurhash != null ? { blurhash: item.blurhash } : null}
        placeholderContentFit="cover"
        contentFit="cover"
        // Evita que expo-image reutilice el bitmap de la tarjeta anterior
        // mientras carga el nuevo, que es cómo aparece la obra equivocada por
        // un frame.
        recyclingKey={item.portfolioItemId}
        transition={0}
        style={{ width: '100%', flex: 1, aspectRatio }}
        accessible={false}
      />

      <Box padding="sm" gap="xs" background="surfaceRaised">
        <Text role="title" numberOfLines={1}>
          {item.professionalName}
        </Text>

        <Box direction="row" gap="xxs" wrap>
          {item.styles.map((style) => (
            <Tag
              key={style.slug}
              label={t(`style.tattoo.${style.slug}` as TranslationKey)}
            />
          ))}
        </Box>

        {item.caption != null ? (
          <Text role="micro" color="textSecondary" numberOfLines={2}>
            {item.caption}
          </Text>
        ) : null}
      </Box>
    </View>
  )
}

/**
 * Memoizada por pieza. El mazo re-renderiza en cada decisión, y volver a montar
 * la imagen de las tarjetas de atrás las haría parpadear.
 */
export const ArtworkCard = memo(
  ArtworkCardImpl,
  (previous, next) =>
    previous.item.portfolioItemId === next.item.portfolioItemId &&
    previous.isTop === next.isTop,
)
