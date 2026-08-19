/**
 * La variante **Obra** del sistema de tarjetas: una imagen y nada más.
 *
 * Es la pieza de la grilla de descubrimiento, y su decisión de diseño más
 * discutible es lo que NO tiene: **no lleva el nombre del artista debajo**. Con
 * un pie por obra la grilla se convierte en una lista de gente y se descubre
 * por nombre en vez de por trabajo. El nombre aparece al tocar.
 *
 * Ver docs/design/MESH-VISUAL-DIRECTION-2.md §4. Si alguna vez las métricas
 * muestran que la gente no llega al perfil, esta es la primera decisión a
 * revisar.
 *
 * Lo único que sí se superpone es la insignia de registro de prueba, y no es
 * negociable: una obra ficticia tiene que decir que lo es en el lugar donde se
 * la mira, no dos pantallas más adentro.
 */

import { Image } from 'expo-image'
import { memo } from 'react'
import { View } from 'react-native'

import {
  MIN_TOUCH_TARGET,
  Pressable,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { FixtureBadge } from '@/components/FixtureBadge.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'

import { mediaUrl, type FeedItem } from './queries.ts'

/**
 * Relación de aspecto cuando la pieza no declara medidas.
 *
 * 4:5 y no 1:1: el retrato es la forma más común de una foto de tatuaje, y un
 * cuadrado por defecto recortaría de más justo en las piezas de las que menos
 * sabemos.
 */
const DEFAULT_RATIO = 4 / 5

export interface ArtworkTileProps {
  item: FeedItem
  onPress: () => void
  testID?: string
}

function ArtworkTileImpl({ item, onPress, testID }: ArtworkTileProps) {
  const theme = useTheme()
  const t = useT()

  const aspectRatio =
    item.mediaWidth != null && item.mediaHeight != null && item.mediaHeight > 0
      ? item.mediaWidth / item.mediaHeight
      : DEFAULT_RATIO

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // La etiqueta sí nombra al artista, aunque la tarjeta no lo muestre: un
      // lector de pantalla no puede "tocar para ver". Sin esto, la grilla se
      // anuncia como una lista de botones idénticos.
      accessibilityLabel={t('discovery.tile.open', {
        nombre: item.professionalName,
      })}
      testID={testID}
      style={{
        // La obra puede ser más chica que 44pt en el eje corto de una grilla
        // de dos columnas solo en pantallas muy angostas; el alto siempre
        // supera el mínimo por la relación de aspecto.
        minHeight: MIN_TOUCH_TARGET,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: theme.surfaceRaised,
      }}
    >
      <Image
        source={mediaUrl(item.mediaPath, 'md')}
        style={{ width: '100%', aspectRatio }}
        contentFit="cover"
        // El blurhash es lo que hace que la grilla no salte: el hueco ya tiene
        // el color de la obra antes de que la obra llegue.
        {...(item.blurhash != null
          ? { placeholder: { blurhash: item.blurhash } }
          : {})}
        transition={200}
        accessible={false}
      />

      {item.isFixture ? (
        <View
          style={{
            position: 'absolute',
            top: spacing.xxs,
            left: spacing.xxs,
          }}
        >
          <FixtureBadge />
        </View>
      ) : null}
    </Pressable>
  )
}

/**
 * Memoizada: una grilla vuelve a renderizar en cada página nueva, y sin esto
 * cada tarjeta ya montada se recalcula por cada scroll.
 */
export const ArtworkTile = memo(ArtworkTileImpl)
