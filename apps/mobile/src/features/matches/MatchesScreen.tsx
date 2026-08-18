/**
 * Para vos.
 *
 * La lista de matches. Tres cosas que definen esta pantalla:
 *
 * 1. **Banda, no porcentaje.** Con una ciudad y una docena de artistas, un
 *    "96%" es una afirmación de precisión que los datos no sostienen. Ver
 *    ADR-005.
 * 2. **Las razones se muestran, no se resumen.** Cada tarjeta dice por qué está
 *    ahí, y cada razón viene de un componente que efectivamente aportó.
 * 3. **La lista puede estar vacía y está bien.** Una lista corta y honesta le
 *    gana a una rellenada.
 */

import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { MatchReason } from '@mesh/domain'

import {
  Box,
  EmptyState,
  SCREEN_GUTTER,
  Skeleton,
  Tag,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { useMatches, type MatchWithProfessional } from './useMatches.ts'

export interface MatchesScreenProps {
  userId: string | null
  today: string
  onExplore: () => void
  onOpenProfile: (slug: string) => void
}

export function MatchesScreen({
  userId,
  today,
  onExplore,
  onOpenProfile,
}: MatchesScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const state = useMatches('tattoo', userId, today)

  const body = (() => {
    if (state.error != null) {
      return (
        <ErrorView
          error={state.error}
          onRetry={state.retry}
          testID="matches-error"
        />
      )
    }

    if (state.isLoading) {
      return (
        <Box gap="sm" testID="matches-loading">
          <Skeleton height={110} radius="md" />
          <Skeleton height={110} radius="md" />
          <Skeleton height={110} radius="md" />
        </Box>
      )
    }

    if (!state.isReady) {
      // Estado vacío honesto: dice cuántas faltan y por qué. Nada de una lista
      // de "populares" disfrazada de recomendación mientras tanto.
      return (
        <EmptyState
          title={t('matches.notReady.title')}
          body={t('matches.notReady.body', {
            faltan: state.interactionsToReady,
          })}
          action={{ label: t('matches.notReady.action'), onPress: onExplore }}
          testID="matches-not-ready"
        />
      )
    }

    if (state.matches.length === 0) {
      return (
        <EmptyState
          title={t('matches.empty.title')}
          body={t('matches.empty.body')}
          action={{ label: t('matches.empty.action'), onPress: onExplore }}
          testID="matches-empty"
        />
      )
    }

    return (
      <Box gap="sm" testID="matches-list">
        {state.matches.map((entry) => (
          <MatchCard
            key={entry.match.professionalId}
            entry={entry}
            onPress={() => onOpenProfile(entry.professional.slug)}
          />
        ))}
      </Box>
    )
  })()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        padding: SCREEN_GUTTER,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      testID="screen-matches"
    >
      <Box paddingBottom="md">
        <Text role="titleLg">{t('matches.title')}</Text>
      </Box>
      {body}
    </ScrollView>
  )
}

function MatchCard({
  entry,
  onPress,
}: {
  entry: MatchWithProfessional
  onPress: () => void
}) {
  const t = useT()
  const theme = useTheme()
  const { match, professional } = entry

  return (
    <View
      testID={`match-${professional.slug}`}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${professional.displayName}. ${t(
        `matches.band.${match.band}` as TranslationKey,
      )}`}
      onTouchEnd={onPress}
      style={{
        borderRadius: radius.md,
        backgroundColor: theme.surfaceRaised,
        padding: spacing.sm,
        gap: spacing.xs,
      }}
    >
      <Box direction="row" justify="space-between" align="center" gap="sm">
        <Text role="title" numberOfLines={1}>
          {professional.displayName}
        </Text>
        {/* La banda, nunca el puntaje. El puntaje crudo vive en la columna
            `matches.score` para poder auditarlo, no en la pantalla. */}
        <Tag label={t(`matches.band.${match.band}` as TranslationKey)} />
      </Box>

      <Box gap="xxs">
        {match.reasons.map((reason) => (
          <Text
            key={`${reason.component}:${reason.templateKey}`}
            role="micro"
            color="textSecondary"
          >
            {renderReason(t, reason)}
          </Text>
        ))}
      </Box>
    </View>
  )
}

/**
 * Convierte una razón derivada en texto.
 *
 * Los términos son slugs de taxonomía o nombres de ciudad, no prosa: la
 * plantilla es lo único que aporta idioma, y viene del catálogo de i18n. Así una
 * razón no puede decir algo que no esté escrito de antemano.
 */
function renderReason(
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
  reason: MatchReason,
): string {
  const params: Record<string, string | number> = {}
  reason.terms.forEach((term, index) => {
    const key = index === 0 ? 'termino' : `termino${index + 1}`
    // Un slug de estilo se traduce; una ciudad se muestra tal cual.
    const styleKey = `style.tattoo.${term}` as TranslationKey
    const translated = t(styleKey)
    params[key] = translated === styleKey ? term : translated
  })
  return t(reason.templateKey as TranslationKey, params)
}
