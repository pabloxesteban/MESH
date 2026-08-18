/**
 * El mazo.
 *
 * Los cuatro estados están acá y ninguno es un callejón: cargando muestra
 * skeletons con la forma real de una tarjeta, vacío ofrece qué hacer, error
 * ofrece reintentar, y éxito es el mazo.
 *
 * Los tres botones no son un plan B de accesibilidad: son la interfaz, y el
 * gesto es el atajo. Llaman a la misma función, así que no pueden divergir.
 */

import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  EmptyState,
  HAIRLINE,
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
import { ErrorView } from '@/components/ErrorView.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'

import { ArtworkCard } from './ArtworkCard.tsx'
import { SwipeCard, type SwipeDirection } from './SwipeCard.tsx'
import { useDiscoveryDeck, type Decision } from './useDiscoveryDeck.ts'

const DIRECTION_TO_DECISION: Record<SwipeDirection, Decision> = {
  left: 'pass',
  right: 'like',
  up: 'save',
}

export interface DeckScreenProps {
  categorySlug: string
  userId: string | null
  onOpenProfile?: (professionalSlug: string) => void
}

export function DeckScreen({ categorySlug, userId }: DeckScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const deck = useDiscoveryDeck(categorySlug, userId)

  function decide(decision: Decision) {
    // El háptico confirma una decisión de la persona.
    // `pass` no lleva háptico: pasar es lo que más se hace, y vibrar en cada
    // paso convierte la confirmación en ruido de fondo. Ver tokens/haptics.ts.
    if (decision === 'like') haptic('like')
    if (decision === 'save') haptic('save')
    deck.decide(decision)
  }

  const body = (() => {
    if (deck.error != null) {
      return (
        <ErrorView
          error={deck.error}
          onRetry={deck.retry}
          testID="deck-error"
        />
      )
    }

    if (deck.isLoading) {
      // El skeleton tiene la forma de una tarjeta, no de una barra genérica: un
      // esqueleto que no se parece a lo que viene hace que la llegada del
      // contenido se sienta como un salto.
      return (
        <Box gap="sm" testID="deck-loading">
          <Skeleton height={420} radius="lg" />
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={16} />
        </Box>
      )
    }

    if (deck.isEmpty) {
      return (
        <EmptyState
          title={t('discovery.empty.title')}
          body={t('discovery.empty.body')}
          action={{ label: t('discovery.empty.action'), onPress: deck.retry }}
          testID="deck-empty"
        />
      )
    }

    return (
      <View style={{ flex: 1 }} testID="deck-cards">
        {/* Se pintan al revés para que la primera quede arriba en el eje Z sin
            necesitar zIndex por tarjeta. */}
        {[...deck.cards].reverse().map((item, indexFromBack) => {
          const depth = deck.cards.length - 1 - indexFromBack
          const isTop = depth === 0
          const card = (
            <ArtworkCard
              item={item}
              isTop={isTop}
              {...(isTop ? { testID: 'deck-card-top' } : {})}
            />
          )

          return (
            <View
              key={item.portfolioItemId}
              style={{
                ...StyleSheetAbsoluteFill,
                // Las de atrás se achican apenas. Es lo que comunica que hay
                // más, sin mostrar contenido que todavía no le toca a nadie.
                transform: [
                  { scale: 1 - depth * 0.03 },
                  { translateY: depth * spacing.xs },
                ],
              }}
              pointerEvents={isTop ? 'auto' : 'none'}
              // Las de atrás no existen para el lector de pantalla.
              accessibilityElementsHidden={!isTop}
              importantForAccessibility={isTop ? 'auto' : 'no-hide-descendants'}
            >
              {isTop ? (
                <SwipeCard
                  onDecide={(direction) =>
                    decide(DIRECTION_TO_DECISION[direction])
                  }
                  testID="deck-swipe"
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
      testID="screen-deck"
    >
      <Box paddingX="lg" paddingY="sm">
        <Text role="label" color="textSecondary">
          {t('discovery.title')}
        </Text>
      </Box>

      <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER }}>{body}</View>

      <DeckControls
        disabled={deck.top == null}
        canUndo={deck.canUndo}
        onDecide={decide}
        onUndo={deck.undo}
      />
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
  onDecide: (decision: Decision) => void
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
        label={t('discovery.action.undo')}
        onPress={onUndo}
        disabled={!canUndo}
        testID="deck-undo"
      />
      <ControlButton
        label={t('discovery.action.pass')}
        onPress={() => onDecide('pass')}
        disabled={disabled}
        testID="deck-pass"
      />
      <ControlButton
        label={t('discovery.action.save')}
        onPress={() => onDecide('save')}
        disabled={disabled}
        testID="deck-save"
      />
      <ControlButton
        label={t('discovery.action.like')}
        onPress={() => onDecide('like')}
        disabled={disabled}
        testID="deck-like"
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
        borderWidth: HAIRLINE,
        // Deshabilitado se comunica con color, no con opacidad, igual que en
        // `Button`. Una opacidad global también aclara el borde y el texto
        // deja de pasar contraste sin que ningún token lo registre.
        borderColor: disabled ? theme.borderSubtle : theme.borderStrong,
      }}
    >
      {/* La etiqueta es texto, no un ícono suelto: un corazón y una cruz son
          convención de otra app, no significado universal. */}
      <Text role="label" color={disabled ? 'textTertiary' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  )
}

/** `StyleSheet.absoluteFillObject`, sin importar StyleSheet solo para esto. */
const StyleSheetAbsoluteFill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const
