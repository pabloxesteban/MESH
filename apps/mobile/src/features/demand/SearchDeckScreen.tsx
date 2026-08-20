/**
 * Inicio, cuando la persona vino a ofrecer: el mazo de búsquedas.
 *
 * Es el espejo del mazo de obra y comparte su gramática —deslizar, botones
 * equivalentes, deshacer— porque es la misma app. Lo que cambia es qué hay del
 * otro lado: acá cada tarjeta es alguien esperando, no una foto.
 *
 * De ahí las dos diferencias que sí importan:
 *
 * · **Dos decisiones, no tres.** Guardar no existe. Un interés le llega a una
 *   persona; una tercera categoría intermedia solo serviría para postergar.
 * · **Deshacer pesa más que en el otro mazo.** Allá un error pierde una foto.
 *   Acá manda un aviso a alguien, así que el botón está siempre y la escritura
 *   se revierte de verdad, en la base.
 *
 * Los cuatro estados están acá y ninguno es un callejón. El vacío es el más
 * importante y el más probable al principio: casi nadie abrió su búsqueda
 * todavía, y la pantalla lo dice sin disfrazarlo de "volvé pronto".
 */

import { useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  EmptyState,
  MIN_TOUCH_TARGET,
  Pressable,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  haptic,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { track } from '@/analytics/track.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'

import { SwipeCard, type SwipeDirection } from '../discovery/SwipeCard.tsx'
import { SearchCard } from './SearchCard.tsx'
import type { Verdict } from './queries.ts'
import { ProposalComposer } from '../brief/ProposalComposer.tsx'
import { useSearchDeck } from './useSearchDeck.ts'

export interface SearchDeckScreenProps {
  categorySlug: string
  /** `null` mientras no haya perfil de artista: entonces la pantalla lo explica. */
  professionalId: string | null
  /**
   * Lleva al estudio a crear el perfil.
   *
   * Obligatorio, no opcional: sin perfil esta pantalla no tiene nada que
   * mostrar, y un estado vacío sin salida es un callejón.
   */
  onOpenStudio: () => void
}

export function SearchDeckScreen({
  categorySlug,
  professionalId,
  onOpenStudio,
}: SearchDeckScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const deck = useSearchDeck(categorySlug, professionalId)
  // La búsqueda a la que se le está escribiendo una propuesta. Mientras hay
  // una, la tarjeta NO se decidió: cancelar la deja donde estaba.
  const [proponiendo, setProponiendo] = useState<{
    projectId: string
    title: string
  } | null>(null)

  function decide(verdict: Verdict, via: 'gesture' | 'button') {
    const search = deck.top
    if (search != null) {
      // `via` es lo que nos dice si el camino accesible efectivamente se usa.
      // Si nadie toca los botones, o están escondidos o no se entienden.
      track({
        name: verdict === 'interest' ? 'search_interested' : 'search_passed',
        props: { project_id: search.projectId, via },
      })
    }

    // El háptico confirma lo que le llega a otra persona. Pasar no vibra:
    // pasar es lo que más se hace, y vibrar en cada paso convierte la
    // confirmación en ruido de fondo.
    // **Interesarse ya no es un booleano.** Desde ADR-020 se responde con una
    // propuesta, y la base rechaza un interés sin precio — así que la tarjeta
    // no se decide todavía: se abre el compositor. Pasar sigue siendo un toque.
    if (verdict === 'interest') {
      haptic('like')
      if (search != null) {
        setProponiendo({ projectId: search.projectId, title: search.title })
      }
      return
    }

    deck.decide(verdict)
  }

  const body = (() => {
    // Antes que cualquier otro estado: sin perfil publicado no hay mazo que
    // mostrar, y decirlo con un vacío genérico ("no hay búsquedas") sería
    // mentir sobre la causa.
    if (professionalId == null) {
      return (
        <EmptyState
          title={t('demand.noProfile.title')}
          body={t('demand.noProfile.body')}
          action={{
            label: t('demand.noProfile.action'),
            onPress: onOpenStudio,
          }}
          testID="demand-no-profile"
        />
      )
    }

    if (deck.error != null) {
      return (
        <ErrorView
          error={deck.error}
          onRetry={deck.retry}
          testID="demand-error"
        />
      )
    }

    if (deck.isLoading) {
      return (
        <Box gap="sm" testID="demand-loading">
          <Skeleton height={420} radius="lg" />
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={16} />
        </Box>
      )
    }

    if (deck.isEmpty) {
      return (
        <EmptyState
          title={t('demand.empty.title')}
          body={t('demand.empty.body')}
          action={{ label: t('demand.empty.action'), onPress: deck.retry }}
          testID="demand-empty"
        />
      )
    }

    return (
      <View style={{ flex: 1 }} testID="demand-cards">
        {/* Se pintan al revés para que la primera quede arriba en el eje Z sin
            necesitar zIndex por tarjeta. */}
        {[...deck.cards].reverse().map((search, indexFromBack) => {
          const depth = deck.cards.length - 1 - indexFromBack
          const isTop = depth === 0
          const card = (
            <SearchCard
              search={search}
              isTop={isTop}
              {...(isTop ? { testID: 'demand-card-top' } : {})}
            />
          )

          return (
            <View
              key={search.projectId}
              style={{
                ...ABSOLUTE_FILL,
                transform: [
                  { scale: 1 - depth * 0.03 },
                  { translateY: depth * spacing.xs },
                ],
              }}
              pointerEvents={isTop ? 'auto' : 'none'}
              accessibilityElementsHidden={!isTop}
              importantForAccessibility={isTop ? 'auto' : 'no-hide-descendants'}
            >
              {isTop ? (
                <SwipeCard
                  onDecide={(direction: SwipeDirection) => {
                    // Arriba no decide nada: guardar no existe en este mazo, y
                    // hacer que "arriba" signifique interés sería sorprender a
                    // alguien que ya aprendió el gesto del otro lado.
                    if (direction === 'up') return
                    decide(
                      direction === 'right' ? 'interest' : 'pass',
                      'gesture',
                    )
                  }}
                  testID="demand-swipe"
                >
                  {card}
                </SwipeCard>
              ) : (
                card
              )}
            </View>
          )
        })}
      </View>
    )
  })()

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      testID="screen-demand"
    >
      <Box paddingX="lg" paddingY="sm">
        <Text role="label" color="textSecondary">
          {t('demand.title')}
        </Text>
      </Box>

      <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER }}>{body}</View>

      {/* La propuesta reemplaza a los controles mientras se escribe: son dos
          decisiones distintas y tenerlas juntas invita a deslizar sin querer
          sobre un formulario a medio llenar. */}
      {proponiendo != null && professionalId != null ? (
        <Box paddingX="lg" paddingY="sm">
          <ProposalComposer
            projectId={proponiendo.projectId}
            professionalId={professionalId}
            searchTitle={proponiendo.title}
            onSent={() => {
              setProponiendo(null)
              // Recién ahora la tarjeta se va: lo que la saca del mazo es la
              // propuesta mandada, no el gesto.
              deck.decide('interest')
            }}
            onCancel={() => setProponiendo(null)}
          />
        </Box>
      ) : (
        <DeckControls
          disabled={deck.top == null}
          canUndo={deck.canUndo}
          onDecide={(verdict) => decide(verdict, 'button')}
          onUndo={() => {
            const undone = deck.undoTarget
            if (undone != null) {
              track({
                name: 'search_undone',
                props: {
                  project_id: undone.projectId,
                  previous_verdict: undone.verdict,
                },
              })
            }
            deck.undo()
          }}
        />
      )}
    </View>
  )
}

