/**
 * Explorar: toda la obra, esté cerca o lejos.
 *
 * Es la superficie de ideas. Inicio contesta "quién tatúa cerca mío"; esto
 * contesta "qué me quiero tatuar", y para eso la distancia no importa — un
 * trabajo de alguien de Rosario sirve igual como idea.
 *
 * Es la grilla que ya existía en Inicio, movida acá. Ver
 * docs/design/MESH-DESIGN-DECISIONS.md D-010.
 *
 * **Lo que la separa de Pinterest no es la grilla, es a dónde lleva.** Cada
 * obra abre a la persona que la hizo, y esa persona está a un mensaje. Una
 * grilla que se pueda recorrer sin llegar nunca a alguien sería Pinterest con
 * otra tipografía.
 *
 * La obra que se toca crece hasta ser el perfil, y al volver encoge hasta su
 * lugar en la grilla — si ese lugar todavía se ve. Ver features/transitions.
 */

import { ScrollView, View } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  EmptyState,
  FilterChip,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  spacing,
  useMotion,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { GrowingArtwork } from '@/features/transitions/GrowingArtwork.tsx'
import { useArtworkReturn } from '@/features/transitions/useArtworkReturn.ts'

import { ArtworkGrid } from './ArtworkGrid.tsx'
import { mediaUrl } from './queries.ts'
import { useDiscoveryGrid } from './useDiscoveryGrid.ts'

/** A cuántos píxeles del final se pide la página siguiente. */
const LOAD_MORE_MARGIN = 600

export interface ExploreScreenProps {
  categorySlug: string
  userId: string | null
  onOpenArtist: (slug: string) => void
  /** Buscar por fotos. Dejó de ser pestaña y se entra desde acá. */
  onSearchByPhotos?: (() => void) | undefined
  /**
   * Estilo con el que abre el filtro.
   *
   * Es a dónde llega "buscar con una foto": la IA clasificó la referencia
   * contra la taxonomía y Explorar se abre mostrando eso. Antes ese camino
   * terminaba en una lista de encajes; ahora termina en obra, que es lo que la
   * persona fue a ver.
   */
  initialStyle?: string | undefined
}

