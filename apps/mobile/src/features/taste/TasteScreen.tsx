/**
 * Tu gusto.
 *
 * Tres estados de producto, no cuatro técnicos: todavía no alcanza, ya alcanza,
 * y error. Cada uno dice la verdad sobre cuánta evidencia hay.
 *
 * Lo que esta pantalla NO hace:
 *   - no muestra aversión: un paso es evidencia débil y presentarlo como un
 *     juicio sobre alguien es incorrecto;
 *   - no muestra un porcentaje de "compatibilidad";
 *   - no felicita a nadie por deslizar.
 *
 * Lo que sí hace es mostrar de dónde salió cada número. Un perfil que no se
 * puede auditar es un perfil en el que hay que creer, y MESH no pide eso.
 */

import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { READY_MIN_INTERACTIONS } from '@mesh/domain'

import {
  Box,
  Button,
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

import { useTaste } from './useTaste.ts'

export interface TasteScreenProps {
  userId: string | null
  onExplore: () => void
}

export function TasteScreen({ userId, onExplore }: TasteScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { taste, isLoading, error, retry, reset } = useTaste('tattoo', userId)

  const body = (() => {
    if (error != null) {
      return <ErrorView error={error} onRetry={retry} testID="taste-error" />
    }

    if (isLoading || taste == null) {
      return (
        <Box gap="sm" testID="taste-loading">
          <Skeleton width="70%" height={28} />
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
        </Box>
      )
    }

    if (!taste.isReady) {
      // Progreso honesto: dice cuántas faltan y por qué. No hay barra que se
      // llene sola, ni recompensa por llegar — llegar habilita una pantalla,
      // que ya es la recompensa.
      return (
        <Box gap="md" testID="taste-not-ready">
          <Text role="titleLg">{t('taste.progress.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('taste.progress.body', {
              faltan: taste.interactionsToReady,
              total: READY_MIN_INTERACTIONS,
            })}
          </Text>
          <EmptyState
            title={t('taste.progress.empty.title')}
            body={t('taste.progress.empty.body')}
            action={{ label: t('taste.progress.action'), onPress: onExplore }}
          />
        </Box>
      )
    }

    return (
      <Box gap="lg" testID="taste-ready">
        <Box gap="xxs">
          <Text role="titleLg">{t('taste.ready.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('taste.ready.body', { n: taste.decisiveCount })}
          </Text>
        </Box>

        <Box gap="sm">
          {taste.visible.map((entry) => (
            <View
              key={entry.styleSlug}
              testID={`taste-style-${entry.styleSlug}`}
              style={{
                borderRadius: radius.md,
                backgroundColor: theme.surfaceRaised,
                padding: spacing.sm,
                gap: spacing.xs,
              }}
            >
              <Box
                direction="row"
                justify="space-between"
                align="center"
                gap="sm"
              >
                <Text role="title">
                  {t(`style.tattoo.${entry.styleSlug}` as TranslationKey)}
                </Text>
                {/* La barra es la única representación del puntaje. No hay
                    número: "0,82" afirma una precisión que una docena de
                    decisiones no sostiene. Ver ADR-005. */}
                <StrengthBar value={entry.score} />
              </Box>

              {/* La evidencia, en crudo. Es lo que hace auditable al perfil. */}
              <Box direction="row" gap="xxs" wrap>
                {entry.likes > 0 ? (
                  <Tag label={t('taste.evidence.likes', { n: entry.likes })} />
                ) : null}
                {entry.saves > 0 ? (
                  <Tag label={t('taste.evidence.saves', { n: entry.saves })} />
                ) : null}
              </Box>
            </View>
          ))}
        </Box>

        <Box gap="xs">
          <Text role="micro" color="textTertiary">
            {t('taste.reset.explanation')}
          </Text>
          <ResetButton onReset={reset} />
        </Box>
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
      testID="screen-taste"
    >
      {body}
    </ScrollView>
  )
}

/**
 * Barra de fuerza.
 *
 * Se recorta a 0,95 a propósito: la función de saturación es asintótica a 1 y
 * nunca llega, así que una barra llena sería una afirmación que el modelo no
 * hace.
 */
function StrengthBar({ value }: { value: number }) {
  const theme = useTheme()
  const t = useT()
  const width = Math.min(0.95, value)

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      // El lector de pantalla recibe una descripción cualitativa, no un número:
      // es la misma decisión que las bandas de match.
      accessibilityLabel={t(
        value >= 0.6
          ? 'taste.strength.high'
          : value >= 0.35
            ? 'taste.strength.medium'
            : 'taste.strength.low',
      )}
      style={{
        width: spacing.xxl * 2,
        height: spacing.xs,
        borderRadius: radius.full,
        backgroundColor: theme.borderSubtle,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${width * 100}%`,
          height: '100%',
          backgroundColor: theme.accentFill,
        }}
      />
    </View>
  )
}

function ResetButton({ onReset }: { onReset: () => Promise<void> }) {
  const t = useT()
  return (
    <ConfirmButton
      label={t('taste.reset.action')}
      confirmLabel={t('taste.reset.confirm')}
      onConfirm={() => void onReset()}
      testID="taste-reset"
    />
  )
}

/**
 * Botón de dos toques para una acción destructiva.
 *
 * No es un diálogo modal: un modal interrumpe y se contesta por reflejo. Un
 * segundo toque sobre un botón que cambió de texto exige leer.
 */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  testID,
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  testID: string
}) {
  const [armed, setArmed] = useState(false)

  return (
    <Button
      label={armed ? confirmLabel : label}
      variant={armed ? 'destructive' : 'secondary'}
      onPress={() => {
        if (armed) {
          onConfirm()
          setArmed(false)
          return
        }
        setArmed(true)
      }}
      testID={testID}
      fullWidth
    />
  )
}