/**
 * Los botones.
 *
 * Cada gesto tiene su equivalente acá, con etiqueta y área táctil de ≥44pt.
 * Deshacer también es un botón: un gesto de deshacer escondido es un gesto que
 * no existe.
 */
function DeckControls({
  disabled,
  canUndo,
  onDecide,
  onUndo,
}: {
  disabled: boolean
  canUndo: boolean
  onDecide: (verdict: Verdict) => void
  onUndo: () => void
}) {
  const t = useT()

  return (
    <Box
      direction="row"
      gap="sm"
      align="center"
      justify="center"
      paddingY="md"
      paddingX="lg"
    >
      <ControlButton
        label={t('demand.action.undo')}
        onPress={onUndo}
        disabled={!canUndo}
        testID="demand-undo"
      />
      <ControlButton
        label={t('demand.action.pass')}
        onPress={() => onDecide('pass')}
        disabled={disabled}
        testID="demand-pass"
      />
      <ControlButton
        label={t('demand.action.interest')}
        onPress={() => onDecide('interest')}
        disabled={disabled}
        testID="demand-interest"
      />
    </Box>
  )
}

function ControlButton({
  label,
  onPress,
  disabled,
  testID,
}: {
  label: string
  onPress: () => void
  disabled: boolean
  testID: string
}) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        minWidth: MIN_TOUCH_TARGET,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surfaceRaised,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text role="label" color={disabled ? 'textTertiary' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  )
}

/** `StyleSheet.absoluteFillObject`, sin importar StyleSheet solo para esto. */
const ABSOLUTE_FILL = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const
