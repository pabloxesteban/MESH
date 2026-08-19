/**
 * Inicio: descubrir, en dos modos.
 *
 * El cambio de modelo de MESH tiene un problema práctico que hay que resolver
 * acá y no esquivar: **la grilla no alimenta el motor de gusto.** Tocar una
 * obra es mirarla, no opinar sobre ella, y sin `interactions` no hay vector de
 * gusto, y sin vector no hay encajes. El mazo es la única superficie que
 * enseña.
 *
 * Por eso Descubrir tiene dos modos y ninguno es secundario:
 *
 * · **De a una** — el mazo. Se decide, y MESH aprende.
 * · **Grilla** — se recorre y se compara. Es lo que faltaba.
 *
 * **Con qué modo abre lo decide un dato, no una preferencia escondida:**
 * mientras haya menos de `READY_MIN_INTERACTIONS` decisiones, abre en el mazo,
 * porque es lo único que puede sacar a MESH de no conocerte. A partir de ahí
 * abre en la grilla, porque ya puede comparar por vos. El control siempre está
 * a la vista y se cambia cuando se quiera.
 *
 * Ver docs/design/MESH-DESIGN-DECISIONS.md D-009.
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, View, type NativeScrollEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { READY_MIN_INTERACTIONS } from '@mesh/domain'

import {
  Box,
  EmptyState,
  FilterChip,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { ArtworkGrid } from './ArtworkGrid.tsx'
import { DeckScreen } from './DeckScreen.tsx'
import { fetchDecisionCount } from './queries.ts'
import { useDiscoveryGrid } from './useDiscoveryGrid.ts'

export type DiscoveryMode = 'deck' | 'grid'

export interface DiscoveryScreenProps {
  categorySlug: string
  userId: string | null
  onOpenProfile: (slug: string) => void
}

/** A cuántos píxeles del final se pide la página siguiente. */
const LOAD_MORE_MARGIN = 600

export function DiscoveryScreen({
  categorySlug,
  userId,
  onOpenProfile,
}: DiscoveryScreenProps) {
  const decisions = useQuery({
    queryKey: ['decision-count', userId],
    enabled: userId != null,
    queryFn: fetchDecisionCount,
  })

  const [chosen, setChosen] = useState<DiscoveryMode | null>(null)

  // Mientras el conteo carga no se decide nada: arrancar en un modo y saltar al
  // otro doscientos milisegundos después es peor que esperar.
  if (decisions.isPending && userId != null) {
    return <Loading />
  }

  const suggested: DiscoveryMode =
    (decisions.data ?? 0) < READY_MIN_INTERACTIONS ? 'deck' : 'grid'
  const mode = chosen ?? suggested

  return (
    <DiscoverySurface
      mode={mode}
      onChangeMode={setChosen}
      // El aviso solo mientras MESH está aprendiendo, y solo en el mazo: en la
      // grilla sería un reproche por estar mirando.
      showLearning={suggested === 'deck' && mode === 'deck'}
      categorySlug={categorySlug}
      userId={userId}
      onOpenProfile={onOpenProfile}
    />
  )
}

function DiscoverySurface({
  mode,
  onChangeMode,
  showLearning,
  categorySlug,
  userId,
  onOpenProfile,
}: {
  mode: DiscoveryMode
  onChangeMode: (mode: DiscoveryMode) => void
  showLearning: boolean
  categorySlug: string
  userId: string | null
  onOpenProfile: (slug: string) => void
}) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  if (mode === 'deck') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface }}>
        <View style={{ paddingTop: insets.top }}>
          <ModeSwitch mode={mode} onChange={onChangeMode} />
          {showLearning ? <LearningNote /> : null}
        </View>
        {/* El mazo trae su propio encabezado y sus propios insets; se le deja
            el resto de la pantalla entera. */}
        <View style={{ flex: 1 }}>
          <DeckScreen
            categorySlug={categorySlug}
            userId={userId}
            onOpenProfile={onOpenProfile}
          />
        </View>
      </View>
    )
  }

  return (
    <GridMode
      categorySlug={categorySlug}
      userId={userId}
      onOpenProfile={onOpenProfile}
      onChangeMode={onChangeMode}
    />
  )
}

