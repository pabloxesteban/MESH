/**
 * Perfil: todo lo tuyo en un lugar.
 *
 * Nombre, alcance de la búsqueda, tema de la app, y los accesos a "Tu gusto" y
 * —si ofrecés un servicio— "Tu estudio". Esas dos dejaron de ser pestañas:
 * son cosas que se visitan cada tanto, no cada sesión, y una barra de seis
 * pestañas hace que ninguna se lea.
 *
 * El radio de búsqueda es la única preferencia que cambia resultados, así que
 * dice explícitamente qué NO hace: nunca esconde a alguien que no publicó
 * dónde trabaja. Un dato faltante no puede parecer una mala respuesta.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  FilterChip,
  Input,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  Toast,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { AnalyticsToggle } from '@/features/settings/AnalyticsToggle.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'

import { fetchAccount, updateAccount } from './queries.ts'

/**
 * Los pasos del radio, en km. `null` = sin límite.
 *
 * Cinco opciones y no un slider: un slider invita a afinar un número que no
 * significa nada a esta escala — entre 11 y 13 km no hay decisión, y CABA
 * entera entra en 20.
 */
const RADIUS_STEPS: readonly (number | null)[] = [2, 5, 10, 25, null]

export interface AccountScreenProps {
  /** Como el resto de las pantallas: la sesión entra por prop, no por hook.
      Así el preview puede montarla sin `SessionProvider`. */
  userId: string | null
  onOpenTaste: () => void
  onOpenStudio: () => void
}

export function AccountScreen({
  userId,
  onOpenTaste,
  onOpenStudio,
}: AccountScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const client = useQueryClient()

  const [name, setName] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const account = useQuery({ queryKey: ['account'], queryFn: fetchAccount })

  const save = useMutation({
    mutationFn: updateAccount,
    onSuccess: () => {
      setToast(t('account.saved'))
      void client.invalidateQueries({ queryKey: ['account'] })
    },
  })

  const body = (() => {
    if (account.error != null) {
      return (
        <ErrorView
          error={account.error}
          onRetry={() => void account.refetch()}
          testID="account-error"
        />
      )
    }

    if (account.isPending) {
      return (
        <Box gap="sm" testID="account-loading">
          <Skeleton width="60%" height={28} />
          <Skeleton height={120} radius="md" />
        </Box>
      )
    }

    const data = account.data
    const radius = data.searchRadiusKm

    return (
      <Box gap="xl" testID="account-content">
        <Box gap="xs">
          <Input
            label={t('account.name')}
            value={name ?? data.displayName ?? ''}
            onChangeText={setName}
            maxLength={80}
            autoCapitalize="words"
            testID="account-name"
          />
          <Button
            label={t('common.save')}
            variant="secondary"
            size="sm"
            disabled={name == null || name === (data.displayName ?? '')}
            loading={save.isPending}
            onPress={() => save.mutate({ displayName: name?.trim() || null })}
            testID="account-name-save"
          />
        </Box>

        {/* Cambiar esto cambia la app entera: qué pestañas hay y qué muestra
            Inicio. Tiene que poder cambiarse — una elección de la primera
            pantalla que no se puede deshacer no es una preferencia, es una
            trampa. Ver ADR-014. */}
        <Box gap="xs">
          <Text role="label" color="textSecondary">
            {t('account.intent')}
          </Text>
          <Text role="micro" color="textTertiary">
            {t('account.intent.hint')}
          </Text>
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

        <Box gap="xs">
          <Text role="label" color="textSecondary">
            {t('account.radius')}
          </Text>
          <Text role="micro" color="textTertiary">
            {t('account.radius.hint')}
          </Text>
          <Box direction="row" gap="xxs" wrap>
            {RADIUS_STEPS.map((step) => (
              <FilterChip
                key={String(step)}
                label={
                  step == null
                    ? t('account.radius.unlimited')
                    : t('account.radius.km', { km: step })
                }
                selected={radius === step}
                onToggle={() => save.mutate({ searchRadiusKm: step })}
                testID={`account-radius-${String(step)}`}
              />
            ))}
          </Box>
        </Box>

        <Box gap="xs">
          <Text role="label" color="textSecondary">
            {t('account.more')}
          </Text>
          <Button
            label={t('account.taste')}
            variant="secondary"
            onPress={onOpenTaste}
            fullWidth
            testID="account-taste"
          />
          {/* El estudio se ofrece siempre, no solo a quien eligió "ofrezco":
              los roles no son excluyentes, y alguien que entró buscando puede
              recibir su código después. */}
          <Button
            label={t('account.studio')}
            variant="secondary"
            onPress={onOpenStudio}
            fullWidth
            testID="account-studio"
          />
        </Box>

        <AnalyticsToggle userId={userId} />
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
        testID="screen-account"
      >
        <Box paddingBottom="md">
          <Text role="titleLg">{t('account.title')}</Text>
        </Box>
        {body}
      </ScrollView>
      {toast != null ? (
        <Toast
          message={toast}
          tone="positive"
          onDismiss={() => setToast(null)}
          testID="account-toast"
        />
      ) : null}
    </View>
  )
}
