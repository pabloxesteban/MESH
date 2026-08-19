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

import { ratioOf } from '@/features/transitions/geometry.ts'
import { openArtwork } from '@/features/transitions/openArtwork.ts'
import { useArtworkAnchor } from '@/features/transitions/useArtworkAnchor.ts'

import { mediaUrl, type FeedItem } from './queries.ts'

export interface ArtworkTileProps {
  item: FeedItem
  onPress: () => void
  /** Escondida mientras la obra vuelve a su lugar. Ver features/transitions. */
  hidden?: boolean
  testID?: string
}

function ArtworkTileImpl({
  item,
  onPress,
  hidden = false,
  testID,
}: ArtworkTileProps) {
  const theme = useTheme()
  const t = useT()
  const view = useArtworkAnchor('explore', item.portfolioItemId)

  const aspectRatio = ratioOf(item.mediaWidth, item.mediaHeight)

  return (
    <Pressable
      ref={view}
      // Se mide antes de navegar: la obra tiene que crecer desde donde estaba,
      // y "donde estaba" deja de existir apenas se abre el perfil. Ver
      // features/transitions.
      onPress={() => {
        openArtwork({
          view: view.current,
          artwork: {
            portfolioItemId: item.portfolioItemId,
            professionalSlug: item.professionalSlug,
            mediaPath: item.mediaPath,
            blurhash: item.blurhash,
            aspectRatio,
            scope: 'explore',
          },
          open: onPress,
        })
      }}
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
        // Mientras la copia viaja de vuelta, el hueco: si no, la obra se vería
        // dos veces y la transición mostraría el truco justo al final.
        opacity: hidden ? 0 : 1,
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