function GridMode({
  categorySlug,
  userId,
  onOpenProfile,
  onChangeMode,
}: {
  categorySlug: string
  userId: string | null
  onOpenProfile: (slug: string) => void
  onChangeMode: (mode: DiscoveryMode) => void
}) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const grid = useDiscoveryGrid(categorySlug, userId)

  const body = (() => {
    if (grid.error != null) {
      return (
        <ErrorView
          error={grid.error}
          onRetry={grid.retry}
          testID="discovery-grid-error"
        />
      )
    }

    if (grid.isLoading) return <Loading />

    if (grid.isFilteredEmpty) {
      // Vacío por el filtro, que es un problema distinto de no tener catálogo:
      // acá la salida es sacar el filtro, no reintentar.
      return (
        <EmptyState
          title={t('discovery.grid.filtered.title')}
          body={t('discovery.grid.filtered.body')}
          action={{
            label: t('discovery.grid.filtered.action'),
            onPress: () => grid.setActiveStyle(null),
          }}
          testID="discovery-grid-filtered-empty"
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
          testID="discovery-grid-empty"
        />
      )
    }

    return (
      <ArtworkGrid
        items={grid.items}
        onOpen={(item) => onOpenProfile(item.professionalSlug)}
      />
    )
  })()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      onScroll={({ nativeEvent }) => {
        if (cercaDelFinal(nativeEvent)) grid.loadMore()
      }}
      scrollEventThrottle={200}
      testID="screen-discovery"
    >
      <ModeSwitch mode="grid" onChange={onChangeMode} />

      {grid.availableStyles.length > 0 ? (
        <StyleFilters
          styles={grid.availableStyles}
          active={grid.activeStyle}
          onSelect={grid.setActiveStyle}
        />
      ) : null}

      {body}
    </ScrollView>
  )
}

function cercaDelFinal(event: NativeScrollEvent): boolean {
  const { contentOffset, contentSize, layoutMeasurement } = event
  return (
    contentOffset.y + layoutMeasurement.height >=
    contentSize.height - LOAD_MORE_MARGIN
  )
}

/**
 * El control de modo.
 *
 * Dos chips y no un segmented control del sistema: MESH no usa controles
 * nativos de iOS en ningún otro lado, y uno solo acá se leería pegado. Las
 * etiquetas dicen qué se ve, no cómo se llama la superficie — "De a una" es
 * más claro que "Mazo" para alguien que abre la app por primera vez.
 */
function ModeSwitch({
  mode,
  onChange,
}: {
  mode: DiscoveryMode
  onChange: (mode: DiscoveryMode) => void
}) {
  const t = useT()

  return (
    <Box
      direction="row"
      gap="xxs"
      paddingX="lg"
      paddingY="xs"
      accessibilityLabel={t('discovery.mode.label')}
    >
      <FilterChip
        label={t('discovery.mode.deck')}
        selected={mode === 'deck'}
        onToggle={() => onChange('deck')}
        testID="discovery-mode-deck"
      />
      <FilterChip
        label={t('discovery.mode.grid')}
        selected={mode === 'grid'}
        onToggle={() => onChange('grid')}
        testID="discovery-mode-grid"
      />
    </Box>
  )
}

/**
 * Por qué la app abrió en el mazo.
 *
 * Sin esta línea, alguien que eligió la grilla ayer y hoy encuentra el mazo
 * cree que la app se rompió. Dice el motivo y no pide nada.
 */
function LearningNote() {
  const t = useT()
  return (
    <Box paddingX="lg" paddingBottom="xs">
      <Text role="micro" color="textTertiary" testID="discovery-learning">
        {t('discovery.learning')}
      </Text>
    </Box>
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
      testID="discovery-filters"
    >
      <FilterChip
        label={t('discovery.filter.all')}
        selected={active == null}
        onToggle={() => onSelect(null)}
        testID="discovery-filter-all"
      />
      {styles.map((slug) => (
        <FilterChip
          key={slug}
          label={t(`style.tattoo.${slug}` as TranslationKey)}
          selected={active === slug}
          onToggle={() => onSelect(active === slug ? null : slug)}
          testID={`discovery-filter-${slug}`}
        />
      ))}
    </ScrollView>
  )
}

function Loading() {
  return (
    <Box gap="xxs" paddingX="lg" testID="discovery-loading">
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
    </Box>
  )
}
