/**
 * Perfil de un profesional.
 *
 * La regla que gobierna esta pantalla: **un campo que falta no renderiza nada.**
 * Sin "a consultar", sin guiones, sin "disponibilidad desconocida". Un
 * placeholder ocupa el lugar de un dato y enseña a leer ausencia como presencia.
 *
 * Y lo que directamente no existe: reseñas, cantidad de seguidores, "reservado
 * 12 veces esta semana", ranking. Nada de eso es información que tengamos, y
 * fabricarla sería inventar credibilidad ajena.
 */

import { Image } from 'expo-image'
import { useQuery } from '@tanstack/react-query'
import { ScrollView, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  SCREEN_GUTTER,
  Skeleton,
  Tag,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { locationLabel } from '@mesh/domain'

import { ErrorView } from '@/components/ErrorView.tsx'
import { FixtureBadge } from '@/components/FixtureBadge.tsx'
import { mediaUrl } from '@/features/discovery/queries.ts'
import { useI18n } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { formatDate, formatMoney, isAvailabilityStale } from './format.ts'
import { fetchProfile, type PortfolioPiece } from './queries.ts'

export interface ProfileScreenProps {
  slug: string
  today: string
  onBack: () => void
  onContact: (slug: string) => void
  /** Ausente cuando no se puede chatear: perfil sin reclamar, o sin sesión. */
  onChat?: ((professionalId: string, name: string) => void) | undefined
}

export function ProfileScreen({
  slug,
  today,
  onBack,
  onContact,
  onChat,
}: ProfileScreenProps) {
  const { t, locale } = useI18n()
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const query = useQuery({
    queryKey: ['profile', slug],
    queryFn: () => fetchProfile(slug),
  })

  const body = (() => {
    if (query.error != null) {
      return (
        <ErrorView
          error={query.error}
          onRetry={() => void query.refetch()}
          onBack={onBack}
          testID="profile-error"
        />
      )
    }

    if (query.isPending) {
      return (
        <Box gap="sm" testID="profile-loading">
          <Skeleton height={320} radius="lg" />
          <Skeleton width="50%" height={28} />
          <Skeleton width="70%" height={18} />
        </Box>
      )
    }

    if (query.data == null) {
      // No existe y no publicado son indistinguibles a propósito: decir "no
      // tenés permiso" confirmaría que el artista existe.
      return (
        <ErrorView
          cause="notFound"
          onBack={onBack}
          testID="profile-not-found"
        />
      )
    }

    const { professional, pieces, canChat } = query.data
    const hero = pieces.find((piece) => piece.isFeatured) ?? pieces[0]
    const rest = pieces.filter((piece) => piece.id !== hero?.id)

    return (
      <Box gap="lg" testID="profile-content">
        {hero != null ? <Hero piece={hero} /> : null}

        <Box gap="xs">
          <Text role="display" numberOfLines={2}>
            {professional.displayName}
          </Text>

          {professional.isFixture ? (
            // Los fixtures son inconfundibles también en pantalla, no solo en
            // la base. Ver content-policy §4.3.
            <FixtureBadge variant="full" testID="profile-fixture-badge" />
          ) : null}

          {professional.location != null ? (
            <Text role="body" color="textSecondary">
              {/* El barrio si lo hay, si no la ciudad. "Palermo" le dice más
                  a alguien de Buenos Aires que "Ciudad Autónoma de Buenos
                  Aires", y entra en una línea. El nombre sale de la taxonomía
                  y no de la fila: es dato de compilación, y `db:reference:check`
                  garantiza que la base coincida. */}
              {locationLabel(professional.location.slug) ??
                professional.location.city}
              {professional.travels ? ` · ${t('profile.travels')}` : ''}
            </Text>
          ) : null}
        </Box>

        {professional.bio != null ? (
          <Text role="body" color="textSecondary">
            {professional.bio}
          </Text>
        ) : null}

        {professional.styles.length > 0 ? (
          <Section title={t('profile.styles')}>
            <Box direction="row" gap="xxs" wrap>
              {professional.styles.map((style) => (
                <Tag
                  key={style.styleSlug}
                  label={t(`style.tattoo.${style.styleSlug}` as TranslationKey)}
                  styleSlug={style.styleSlug}
                  // Los primarios rellenos: es lo que define al artista, y el
                  // orden ya viene con los primarios adelante.
                  filled={style.isPrimary}
                />
              ))}
            </Box>
          </Section>
        ) : null}

        {professional.availability != null ? (
          <Section title={t('profile.availability')}>
            <Text role="body">
              {t(
                `profile.availability.${professional.availability.status}` as TranslationKey,
              )}
            </Text>
            {/* La fecha va SIEMPRE con el estado. Una disponibilidad sin fecha
                no es información, y una vieja se rotula como vieja en vez de
                presentarse como un hecho actual. */}
            <Text role="micro" color="textTertiary">
              {t(
                isAvailabilityStale(professional.availability.updatedAt, today)
                  ? 'profile.availability.stale'
                  : 'profile.availability.asOf',
                {
                  fecha: formatDate(
                    professional.availability.updatedAt,
                    locale,
                  ),
                },
              )}
            </Text>
          </Section>
        ) : null}

        {professional.price != null ? (
          <Section title={t('profile.price')}>
            <Text role="body">
              {t('profile.price.range', {
                min: formatMoney(
                  professional.price.minCents,
                  professional.price.currency,
                  locale,
                ),
                max: formatMoney(
                  professional.price.maxCents,
                  professional.price.currency,
                  locale,
                ),
              })}
            </Text>
            <Text role="micro" color="textTertiary">
              {t('profile.price.asOf', {
                fecha: formatDate(professional.price.pricedAt, locale),
              })}
            </Text>
          </Section>
        ) : null}

        {rest.length > 0 ? (
          <Section title={t('profile.portfolio')}>
            <Grid pieces={rest} />
          </Section>
        ) : null}

        {/* El chat va primero cuando existe, y el contacto externo queda de
            secundario: escribir adentro de MESH no obliga a nadie a dar su
            número. Cuando el perfil no está reclamado el chat no aparece —
            no ofrecemos un canal que no llega a ninguna parte. */}
        {onChat != null && canChat && !professional.isFixture ? (
          <Button
            label={t('chat.open')}
            onPress={() => onChat(professional.id, professional.displayName)}
            fullWidth
            testID="profile-chat"
          />
        ) : null}

        <Button
          label={t('profile.contact')}
          variant={
            onChat != null && canChat && !professional.isFixture
              ? 'secondary'
              : 'primary'
          }
          onPress={() => onContact(professional.slug)}
          fullWidth
          testID="profile-contact"
        />
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
      testID="screen-profile"
    >
      {body}
    </ScrollView>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Box gap="xxs">
      <Text role="label" color="textSecondary">
        {title}
      </Text>
      {children}
    </Box>
  )
}

function Hero({ piece }: { piece: PortfolioPiece }) {
  const theme = useTheme()
  const aspectRatio =
    piece.width != null && piece.height != null && piece.height > 0
      ? piece.width / piece.height
      : 4 / 5

  return (
    <Image
      // `lg` solo acá: es la única imagen a ancho completo de la pantalla.
      source={mediaUrl(piece.mediaPath, 'lg')}
      placeholder={piece.blurhash != null ? { blurhash: piece.blurhash } : null}
      placeholderContentFit="cover"
      contentFit="cover"
      transition={0}
      accessible={false}
      style={{
        width: '100%',
        aspectRatio,
        borderRadius: radius.lg,
        backgroundColor: theme.surfaceRaised,
      }}
    />
  )
}

/**
 * Grilla de obra.
 *
 * Dos columnas con `aspectRatio` fijo: la grilla **no puede saltar** mientras
 * cargan las imágenes. Con altura derivada de cada foto, cada llegada
 * reacomodaría lo que ya se está mirando.
 */
function Grid({ pieces }: { pieces: readonly PortfolioPiece[] }) {
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const columnWidth = (width - SCREEN_GUTTER * 2 - spacing.xxs) / 2

  return (
    <Box direction="row" gap="xxs" wrap>
      {pieces.map((piece) => (
        <Image
          key={piece.id}
          // `sm` en la grilla: una miniatura de 190pt no necesita 1600px.
          source={mediaUrl(piece.mediaPath, 'sm')}
          placeholder={
            piece.blurhash != null ? { blurhash: piece.blurhash } : null
          }
          placeholderContentFit="cover"
          contentFit="cover"
          recyclingKey={piece.id}
          transition={0}
          accessible
          accessibilityRole="image"
          accessibilityLabel={piece.caption ?? ''}
          testID={`profile-piece-${piece.id}`}
          style={{
            width: columnWidth,
            aspectRatio: 1,
            borderRadius: radius.md,
            backgroundColor: theme.surfaceRaised,
          }}
        />
      ))}
    </Box>
  )
}
