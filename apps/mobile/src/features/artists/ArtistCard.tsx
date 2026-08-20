/**
 * La tarjeta de un artista: un carrusel de su obra, y quién es debajo.
 *
 * Es la pieza de Inicio y la que define el producto nuevo. El orden de lectura
 * es deliberado y es el de MESH entero: **primero el trabajo, después la
 * persona.** Nadie elige un tatuador por su cara.
 *
 * El carrusel es chico a propósito. No es el portafolio —eso está en el
 * perfil— es una muestra: lo suficiente para decidir si querés ver más.
 * Deslizar dentro del carrusel es horizontal, la grilla se recorre en vertical,
 * y los dos gestos conviven porque van en ejes distintos.
 *
 * Lo que la tarjeta **no** muestra: puntajes, encajes, insignias de actividad,
 * ni cuántas personas la vieron. MESH no tiene esos números y no los va a
 * inventar.
 *
 * Tampoco muestra los estilos. Se probaron, y tres etiquetas de colores debajo
 * de cada tarjeta convierten la grilla en una carta de colores que le compite
 * a la obra — que es justamente lo que la tarjeta vino a mostrar. Los estilos
 * viven en el perfil, bajo "Trabaja", donde hay lugar para leerlos.
 */

import { Image } from 'expo-image'
import { memo } from 'react'
import { ScrollView, View } from 'react-native'

import { locationLabel, roundDistanceKm } from '@mesh/domain'