export function ExploreScreen({
  categorySlug,
  userId,
  onOpenArtist,
  onSearchByPhotos,
  initialStyle,
}: ExploreScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { durationOf } = useMotion()
  const grid = useDiscoveryGrid(categorySlug, userId, initialStyle ?? null)
  const back = useArtworkReturn('explore')

  // El scroll lo leen dos cosas con necesidades opuestas: el paralaje de las
  // columnas lo quiere en cada cuadro y en el hilo de UI, y `loadMore` lo
  // quiere lo menos posible y en JavaScript. Por eso el handler es uno solo y
  // reparte.
  const scrollY = useSharedValue(0)
  const alScrollear = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y
      const alFinal =
        event.contentOffset.y + event.layoutMeasurement.height >=
        event.contentSize.height - LOAD_MORE_MARGIN
      if (alFinal) runOnJS(grid.loadMore)()
    },
  })

  const body = (() => {
    if (grid.error != null) {
      return (
        <ErrorView
          error={grid.error}
          onRetry={grid.retry}
          testID="explore-error"
        />
      )
    }

    if (grid.isLoading) return <Loading />

    if (grid.isFilteredEmpty) {
      // Vacío por el filtro, que es otro problema que no tener catálogo: acá la
      // salida es sacar el filtro, no reintentar.
      return (
        <EmptyState
          title={t('discovery.grid.filtered.title')}
          body={t('discovery.grid.filtered.body')}
          action={{
            label: t('discovery.grid.filtered.action'),
            onPress: () => grid.setActiveStyle(null),
          }}
          testID="explore-filtered-empty"
        />
      )
    }

    if (grid.isEmpty) {
      return (
        <EmptyState
          title={t('discovery.grid.empty.title')}
          body={t('discovery.grid.empty.body')}
          action={{
            label: t('discovery.grid.empty.action'),
            onPress: grid.retry,
          }}
          testID="explore-empty"
        />
      )
    }

    return (
      <ArtworkGrid
        items={grid.items}
        onOpen={(item) => onOpenArtist(item.professionalSlug)}
        hiddenPieceId={back.hiddenPieceId}
        scrollY={scrollY}
      />
    )
  })()

  return (
    // La raíz existe por la vuelta: la copia se posiciona en coordenadas de
    // ventana, y adentro del ScrollView quedaría atada al scroll.
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      {/* `Animated.ScrollView` y no `ScrollView`: el paralaje de las columnas
          se calcula en el hilo de UI, y con un `onScroll` de JavaScript a 200ms
          se movería a los saltos. El `loadMore` sigue viviendo en JavaScript
          —no hay nada que apurar ahí— y viaja por `runOnJS`. */}
      <Animated.ScrollView
        style={{ flex: 1, backgroundColor: theme.surface }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        onScroll={alScrollear}
        scrollEventThrottle={16}
        testID="screen-explore"
      >
        <Box gap="xs" paddingX="lg" paddingY="sm">
          <Box gap="xxs">
            <Text role="titleLg">{t('explore.title')}</Text>
            <Text role="micro" color="textTertiary">
              {t('explore.subtitle')}
            </Text>
          </Box>

          {/* El camino con IA vive acá y no en una pestaña propia: es la misma
            intención que explorar —encontrar obra parecida a una idea— con una
            entrada distinta. */}
          {onSearchByPhotos != null ? (
            <View style={{ alignItems: 'flex-start' }}>
              <Button
                label={t('explore.byPhotos')}
                variant="secondary"
                size="sm"
                onPress={onSearchByPhotos}
                testID="explore-by-photos"
              />
            </View>
          ) : null}
        </Box>

        {grid.availableStyles.length > 0 ? (
          <StyleFilters
            styles={grid.availableStyles}
            active={grid.activeStyle}
            onSelect={grid.setActiveStyle}
          />
        ) : null}

        {body}
      </Animated.ScrollView>

      {back.shrinking != null ? (
        <GrowingArtwork
          from={back.shrinking.from}
          to={back.shrinking.to}
          source={mediaUrl(back.shrinking.mediaPath, 'md')}
          blurhash={back.shrinking.blurhash}
          durationMs={durationOf('standard')}
          onArrived={back.onArrived}
          testID="explore-returning-artwork"
        />
      ) : null}
    </View>
  )
}

function StyleFilters({
  styles,
  active,
  onSelect,
}: {
  styles: readonly string[]
  active: string | null
  onSelect: (slug: string | null) => void
}) {
  const t = useT()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_GUTTER,
        gap: spacing.xxs,
        paddingBottom: spacing.xs,
      }}
      testID="explore-filters"
    >
      <FilterChip
        label={t('discovery.filter.all')}
        selected={active == null}
        onToggle={() => onSelect(null)}
        testID="explore-filter-all"
      />
      {styles.map((slug) => (
        <FilterChip
          key={slug}
          label={t(`style.tattoo.${slug}` as TranslationKey)}
          selected={active === slug}
          onToggle={() => onSelect(active === slug ? null : slug)}
          testID={`explore-filter-${slug}`}
        />
      ))}
    </ScrollView>
  )
}

function Loading() {
  return (
    <View style={{ paddingHorizontal: SCREEN_GUTTER }} testID="explore-loading">
      <Box direction="row" gap="xxs">
        <Box flex={1} gap="xxs">
          <Skeleton height={220} radius="md" />
          <Skeleton height={160} radius="md" />
        </Box>
        <Box flex={1} gap="xxs">
          <Skeleton height={160} radius="md" />
          <Skeleton height={220} radius="md" />
        </Box>
      </Box>
    </View>
  )
}
