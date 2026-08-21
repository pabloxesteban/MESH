/**
 * Perfil: identidad, avisos puntuales, guardado reciente, y las salidas hacia
 * Guardados, Estudio y Configuración.
 *
 * Rediseño completo — ver ADR-030. Antes esto era una sola lista plana de
 * settings; ahora es un hub: el header dice quién sos, los avisos dicen qué te
 * conviene resolver, y todo lo que antes vivía acá suelto (cuenta, privacidad,
 * legal) se mudó a `ConfiguracionScreen`, a un toque de distancia.
 *
 * **Cada sección tiene su propio estado de error.** Un fallo en "lo que
 * guardaste" no puede tapar el header ni los avisos: Perfil es un hub de
 * secciones independientes, no una sola consulta que todo o nada.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { locationLabel } from '@mesh/domain'
import { useEffect, useState } from 'react'
import { Image } from 'expo-image'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Avatar,
  Box,
  Button,
  Input,
  MIN_TOUCH_TARGET,
  NoticeRow,
  Pressable,
  SCREEN_GUTTER,
  Skeleton,
  Text,
  Toast,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import {
  fetchCompletedAppointmentsCount,
  fetchOwnedProfessional,
} from '@/features/artist/queries.ts'
import { mediaUrl } from '@/features/discovery/queries.ts'
import { fetchSaved, type SavedPiece } from '@/features/saved/queries.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { useEditLocationStore } from './editLocationStore.ts'
import { dismissNotice, fetchDismissedNotices, type NoticeKind } from './notices.ts'
import { fetchAccount, updateAccount, type Account } from './queries.ts'

export interface AccountScreenProps {
  /** Como el resto de las pantallas: la sesión entra por prop, no por hook. */
  userId: string | null
  isAnonymous: boolean
  onOpenStudio: () => void
  onOpenColecciones: () => void
  onOpenConfiguracion: () => void
  onOpenAvatarPicker: () => void
  /** Abre la hoja de ubicación. `currentSlug` la deja preseleccionada. */
  onOpenLocationEditor: (currentSlug: string | null) => void
  onOpenArtist: (slug: string) => void
}

export function AccountScreen({
  userId,
  isAnonymous,
  onOpenStudio,
  onOpenColecciones,
  onOpenConfiguracion,
  onOpenAvatarPicker,
  onOpenLocationEditor,
  onOpenArtist,
}: AccountScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const account = useQuery({ queryKey: ['account'], queryFn: fetchAccount })

  // Sin `enabled`: una consulta apagada se queda en `isPending` para siempre.
  // Quien no tiene estudio no tiene fila — eso es `null`, y ya tiene su rama.
  const professional = useQuery({
    queryKey: ['studio', 'professional', userId],
    queryFn: () => (userId == null ? null : fetchOwnedProfessional(userId)),
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
          <Box direction="row" gap="sm" align="center">
            <Avatar loading size="lg" />
            <Box flex={1} gap="xs">
              <Skeleton width="60%" height={22} />
              <Skeleton width="40%" height={14} />
            </Box>
          </Box>
        </Box>
      )
    }

    return (
      <Box gap="xl" testID="account-content">
        <ProfileHeader
          isAnonymous={isAnonymous}
          account={account.data}
          professional={professional.data ?? null}
          onOpenStudio={onOpenStudio}
          onOpenAvatarPicker={onOpenAvatarPicker}
          onOpenLocationEditor={onOpenLocationEditor}
        />

        {userId != null && professional.data != null ? (
          <ProfileNotices
            userId={userId}
            professional={professional.data}
            onOpenAvatarPicker={onOpenAvatarPicker}
            onOpenStudio={onOpenStudio}
          />
        ) : null}

        <RecentSaved onOpenArtist={onOpenArtist} onViewAll={onOpenColecciones} />

        <Box gap="xxs">
          <Button
            label={t('account.studio')}
            variant="secondary"
            onPress={onOpenStudio}
            fullWidth
            testID="account-studio"
          />
          <Button
            label={t('account.configuracion')}
            variant="secondary"
            onPress={onOpenConfiguracion}
            fullWidth
            testID="account-configuracion"
          />
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
        testID="screen-account"
      >
        <Box paddingBottom="md">
          <Text role="titleLg">{t('account.title')}</Text>
        </Box>
        {body}
      </ScrollView>
    </View>
  )
}