import {
  Box,
  HAIRLINE,
  MIN_TOUCH_TARGET,
  Pressable,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { FixtureBadge } from '@/components/FixtureBadge.tsx'
import { ratioOf } from '@/features/transitions/geometry.ts'
import { openArtwork } from '@/features/transitions/openArtwork.ts'
import { useArtworkAnchor } from '@/features/transitions/useArtworkAnchor.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { avatarUrl, mediaUrl, type ArtistCardData } from './queries.ts'

/** Ancho de cada obra del carrusel. Dos y media entran en una pantalla de 390. */
const PIECE_WIDTH = 150

/** Diámetro del avatar. Chico: la persona va después del trabajo. */
const AVATAR = 36

export interface ArtistCardProps {
  artist: ArtistCardData
  /** `null` cuando falta la ubicación de alguna de las dos puntas. */
  distanceKm: number | null
  onPress: () => void
  /** La obra del carrusel que está volviendo a su lugar, si es de esta tarjeta. */
  hiddenPieceId?: string | null
  testID?: string
}

function ArtistCardImpl({
  artist,
  distanceKm,
  onPress,
  hiddenPieceId = null,
  testID,
}: ArtistCardProps) {
  const t = useT()
  const theme = useTheme()

  // `locationLabel` y no `findLocation(...).neighborhood`: los partidos del
  // conurbano —Quilmes, San Isidro, La Plata— son `kind: 'city'` y tienen
  // `neighborhood: null`, así que leerlo directo daba `null` y la tarjeta
  // anunciaba "no publicó su ubicación" a alguien que sí la publicó. Un tercio
  // del catálogo de prueba vive fuera de CABA, y es exactamente la clase de
  // cosa que la app no puede decir: es falsa.
  const barrio =
    artist.neighborhoodSlug == null
      ? null
      : locationLabel(artist.neighborhoodSlug)

  return (
    <View
      style={{
        borderBottomWidth: HAIRLINE,
        borderBottomColor: theme.borderSubtle,
        paddingBottom: spacing.md,
      }}
      testID={testID}
    >
      {/* El carrusel. Cada obra abre el mismo perfil: la muestra es del
          artista, no de una pieza suelta. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.xxs,
          paddingHorizontal: spacing.lg - spacing.xxs,
        }}
        testID={`${testID ?? 'artist'}-carousel`}
      >
        {artist.pieces.map((piece) => (
          <CarouselPiece
            key={piece.id}
            piece={piece}
            artist={artist}
            onPress={onPress}
            hidden={piece.id === hiddenPieceId}
          />
        ))}
      </ScrollView>

      {/* Quién es. Toda la fila es tocable: un nombre de 14pt no es un
          objetivo táctil, la fila entera sí. */}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('artists.card.open', {
          nombre: artist.displayName,
        })}
        testID={`${testID ?? 'artist'}-identity`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          minHeight: MIN_TOUCH_TARGET,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
        }}
      >
        <Avatar artist={artist} />

        <View style={{ flex: 1 }}>
          <Box direction="row" align="center" gap="xxs">
            <Text role="body" numberOfLines={1}>
              {artist.displayName}
            </Text>
            {artist.isFixture ? <FixtureBadge /> : null}
          </Box>

          <Text role="micro" color="textTertiary" numberOfLines={1}>
            {ubicacion(barrio, distanceKm, t)}
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

/**
 * Una obra del carrusel.
 *
 * Componente propio y no un `map` inline porque cada obra necesita su propia
 * referencia para poder medirse: la transición obra → artista crece desde el
 * rectángulo exacto de la obra que se tocó, y un `useRef` por iteración no se
 * puede escribir adentro de un `map`.
 *
 * El recorte es el que delata la única diferencia con Explorar: acá el
 * carrusel muestra todas las obras en 4:5 para que la fila quede pareja,
 * mientras que el hero del perfil respeta la forma real de la obra. La copia
 * que crece va cambiando de forma en el camino, que es lo correcto — está
 * mostrando la obra entera que el carrusel recortaba.
 */
function CarouselPiece({
  piece,
  artist,
  onPress,
  hidden,
}: {
  piece: ArtistCardData['pieces'][number]
  artist: ArtistCardData
  onPress: () => void
  hidden: boolean
}) {
  const t = useT()
  const theme = useTheme()
  const view = useArtworkAnchor('artists', piece.id)

  return (
    <Pressable
      ref={view}
      onPress={() => {
        openArtwork({
          view: view.current,
          artwork: {
            portfolioItemId: piece.id,
            professionalSlug: artist.slug,
            mediaPath: piece.mediaPath,
            blurhash: piece.blurhash,
            aspectRatio: ratioOf(piece.width, piece.height),
            scope: 'artists',
          },
          open: onPress,
        })
      }}
      accessibilityRole="button"
      accessibilityLabel={t('artists.card.open', {
        nombre: artist.displayName,
      })}
      style={{
        width: PIECE_WIDTH,
        aspectRatio: 4 / 5,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: theme.surfaceRaised,
        // El hueco mientras la copia vuelve. Ver features/transitions.
        opacity: hidden ? 0 : 1,
      }}
    >
      <Image
        source={mediaUrl(piece.mediaPath, 'md')}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        {...(piece.blurhash != null
          ? { placeholder: { blurhash: piece.blurhash } }
          : {})}
        transition={200}
        accessible={false}
      />
    </Pressable>
  )
}

/**
 * La línea de ubicación.
 *
 * Barrio y distancia son dos datos distintos y cualquiera puede faltar. Se
 * arma con lo que hay y **nunca se rellena**: sin barrio no dice "CABA", sin
 * distancia no dice "cerca".
 */
function ubicacion(
  barrio: string | null,
  distanceKm: number | null,
  t: (key: TranslationKey, params?: Record<string, string>) => string,
): string {
  const partes: string[] = []
  if (barrio != null) partes.push(barrio)
  if (distanceKm != null) {
    partes.push(
      t('artists.card.km', { km: String(roundDistanceKm(distanceKm)) }),
    )
  }
  return partes.length > 0 ? partes.join(' · ') : t('artists.card.noLocation')
}

/**
 * La foto de perfil, o su ausencia.
 *
 * Ningún artista tiene avatar cargado todavía, así que el caso sin foto es el
 * normal y no un borde. En vez de una silueta genérica va la inicial del
 * nombre: es un dato real, deriva de algo que la persona escribió, y no
 * pretende ser una foto.
 */
function Avatar({ artist }: { artist: ArtistCardData }) {
  const theme = useTheme()

  const base = {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.full,
    backgroundColor: theme.surfaceRaised,
  } as const

  if (artist.avatarPath == null) {
    return (
      <View style={{ ...base, alignItems: 'center', justifyContent: 'center' }}>
        <Text role="micro" color="textSecondary">
          {artist.displayName.trim().charAt(0).toUpperCase()}
        </Text>
      </View>
    )
  }

  return (
    <Image
      source={avatarUrl(artist.avatarPath)}
      style={base}
      contentFit="cover"
      accessible={false}
    />
  )
}

export const ArtistCard = memo(ArtistCardImpl)
