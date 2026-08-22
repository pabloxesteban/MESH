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
  Avatar,
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

/** Ancho de cada obra del carrusel. Casi dos enteras entran en una pantalla de 390: el "showcase spread". */
const PIECE_WIDTH = 200

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
          artista, no de una pieza suelta.

          Sin obra no hay carrusel, y se dice. Esta tarjeta no aparece en la
          grilla de Inicio —ahí a quien no subió nada se lo esconde justamente
          porque su tarjeta saldría vacía— pero sí en una búsqueda por nombre,
          donde esconderlo sería contestar mal a quien preguntó por él. La
          alternativa era una fila muda de 20pt: peor, porque no se entiende. */}
      {artist.pieces.length === 0 ? (
        <Box
          paddingX="lg"
          paddingBottom="xs"
          testID={`${testID ?? 'artist'}-no-work`}
        >
          <Text role="body" color="textTertiary">
            {t('artists.card.noWork')}
          </Text>
        </Box>
      ) : (
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
      )}

      {/* Quién es. Toda la fila es tocable: el nombre solo no es un objetivo
          táctil de ancho confiable (una sola línea, con elipsis), la fila
          entera sí. */}
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
        <Avatar
          source={
            artist.avatarPath == null ? null : avatarUrl(artist.avatarPath)
          }
          size="sm"
          testID={`${testID ?? 'artist'}-avatar`}
        />

        <View style={{ flex: 1 }}>
          <Box direction="row" align="center" gap="xxs">
            <Text role="titleLg" numberOfLines={1}>
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
 * carrusel muestra todas las obras en 3:4 para que la fila quede pareja,
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

  // La relación de aspecto real de la pieza, no la de la caja que la recorta
  // (esa es fija en 3:4). Sirve para dos cosas independientes: la transición
  // hacia el perfil (abajo) y qué derivado pedirle a `mediaUrl` (ver debajo del
  // return): una pieza apaisada necesita más ancho real para cubrir el alto de
  // la caja sin upscale que una retrato o cuadrada.
  const aspectRatio = ratioOf(piece.width, piece.height)

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
            aspectRatio,
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
        aspectRatio: 3 / 4,
        borderRadius: radius.art,
        overflow: 'hidden',
        backgroundColor: theme.surfaceRaised,
        // El hueco mientras la copia vuelve. Ver features/transitions.
        opacity: hidden ? 0 : 1,
      }}
    >
      <Image
        // `cover` sobre una caja 3:4 fija a 200pt de ancho, a 3x: 800px de
        // alto a cubrir. El derivado `md` sale a 900px de ancho preservando la
        // proporción original — de sobra para una pieza retrato o cuadrada,
        // pero para una apaisada (ancho/alto > ~1.125) esos 900px de ancho dan
        // menos de 800px de alto y `cover` la escala hacia arriba. `lg` evita
        // ese upscale; pedirlo siempre gastaría bytes de más en el caso común,
        // que es retrato.
        source={mediaUrl(piece.mediaPath, aspectRatio > 1.125 ? 'lg' : 'md')}
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

export const ArtistCard = memo(ArtistCardImpl)