// --- header de identidad -----------------------------------------------------

function formatMemberSince(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const label = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  }).format(date)
  // "agosto 2026" y no "Agosto 2026": mayúscula solo al inicio de la oración,
  // y acá va en medio de una.
  return label
}

function ProfileHeader({
  isAnonymous,
  account,
  professional,
  onOpenStudio,
  onOpenAvatarPicker,
  onOpenLocationEditor,
}: {
  isAnonymous: boolean
  account: Account
  professional: Awaited<ReturnType<typeof fetchOwnedProfessional>> | null
  onOpenStudio: () => void
  onOpenAvatarPicker: () => void
  onOpenLocationEditor: (currentSlug: string | null) => void
}) {
  const t = useT()
  const client = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState<string | null>(null)
  const [draftLocation, setDraftLocation] = useState<
    { locationId: string | null; slug: string | null } | undefined
  >(undefined)
  const [toast, setToast] = useState<string | null>(null)

  const pending = useEditLocationStore((state) => state.pending)
  const setPending = useEditLocationStore((state) => state.setPending)

  // Lo que se eligió en la hoja de ubicación vuelve por acá, no por route
  // params — expo-router no tiene forma de devolver un valor a quien empujó
  // la ruta. Ver `editLocationStore.ts`.
  useEffect(() => {
    if (pending == null) return
    setDraftLocation(pending)
    setPending(null)
  }, [pending, setPending])

  const save = useMutation({
    mutationFn: updateAccount,
    onMutate: async (patch) => {
      await client.cancelQueries({ queryKey: ['account'] })
      const previous = client.getQueryData<Account>(['account'])
      client.setQueryData<Account>(['account'], (old) => {
        if (old == null) return old
        return {
          ...old,
          ...(patch.displayName !== undefined
            ? { displayName: patch.displayName }
            : {}),
          ...(patch.cityLocationId !== undefined
            ? {
                cityLocationId: patch.cityLocationId,
                cityLabel:
                  draftLocation?.slug != null
                    ? locationLabel(draftLocation.slug)
                    : null,
              }
            : {}),
        }
      })
      return { previous }
    },
    onError: (_err, _patch, context) => {
      if (context?.previous != null) {
        client.setQueryData(['account'], context.previous)
      }
    },
    onSuccess: () => {
      setToast(t('account.saved'))
      setEditing(false)
      setDraftName(null)
      setDraftLocation(undefined)
      void client.invalidateQueries({ queryKey: ['account'] })
    },
  })

  const currentName = account.displayName
  const nameChanged = draftName != null && draftName !== (currentName ?? '')
  const locationChanged = draftLocation !== undefined
  const canSave = nameChanged || locationChanged

  // El slug de la taxonomía (para preseleccionar el selector) y la etiqueta
  // para mostrar son cosas distintas — `draftLocation.slug` ya es un slug
  // porque así lo guarda `editLocationStore`; `account.cityLabel` es la
  // etiqueta ya traducida que trae `fetchAccount`, no hace falta traducirla
  // de nuevo.
  const currentSlug = draftLocation !== undefined ? draftLocation.slug : account.citySlug
  const displayLocationLabel =
    draftLocation !== undefined
      ? draftLocation.slug != null
        ? (locationLabel(draftLocation.slug) ?? draftLocation.slug)
        : null
      : account.cityLabel

  if (editing) {
    return (
      <Box gap="sm" testID="account-header-edit">
        <Box direction="row" gap="sm" align="center">
          <Avatar source={account.avatarUrl} size="lg" />
          <Button
            label={t('account.header.changePhoto')}
            variant="secondary"
            size="sm"
            onPress={onOpenAvatarPicker}
            testID="account-edit-change-photo"
          />
        </Box>

        <Input
          label={t('account.name')}
          value={draftName ?? currentName ?? ''}
          onChangeText={setDraftName}
          maxLength={80}
          autoCapitalize="words"
          testID="account-edit-name"
        />

        <Pressable
          onPress={() => onOpenLocationEditor(currentSlug)}
          accessibilityRole="button"
          accessibilityLabel={t('account.header.location.a11y', {
            valor:
              displayLocationLabel ?? t('account.header.location.placeholder'),
          })}
          testID="account-edit-location"
          style={{
            minHeight: MIN_TOUCH_TARGET,
            justifyContent: 'center',
          }}
        >
          <Text role="label" color="textSecondary">
            {t('account.header.location.label')}
          </Text>
          <Text role="body">
            {displayLocationLabel ?? t('account.header.location.placeholder')}
            {' ▸'}
          </Text>
        </Pressable>

        <Box direction="row" gap="sm">
          <Button
            label={t('common.cancel')}
            variant="secondary"
            onPress={() => {
              setEditing(false)
              setDraftName(null)
              setDraftLocation(undefined)
            }}
            testID="account-edit-cancel"
          />
          <Button
            label={t('common.save')}
            disabled={!canSave}
            loading={save.isPending}
            onPress={() =>
              save.mutate({
                ...(nameChanged ? { displayName: draftName?.trim() || null } : {}),
                ...(locationChanged
                  ? { cityLocationId: draftLocation?.locationId ?? null }
                  : {}),
              })
            }
            testID="account-edit-save"
          />
        </Box>

        {toast != null ? (
          <Toast
            message={toast}
            tone="positive"
            onDismiss={() => setToast(null)}
            testID="account-toast"
          />
        ) : null}
      </Box>
    )
  }

  return (
    <Box gap="sm" testID="account-header">
      <Box direction="row" gap="sm" align="flex-start">
        <Avatar source={account.avatarUrl} size="lg" />
        <Box flex={1} gap="xxs">
          <Text
            role="title"
            color={currentName == null ? 'textTertiary' : 'textPrimary'}
            testID="account-header-name"
          >
            {currentName ?? t('account.header.name.empty')}
          </Text>

          {isAnonymous ? (
            <Box gap="xxs" testID="account-header-anonymous">
              <Text role="label" color="textSecondary">
                {t('auth.account.anonymous.title')}
              </Text>
              <Text role="label" color="textTertiary">
                {t('auth.account.anonymous.body')}
              </Text>
            </Box>
          ) : (
            <Text role="label" color="textSecondary" testID="account-header-meta">
              {displayLocationLabel != null
                ? `${t('account.header.livesIn', { barrio: displayLocationLabel })} · ${t('account.header.memberSince', { fecha: formatMemberSince(account.createdAt) })}`
                : t('account.header.memberSince', {
                    fecha: formatMemberSince(account.createdAt),
                  })}
            </Text>
          )}

          {professional != null ? (
            <Box gap="xxs" testID="account-header-professional">
              {professional.bio != null && professional.bio.trim() !== '' ? (
                <Text role="body" color="textSecondary">
                  {professional.bio}
                </Text>
              ) : null}
              <Pressable
                onPress={onOpenStudio}
                accessibilityRole="button"
                accessibilityLabel={t('account.header.editInStudio')}
                testID="account-header-edit-studio"
                style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
              >
                <Text role="label" color="accent">
                  {t('account.header.editInStudio')}
                </Text>
              </Pressable>
              <CompletedServices professionalId={professional.id} />
            </Box>
          ) : null}
        </Box>
      </Box>

      <Button
        label={t('account.header.edit')}
        variant="secondary"
        onPress={() => setEditing(true)}
        testID="account-edit-toggle"
      />

      {toast != null ? (
        <Toast
          message={toast}
          tone="positive"
          onDismiss={() => setToast(null)}
          testID="account-toast"
        />
      ) : null}
    </Box>
  )
}

