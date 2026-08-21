/**
 * Inicio: los artistas cerca tuyo.
 *
 * Reemplaza al mazo y a los encajes. La app pasa de "MESH aprende tu gusto y te
 * recomienda" a algo que se explica en una línea: **quién tatúa cerca tuyo, con
 * una muestra de su trabajo.** Ver docs/design/MESH-DESIGN-DECISIONS.md D-010.
 *
 * **El orden se puede leer y se puede cambiar.** Arriba de la lista dice desde
 * dónde se está midiendo, y desde ahí se cambia. Un orden invisible no es un
 * orden: es una caja negra que a veces acierta. Hay tres modos y ninguno es el
 * castigo de los otros — ver `features/location/useSearchLocation.ts`:
 *
 * · **GPS** — ordena por distancia real, con `sortByProximity`, y muestra los
 *   kilómetros.
 * · **Un barrio elegido** — ordena por cercanía de barrio, con
 *   `sortByNeighborhood`, y **no muestra kilómetros**: los barrios de la
 *   taxonomía no tienen coordenadas y el centro de Palermo tampoco sería donde
 *   está la persona.
 * · **Sin ubicación** — no se ordena por cercanía, y se dice.
 *
 * Las dos funciones de orden son puras y están testeadas en packages/domain.
 * Ninguna esconde a nadie: quien está lejos, o no publicó dónde trabaja,
 * aparece igual y más abajo.
 *
 * **Y arriba de todo, buscar por nombre.** Es la tercera forma de llegar a
 * una persona, y la única que sirve cuando ya sabés a quién buscás: hasta
 * ahora quien llegaba con un nombre en la mano tenía que desplazarse hasta
 * encontrarlo de casualidad. Mientras el campo está vacío no cambia nada; con
 * dos letras o más, la lista pasa a ser el resultado.
 *
 * Un detalle que no es un detalle: **el resultado de una búsqueda no se
 * ordena por cercanía.** Si escribiste un nombre querés ese nombre, no el
 * estudio más cerca que se le parezca. El orden lo decide la base por
 * parecido, y el encabezado de ubicación se esconde mientras tanto para no
 * prometer algo que no está pasando.
 *
 * La obra que se toca en un carrusel crece hasta ser el perfil, y al volver
 * encoge hasta su lugar. Ver features/transitions.
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { sortByNeighborhood, sortByProximity } from '@mesh/domain'

import {
  Box,
  Button,
  EmptyState,
  SCREEN_GUTTER,
  SearchField,
  Skeleton,
  Text,
  spacing,
  useMotion,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { useDeviceLocation } from '@/features/location/useDeviceLocation.ts'
import { SearchLocationHeader } from '@/features/location/SearchLocationHeader.tsx'
import { useSearchLocation } from '@/features/location/useSearchLocation.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { GrowingArtwork } from '@/features/transitions/GrowingArtwork.tsx'
import { useArtworkReturn } from '@/features/transitions/useArtworkReturn.ts'

import { ArtistCard } from './ArtistCard.tsx'
import { useDebounced } from './useDebounced.ts'
import {
  MIN_SEARCH_LENGTH,
  fetchArtistGrid,
  mediaUrl,
  searchArtists,
} from './queries.ts'

export interface ArtistsScreenProps {
  categorySlug: string
  userId: string | null
  onOpenArtist: (slug: string) => void
  /** Lleva a Explorar. Es la salida cuando todavía no hay nadie cerca. */
  onExplore: () => void
  /** Abre el selector de desde dónde mirar. */
  onChangeLocation: () => void
}

