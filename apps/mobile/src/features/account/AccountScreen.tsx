/**
 * Perfil: todo lo tuyo en un lugar.
 *
 * Nombre, alcance de la búsqueda, tema de la app, y —si ofrecés un servicio—
 * el acceso a "Tu estudio". El estudio no es una pestaña para quien busca: es
 * algo que se visita cada tanto, no cada sesión, y una barra de seis pestañas
 * hace que ninguna se lea.
 *
 * **No está el radio de búsqueda.** Estuvo, y era mentira: se guardaba, se leía
 * a sí mismo, y ninguna pantalla lo usaba desde que salieron los encajes
 * (D-010). Su texto además prometía un filtrado por distancia que D-010
 * eliminó — la distancia ordena y nunca filtra. Desde dónde se mira ahora se
 * elige en Inicio, donde se ve el efecto. Ver D-012.
 *
 * **Sí está la cuenta**, y no estaba: `app/cuenta/` existía como ruta y ninguna
 * pantalla llevaba ahí. Crear cuenta —con correo o con Google— era código que
 * corría en los tests y que nadie podía alcanzar desde la app. Un perfil de
 * artista que no se puede guardar en una cuenta se pierde con el teléfono.
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

export interface AccountScreenProps {
  /** Como el resto de las pantallas: la sesión entra por prop, no por hook.
      Así el preview puede montarla sin `SessionProvider`. */
  userId: string | null
  onOpenStudio: () => void
  /** Hay sesión pero no cuenta. Nunca "no hay sesión": ver ADR-002. */
  isAnonymous: boolean
  email: string | null
  onCreateAccount: () => void
  onSignIn: () => void
  onSignOut: () => void
}

export function AccountScreen({
  userId,
  onOpenStudio,
  isAnonymous,
  email,
  onCreateAccount,
  onSignIn,
  onSignOut,
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
          <Text role="label" color="textTertiary">
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

        {/* La cuenta.

            Va arriba de "Más" porque decide si todo lo demás sobrevive al
            teléfono, y no bloquea nada: MESH funciona entero sin cuenta. La
            invitación dice qué se gana, no qué se pierde — un muro de registro
            sería un peaje, no una razón. Ver ADR-002 y ADR-015. */}
        {isAnonymous ? (
          <Box gap="xs" testID="account-anonymous">
            <Text role="label" color="textSecondary">
              {t('auth.account.anonymous.title')}
            </Text>
            {/* `label` y no `micro`: micro se dibuja en mayúsculas y sirve para
                rótulos de una o dos palabras. Una oración de tres renglones en
                mayúsculas se grita, y encima cuesta leerla. */}
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

        <Box gap="xs">
          <Text role="label" color="textSecondary">
            {t('account.more')}
          </Text>
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