function CompletedServices({ professionalId }: { professionalId: string }) {
  const t = useT()
  const count = useQuery({
    queryKey: ['completed-appointments', professionalId],
    queryFn: fetchCompletedAppointmentsCount,
  })

  if (count.data == null) return null

  return (
    <Text role="label" color="textTertiary" testID="account-header-completed">
      {count.data === 1
        ? t('account.header.completed.one')
        : t('account.header.completed', { n: String(count.data) })}
    </Text>
  )
}

// --- avisos puntuales ---------------------------------------------------------

function ProfileNotices({
  userId,
  professional,
  onOpenAvatarPicker,
  onOpenStudio,
}: {
  userId: string
  professional: NonNullable<Awaited<ReturnType<typeof fetchOwnedProfessional>>>
  onOpenAvatarPicker: () => void
  onOpenStudio: () => void
}) {
  const t = useT()
  const client = useQueryClient()

  const dismissed = useQuery({
    queryKey: ['account-notices', userId],
    queryFn: () => fetchDismissedNotices(userId),
  })

  const dismiss = useMutation({
    mutationFn: (kind: NoticeKind) => dismissNotice(userId, kind),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['account-notices', userId] }),
  })

  const dismissedSet = dismissed.data ?? new Set<NoticeKind>()

  const candidates: { kind: NoticeKind; message: string; cta: string; onPress: () => void }[] = []

  if (!professional.hasAvatar) {
    candidates.push({
      kind: 'photo',
      message: t('account.notice.photo'),
      cta: t('account.notice.photo.cta'),
      onPress: onOpenAvatarPicker,
    })
  }
  if (professional.studioCoordinates == null) {
    candidates.push({
      kind: 'location',
      message: t('account.notice.location'),
      cta: t('account.notice.location.cta'),
      onPress: onOpenStudio,
    })
  }

  const visible = candidates.filter((notice) => !dismissedSet.has(notice.kind)).slice(0, 2)

  if (visible.length === 0) return null

  return (
    <Box gap="xxs" testID="account-notices">
      {visible.map((notice) => (
        <NoticeRow
          key={notice.kind}
          message={notice.message}
          action={{ label: notice.cta, onPress: notice.onPress }}
          onDismiss={() => dismiss.mutate(notice.kind)}
          dismissAccessibilityLabel={t('account.notice.dismiss')}
          dismissing={dismiss.isPending && dismiss.variables === notice.kind}
          testID={`account-notice-${notice.kind}`}
        />
      ))}
    </Box>
  )
}

