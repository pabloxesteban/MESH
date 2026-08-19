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
import {
  haversineKm,
  roundDistanceKm,
  type GeoCoordinates,
  type MatchReason,
} from '@mesh/domain'

import {
  Box,
  Button,
  EmptyState,
  HAIRLINE,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useEffect } from 'react'

import { track } from '@/analytics/track.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { FixtureBadge } from '@/components/FixtureBadge.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { useDeviceLocation } from './useDeviceLocation.ts'
import {
  useMatches,
  type MatchWithProfessional,
  type ProjectBriefInput,
} from './useMatches.ts'

export interface MatchesScreenProps {
  userId: string | null
  today: string
  onExplore: () => void
  onOpenProfile: (slug: string) => void
  /** Ausente cuando la pantalla no puede ofrecer el atajo (ej. sin sesión). */
  onSearchByPhotos?: (() => void) | undefined
  /** Con proyecto, el match corre aunque no haya perfil de gusto. */
  project?: ProjectBriefInput | undefined
}

export function MatchesScreen({
  userId,
  today,
  onExplore,
  onOpenProfile,
  onSearchByPhotos,
  project,
}: MatchesScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const state = useMatches('tattoo', userId, today, project)
  const device = useDeviceLocation()

  // Los eventos de lista se emiten en un efecto, no durante el render: emitir
  // desde el cuerpo del componente los dispararía otra vez en cada re-render.
  useEffect(() => {
    if (state.isLoading || state.error != null) return
    if (!state.isReady) {
      track({ name: 'match_list_empty', props: { reason: 'not_ready' } })
      return
    }
    if (state.matches.length === 0) {
      track({ name: 'match_list_empty', props: { reason: 'no_candidates' } })
      return
    }
    state.matches.forEach((entry, index) => {
      track({
        name: 'match_viewed',
        props: {
          professional_id: entry.match.professionalId,
          band: entry.match.band,
          rank: index + 1,
          matching_version: entry.match.matchingVersion,
        },
      })
    })
  }, [state.isLoading, state.error, state.isReady, state.matches])

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
          {...(onSearchByPhotos != null
            ? {
                secondaryAction: {
                  label: t('matches.notReady.searchByPhotos'),
                  onPress: onSearchByPhotos,
                },
              }
            : {})}
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
          {...(onSearchByPhotos != null
            ? {
                secondaryAction: {
                  label: t('matches.empty.searchByPhotos'),
                  onPress: onSearchByPhotos,
                },
              }
            : {})}
          testID="matches-empty"
        />
      )
    }

    return (
      <Box gap="sm" testID="matches-list">
        {device.status === 'unrequested' || device.status === 'denied' ? (
          <LocationPrompt
            denied={device.status === 'denied'}
            onRequest={device.request}
          />
        ) : null}
        {state.matches.map((entry) => (
          <MatchCard
            key={entry.match.professionalId}
            entry={entry}
            deviceCoordinates={device.coordinates}
            onPress={() => {
              track({
                name: 'professional_profile_viewed',
                props: {
                  professional_id: entry.match.professionalId,
                  source: 'match',
                },
              })
              onOpenProfile(entry.professional.slug)
            }}
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
  deviceCoordinates,
  onPress,
}: {
  entry: MatchWithProfessional
  deviceCoordinates: GeoCoordinates | null
  onPress: () => void
}) {
  const t = useT()
  const theme = useTheme()
  const { match, professional } = entry

  // Display-only: la distancia nunca entra al puntaje ni al orden, que ya
  // vino decidido por barrio (`match/2`). Solo se muestra cuando las DOS
  // partes dieron su ubicación real — nunca se estima para nadie.
  const distanceKm =
    deviceCoordinates != null && professional.studioCoordinates != null
      ? roundDistanceKm(
          haversineKm(deviceCoordinates, professional.studioCoordinates),
        )
      : null

  return (
    <View
      testID={`match-${professional.slug}`}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${professional.displayName}. ${t(
        `matches.band.${match.band}` as TranslationKey,
      )}${professional.isFixture ? `. ${t('profile.fixture')}` : ''}`}
      onTouchEnd={onPress}
      style={{
        borderRadius: radius.md,
        backgroundColor: theme.surfaceRaised,
        padding: spacing.sm,
        gap: spacing.xs,
      }}
    >
      {/* La banda va ARRIBA, no al lado del nombre. Al lado, un nombre largo se
          corta con puntos suspensivos para dejarle lugar a una etiqueta de dos
          palabras — y el nombre del artista es lo único que la persona vino a
          leer. */}
      <Box direction="row" align="center" gap="xs">
        {/* La banda, nunca el puntaje. El puntaje crudo vive en la columna
            `matches.score` para poder auditarlo, no en la pantalla.

            El color va de la marca hacia el neutro según la banda, y no de
            verde a rojo: un encaje "posible" no es un error ni una advertencia,
            es un encaje del que sabemos menos. Semaforizarlo convertiría una
            escala de confianza en un juicio. */}
        <BandTag band={match.band} />
        {professional.isFixture ? (
          <FixtureBadge testID="match-fixture-badge" />
        ) : null}
        {distanceKm != null ? (
          <Text role="micro" color="textSecondary" testID="match-distance">
            {t('matches.distance', { km: distanceKm })}
          </Text>
        ) : null}
      </Box>

      <Text role="title" numberOfLines={2}>
        {professional.displayName}
      </Text>

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
 * El permiso de ubicación de quien busca. Nunca se pide solo — un botón
 * explícito, con la razón escrita al lado, igual que del lado del artista.
 * Rechazado una vez, no vuelve a insistir: la distancia es un plus, no algo
 * que MESH necesite para funcionar.
 */
function LocationPrompt({
  denied,
  onRequest,
}: {
  denied: boolean
  onRequest: () => void
}) {
  const t = useT()

  if (denied) {
    return (
      <Box testID="matches-location-denied" paddingY="xs">
        <Text role="micro" color="textTertiary">
          {t('matches.location.prompt.denied')}
        </Text>
      </Box>
    )
  }

  return (
    <Box
      testID="matches-location-prompt"
      gap="xs"
      padding="sm"
      radius="md"
      border="borderStrong"
    >
      <Text role="label">{t('matches.location.prompt.title')}</Text>
      <Text role="micro" color="textSecondary">
        {t('matches.location.prompt.body')}
      </Text>
      <Button
        label={t('matches.location.prompt.action')}
        variant="secondary"
        size="sm"
        onPress={onRequest}
        testID="matches-location-request"
      />
    </Box>
  )
}

/**
 * Convierte una razón derivada en texto.
 *
 * Los términos son slugs de taxonomía o nombres de ciudad, no prosa: la
 * plantilla es lo único que aporta idioma, y viene del catálogo de i18n. Así una
 * razón no puede decir algo que no esté escrito de antemano.
 */
/**
 * La banda, como etiqueta coloreada.
 *
 * `strong` lleva el relleno de marca, `good` el segundo acento, `possible` va
 * neutra. La progresión es de intensidad, no de semáforo.
 */
function BandTag({ band }: { band: MatchWithProfessional['match']['band'] }) {
  const t = useT()
  const theme = useTheme()
  const label = t(`matches.band.${band}` as TranslationKey)

  const relleno =
    band === 'strong'
      ? theme.accentFill
      : band === 'good'
        ? theme.accentAltFill
        : null

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xxs,
        borderRadius: radius.full,
        borderWidth: HAIRLINE,
        borderColor: relleno ?? theme.borderStrong,
        backgroundColor: relleno ?? 'transparent',
      }}
    >
      <Text
        role="micro"
        color={relleno != null ? 'accentContrast' : 'textSecondary'}
      >
        {label}
      </Text>
    </View>
  )
}

function renderReason(
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
  reason: MatchReason,
): string {
  // Bug encontrado acá, no inventado ahora: esto decidía "¿es un slug de
  // estilo?" probando la traducción y comparando si volvió sin cambios. La
  // prueba asumía que una clave desconocida se devuelve a sí misma —
  // `translate()` en realidad devuelve `undefined` para una clave que no
  // existe, así que la comparación nunca podía dar "no es un estilo", y
  // "En Villa Lugano" salía como "En undefined". Estuvo dormido hasta que el
  // barrio empezó a discriminar de verdad: antes, ningún match real generaba
  // una razón de ubicación con qué probarlo.
  //
  // El arreglo es no adivinar: `reason.component` ya dice si el término es un
  // slug de estilo o no. Solo 'style' necesita traducción.
  const params: Record<string, string | number> = {}
  reason.terms.forEach((term, index) => {
    const key = index === 0 ? 'termino' : `termino${index + 1}`
    params[key] =
      reason.component === 'style'
        ? t(`style.tattoo.${term}` as TranslationKey)
        : term
  })
  return t(reason.templateKey as TranslationKey, params)
}
