/**
 * Configuración: todo lo que Perfil dejó de mostrar plano.
 *
 * Antes del rediseño de Perfil (docs/decisions/ADR-030), esto vivía entero
 * arriba de `AccountScreen` — 343 líneas sin agrupar, cuenta y privacidad y
 * legal uno debajo del otro. Perfil se quedó con la identidad; esto se quedó
 * con el resto, agrupado con `SectionHeader` para que un lector de pantalla
 * que navega por encabezados pueda saltar de sección en sección.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useState } from 'react'

import {
  Box,
  Button,
  FilterChip,
  SCREEN_GUTTER,
  SectionHeader,
  Skeleton,
  Text,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { AnalyticsToggle } from '@/features/settings/AnalyticsToggle.tsx'
import { BlockedList } from '@/features/moderation/BlockedList.tsx'
import { ErrorReportsToggle } from '@/observability/ErrorReportsToggle.tsx'
import { NotificationsToggle } from '@/features/notifications/NotificationsToggle.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'

import { DeleteAccount } from './DeleteAccount.tsx'
import { ExportAccount } from './ExportAccount.tsx'
import { LegalRow } from './LegalRow.tsx'
import { confirmAdult, fetchAccount, updateAccount } from './queries.ts'

export interface ConfiguracionScreenProps {
  userId: string | null
  isAnonymous: boolean
  email: string | null
  onCreateAccount: () => void
  onSignIn: () => void
  onSignOut: () => void
  /** Opcional por el mismo motivo que en Perfil: preview y tests sin salida. */
  onDeleted?: (() => void) | undefined
  onBack: () => void
}

export function ConfiguracionScreen({
  userId,
  isAnonymous,
  email,
  onCreateAccount,
  onSignIn,
  onSignOut,
  onDeleted,
  onBack,
}: ConfiguracionScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const client = useQueryClient()

  const [borrando, setBorrando] = useState(false)

  // Mismo `queryKey` que Perfil: las dos pantallas leen el mismo perfil, y
  // cambiar la intención en una se ve al instante en la otra.
  const account = useQuery({ queryKey: ['account'], queryFn: fetchAccount })

  const declarar = useMutation({
    mutationFn: confirmAdult,
    onSuccess: () => client.invalidateQueries({ queryKey: ['account'] }),
  })

  const save = useMutation({
    mutationFn: updateAccount,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['account'] }),
  })

  const body = (() => {
    if (account.error != null) {
      return (
        <ErrorView
          error={account.error}
          onRetry={() => void account.refetch()}
          testID="settings-error"
        />
      )
    }

    if (account.isPending) {
      return (
        <Box gap="xl" testID="settings-loading">
          {(
            [
              'settings.section.account',
              'settings.section.preferences',
              'settings.section.notifications',
              'settings.section.privacy',
              'settings.section.data',
            ] as const
          ).map((key) => (
            <Box key={key} gap="xs">
              <Skeleton width="40%" height={16} />
              <Skeleton height={64} radius="md" />
            </Box>
          ))}
        </Box>
      )
    }

    const data = account.data

    return (
      <Box gap="xl" testID="settings-content">
        <Box gap="sm">
          <SectionHeader title={t('settings.section.account')} />

          {isAnonymous ? (
            <Box gap="xs" testID="account-anonymous">
              <Text role="label" color="textSecondary">
                {t('auth.account.anonymous.title')}
              </Text>
              <Text role="label" color="textTertiary">
                {t('auth.account.anonymous.body')}
              </Text>
              <Button
                label={t('auth.signUp.submit')}
                onPress={onCreateAccount}
                fullWidth
                testID="account-sign-up"
              />
              <Button
                label={t('auth.signIn.submit')}
                variant="secondary"
                onPress={onSignIn}
                fullWidth
                testID="account-sign-in"
              />
            </Box>
          ) : (
            <Box gap="xs" testID="account-signed-in">
              <Text role="label" color="textSecondary">
                {t('auth.account.email')}
              </Text>
              <Text role="body">{email ?? ''}</Text>
              <Button
                label={t('auth.account.signOut')}
                variant="destructive"
                onPress={onSignOut}
                fullWidth
                testID="account-sign-out"
              />
            </Box>
          )}

          {/* Quien todavía no confirmó ser mayor lo puede hacer desde acá. Sin
              esta fila, alguien que en el arranque tocó "todavía no" no tiene
              ninguna forma de cambiarlo. Ver ADR-025. */}
          {userId != null && data.adultConfirmedAt == null ? (
            <Box gap="xxs" testID="account-age">
              <Text role="label" color="textSecondary">
                {t('age.title')}
              </Text>
              <Text role="body" color="textSecondary">
                {t('age.blocked')}
              </Text>
              <Button
                label={t('age.yes')}
                variant="secondary"
                loading={declarar.isPending}
                onPress={() => declarar.mutate()}
                fullWidth
                testID="account-age-confirm"
              />
            </Box>
          ) : null}
        </Box>

        <Box gap="sm">
          <SectionHeader
            title={t('settings.section.preferences')}
            hint={t('account.intent.hint')}
          />
          <Box direction="row" gap="xxs" wrap>
            <FilterChip
              label={t('account.intent.looking')}
              selected={data.onboardingIntent === 'looking'}
              onToggle={() => save.mutate({ onboardingIntent: 'looking' })}
              testID="account-intent-looking"
            />
            <FilterChip
              label={t('account.intent.offering')}
              selected={data.onboardingIntent === 'offering'}
              onToggle={() => save.mutate({ onboardingIntent: 'offering' })}
              testID="account-intent-offering"
            />
          </Box>
        </Box>

        <Box gap="sm">
          <SectionHeader title={t('settings.section.notifications')} />
          <NotificationsToggle userId={userId} />
        </Box>

        <Box gap="sm">
          <SectionHeader title={t('settings.section.privacy')} />
          {/* Solo se dibuja si hay a quién desbloquear. Ver ADR-023. */}
          <BlockedList />
          <AnalyticsToggle userId={userId} />
          <ErrorReportsToggle />
        </Box>

        <Box gap="sm">
          <SectionHeader title={t('settings.section.data')} />
          <LegalRow />
          {userId != null ? <ExportAccount /> : null}
          {onDeleted != null && userId != null ? (
            borrando ? (
              <DeleteAccount
                onDeleted={onDeleted}
                onCancel={() => setBorrando(false)}
              />
            ) : (
              <Button
                label={t('account.delete.entry')}
                variant="ghost"
                size="sm"
                onPress={() => setBorrando(true)}
                testID="account-delete"
              />
            )
          ) : null}
        </Box>
      </Box>
    )
  })()

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <ScrollView
        contentContainerStyle={{
          padding: SCREEN_GUTTER,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        testID="screen-settings"
      >
        <Box gap="xs" paddingBottom="md">
          <Button
            label={t('common.back')}
            variant="ghost"
            size="sm"
            onPress={onBack}
            testID="settings-back"
          />
          <Text role="titleLg">{t('settings.title')}</Text>
        </Box>
        {body}
      </ScrollView>
    </View>
  )
}