// --- guardado reciente ---------------------------------------------------------

const RECENT_COUNT = 8
const THUMBNAIL = 72

function RecentSaved({
  onOpenArtist,
  onViewAll,
}: {
  onOpenArtist: (slug: string) => void
  onViewAll: () => void
}) {
  const t = useT()

  const saved = useQuery({ queryKey: ['saved'], queryFn: fetchSaved })

  if (saved.error != null) {
    return (
      <Box gap="xxs" testID="account-recent-error">
        <Text role="body" color="textSecondary">
          {t('account.recent.error')}
        </Text>
        <Button
          label={t('common.retry')}
          variant="ghost"
          size="sm"
          onPress={() => void saved.refetch()}
          testID="account-recent-retry"
        />
      </Box>
    )
  }

  if (saved.isPending) {
    return (
      <Box direction="row" gap="xxs" testID="account-recent-loading">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} width={THUMBNAIL} height={THUMBNAIL} radius="md" />
        ))}
      </Box>
    )
  }

  if (saved.data.length === 0) {
    return (
      <Pressable
        onPress={onViewAll}
        accessibilityRole="button"
        accessibilityLabel={t('saved.entry')}
        testID="account-recent-empty"
        style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
      >
        <Text role="body">{`${t('saved.entry')} ▸`}</Text>
      </Pressable>
    )
  }

  const recent = saved.data.slice(0, RECENT_COUNT)

  return (
    <Box gap="xs" testID="account-recent">
      <Text role="label" color="textSecondary">
        {t('account.recent.title')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xxs }}
        testID="account-recent-carousel"
      >
        {recent.map((piece) => (
          <RecentSavedThumbnail
            key={piece.savedItemId}
            piece={piece}
            onPress={() => onOpenArtist(piece.professionalSlug)}
          />
        ))}
      </ScrollView>
      <Pressable
        onPress={onViewAll}
        accessibilityRole="button"
        accessibilityLabel={t('account.recent.viewAll')}
        testID="account-recent-viewall"
        style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
      >
        <Text role="label" color="accent">
          {t('account.recent.viewAll')}
        </Text>
      </Pressable>
    </Box>
  )
}

function RecentSavedThumbnail({
  piece,
  onPress,
}: {
  piece: SavedPiece
  onPress: () => void
}) {
  const t = useT()
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('account.recent.itemA11y', {
        nombre: piece.professionalName,
      })}
      testID={`account-recent-item-${piece.savedItemId}`}
    >
      <Image
        source={mediaUrl(piece.mediaPath, 'sm')}
        placeholder={piece.blurhash != null ? { blurhash: piece.blurhash } : null}
        placeholderContentFit="cover"
        contentFit="cover"
        recyclingKey={piece.portfolioItemId}
        transition={0}
        accessible={false}
        style={{
          width: THUMBNAIL,
          height: THUMBNAIL,
          borderRadius: radius.md,
          backgroundColor: theme.surfaceRaised,
        }}
      />
    </Pressable>
  )
}