export function ArtistsScreen({
  categorySlug,
  userId,
  onOpenArtist,
  onExplore,
  onChangeLocation,
}: ArtistsScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const device = useDeviceLocation()
  const { durationOf } = useMotion()
  const back = useArtworkReturn('artists')
  const searchLocation = useSearchLocation()

  const [texto, setTexto] = useState('')
  const consulta = useDebounced(texto).trim()
  // Lo que decide qué se muestra es el texto **crudo**, no el frenado: si
  // dependiera del frenado, borrar el campo dejaría el resultado viejo en
  // pantalla un cuarto de segundo, con el campo ya vacío. Se ve mal y se lee
  // como un error.
  const buscando = texto.trim().length >= MIN_SEARCH_LENGTH

  const artists = useQuery({
    queryKey: ['artist-grid', categorySlug],
    enabled: userId != null,
    queryFn: () => fetchArtistGrid(categorySlug),
  })

  const resultados = useQuery({
    queryKey: ['artist-search', categorySlug, consulta],
    enabled: userId != null && consulta.length >= MIN_SEARCH_LENGTH,
    queryFn: () => searchArtists(categorySlug, consulta),
  })

  // El GPS solo cuenta cuando efectivamente hay coordenadas. Elegir "mi
  // ubicación" y no haber dado el permiso no es lo mismo que tenerla: la lista
  // no se ordena, y el encabezado lo dice en vez de fingir.
  const deviceCoordinates =
    searchLocation.value.mode === 'device'
      ? (device.location?.coordinates ?? null)
      : null

  const ordenados = useMemo(() => {
    const catalogo = artists.data ?? []

    if (searchLocation.value.mode === 'neighborhood') {
      // Sin coordenadas no hay distancia que anotar, y no se estima ninguna.
      return sortByNeighborhood(
        catalogo,
        searchLocation.value.neighborhoodSlug,
      ).map((item) => ({ item, distanceKm: null }))
    }

    return sortByProximity(catalogo, deviceCoordinates)
  }, [
    artists.data,
    deviceCoordinates,
    searchLocation.value.mode,
    searchLocation.value.neighborhoodSlug,
  ])

  const lista = (
    items: readonly { item: (typeof ordenados)[number]['item']; distanceKm: number | null }[],
    testID: string,
  ) => (
    <Box gap="lg" testID={testID}>
      {items.map(({ item, distanceKm }) => (
        <ArtistCard
          key={item.professionalId}
          artist={item}
          distanceKm={distanceKm}
          onPress={() => onOpenArtist(item.slug)}
          hiddenPieceId={back.hiddenPieceId}
          testID={`artist-${item.slug}`}
        />
      ))}
    </Box>
  )

  const body = (() => {
    if (buscando) {
      if (resultados.error != null) {
        return (
          <ErrorView
            error={resultados.error}
            onRetry={() => void resultados.refetch()}
            testID="artists-search-error"
          />
        )
      }

      if (resultados.isPending) return <Loading />

      const encontrados = resultados.data ?? []

      if (encontrados.length === 0) {
        // No dice "no hay resultados": dice a quién se buscó y qué se puede
        // hacer ahora. La salida es Explorar, que es donde se encuentra gente
        // sin saber su nombre.
        return (
          <EmptyState
            title={t('artists.search.empty.title')}
            body={t('artists.search.empty.body')}
            action={{ label: t('artists.search.empty.action'), onPress: onExplore }}
            testID="artists-search-empty"
          />
        )
      }

      // Sin distancia: el resultado viene ordenado por parecido y anotarle
      // kilómetros sugeriría que la cercanía tuvo algo que ver con el orden.
      return lista(
        encontrados.map((item) => ({ item, distanceKm: null })),
        'artists-search-results',
      )
    }

    if (artists.error != null) {
      return (
        <ErrorView
          error={artists.error}
          onRetry={() => void artists.refetch()}
          testID="artists-error"
        />
      )
    }

    if (artists.isPending && userId != null) return <Loading />

    if (ordenados.length === 0) {
      // El vacío real hoy: casi nadie se dio de alta todavía. La salida no es
      // reintentar —no va a aparecer nadie por reintentar— es ir a mirar obra.
      return (
        <EmptyState
          title={t('artists.empty.title')}
          body={t('artists.empty.body')}
          action={{ label: t('artists.empty.action'), onPress: onExplore }}
          testID="artists-empty"
        />
      )
    }

    return lista(ordenados, 'artists-list')
  })()

  return (
    // La raíz existe por la vuelta: la copia se posiciona en coordenadas de
    // ventana, y adentro del ScrollView quedaría atada al scroll.
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        testID="screen-artists"
      >
        <Box paddingX="lg" paddingBottom="sm">
          <SearchField
            value={texto}
            onChangeText={setTexto}
            placeholder={t('artists.search.placeholder')}
            accessibilityLabel={t('artists.search.label')}
            clearLabel={t('artists.search.clear')}
            testID="artists-search"
          />
        </Box>

        {/* Mientras se busca, el encabezado de ubicación se va: dice desde
            dónde se mide la cercanía, y en un resultado por nombre la cercanía
            no mide nada. Dejarlo sería prometer un orden que no está pasando.
            El mismo motivo vale para el pedido de GPS. */}
        {buscando ? null : (
          <>
            <SearchLocationHeader
              value={searchLocation.value}
              deviceNeighborhoodSlug={device.location?.neighborhoodSlug ?? null}
              deviceReady={deviceCoordinates != null}
              onChange={onChangeLocation}
            />

            {/* El aviso aparece solo cuando hay algo que arreglar: elegiste el
                GPS y todavía no lo diste. En los otros modos no falta nada, así
                que no hay nada que pedir. */}
            {searchLocation.value.mode === 'device' &&
            (device.status === 'unrequested' || device.status === 'denied') ? (
              <LocationPrompt onRequest={device.request} />
            ) : null}
          </>
        )}
        {body}
      </ScrollView>

      {back.shrinking != null ? (
        <GrowingArtwork
          from={back.shrinking.from}
          to={back.shrinking.to}
          source={mediaUrl(back.shrinking.mediaPath, 'md')}
          blurhash={back.shrinking.blurhash}
          durationMs={durationOf('standard')}
          onArrived={back.onArrived}
          testID="artists-returning-artwork"
        />
      ) : null}
    </View>
  )
}

/**
 * Por qué la lista no está ordenada por cercanía.
 *
 * No dice "activá la ubicación para una mejor experiencia": dice qué falta y
 * qué cambia. Y no bloquea nada — la lista está abajo igual.
 */
function LocationPrompt({ onRequest }: { onRequest: () => void }) {
  const t = useT()

  return (
    <Box
      gap="xs"
      paddingX="lg"
      paddingBottom="md"
      testID="artists-location-prompt"
    >
      <Text role="body" color="textSecondary">
        {t('artists.location.body')}
      </Text>
      <View style={{ alignItems: 'flex-start' }}>
        <Button
          label={t('artists.location.action')}
          variant="secondary"
          size="sm"
          onPress={onRequest}
          testID="artists-location-request"
        />
      </View>
    </Box>
  )
}

function Loading() {
  return (
    <Box gap="lg" paddingX="lg" testID="artists-loading">
      {[0, 1].map((fila) => (
        <Box key={fila} gap="xs">
          <Box direction="row" gap="xxs">
            <Skeleton height={188} width={150} radius="md" />
            <Skeleton height={188} width={150} radius="md" />
          </Box>
          <Box direction="row" gap="xs" align="center">
            <Skeleton height={36} width={36} radius="full" />
            <Skeleton height={16} width="50%" />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

/** Margen lateral, para que la grilla y el carrusel compartan la misma guía. */
export const ARTISTS_GUTTER = SCREEN_GUTTER
