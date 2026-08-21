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
 *
 * **La entrada desde una obra.** Cuando se llega tocando una obra —de Explorar
 * o del carrusel de Inicio— esa obra crece hasta ocupar el hero, y el hero es
 * ella y no la destacada por el artista. Si creciera una y arriba apareciera
 * otra, la transición habría contado una mentira sobre qué se estaba abriendo.
 *
 * **Y la salida.** Mientras el perfil está en pantalla deja lista la vuelta con
 * la posición actual de su hero —por eso el scroll la actualiza— y al
 * desmontarse la suelta. No se intercepta ningún "atrás": el desmontaje pasa
 * igual con el botón, con el gesto de borde y con el botón físico de Android.
 *
 * Ver features/transitions y D-011.
 */

import { Image } from 'expo-image'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import {
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  HAIRLINE,
  MIN_TOUCH_TARGET,
  Pressable,
  SCREEN_GUTTER,
  Skeleton,
  Tag,
  Text,
  radius,
  spacing,
  useMotion,
  useTheme,
} from '@/design-system/index.ts'
import { locationLabel } from '@mesh/domain'

import { ErrorView } from '@/components/ErrorView.tsx'
import { FixtureBadge } from '@/components/FixtureBadge.tsx'
import { SaveHeart } from '@/features/saved/SaveHeart.tsx'
import { PublicCalendar } from '@/features/scheduling/PublicCalendar.tsx'
import { ReviewList } from '@/features/reviews/ReviewList.tsx'
import { SafetyRow } from '@/features/moderation/SafetyRow.tsx'
import { useSaved } from '@/features/saved/useSaved.ts'
import { mediaUrl } from '@/features/discovery/queries.ts'
import { GrowingArtwork } from '@/features/transitions/GrowingArtwork.tsx'
import { ratioOf } from '@/features/transitions/geometry.ts'
import { useArtworkEntrance } from '@/features/transitions/useArtworkEntrance.ts'
import { useI18n, useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { formatDate, formatMoney, isAvailabilityStale } from './format.ts'
import {
  fetchProfile,
  fetchReplyHabit,
  type PortfolioPiece,
} from './queries.ts'

export interface ProfileScreenProps {
  slug: string
  today: string
  onBack: () => void
  onContact: (slug: string) => void
  /** Quién está mirando. `null` deja los corazones afuera. */
  userId?: string | null
  /** Ausente cuando no se puede chatear: perfil sin reclamar, o sin sesión. */
  onChat?: ((professionalId: string, name: string) => void) | undefined
}

export function ProfileScreen({
  slug,
  today,
  onBack,
  onContact,
  onChat,
  userId = null,
}: ProfileScreenProps) {
  const { t, locale } = useI18n()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { durationOf } = useMotion()
  const entrance = useArtworkEntrance(slug)

  // El hero que se está mostrando y cuánto se scrolleó: las dos cosas que
  // definen desde dónde tiene que volver la obra.
  const heroShown = useRef<PortfolioPiece | null>(null)
  const scrollY = useRef(0)
  // Si el contenido ya está pasando por debajo de "Volver".
  //
  // Es estado y no una ref porque tiene que redibujar, pero **cambia dos veces
  // por recorrido, no por cuadro**: solo se escribe cuando cruza el umbral. El
  // presupuesto de 60fps del scroll no lo toca.
  const [tapando, setTapando] = useState(false)

  const { armReturnTo } = entrance
  const rearmReturn = useCallback(() => {
    const piece = heroShown.current
    armReturnTo(
      piece == null
        ? null
        : {
            portfolioItemId: piece.id,
            mediaPath: piece.mediaPath,
            blurhash: piece.blurhash,
            width: piece.width,
            height: piece.height,
            scrollY: scrollY.current,
          },
    )
  }, [armReturnTo])

  const query = useQuery({
    queryKey: ['profile', slug],
    queryFn: () => fetchProfile(slug),
  })

  // Los corazones. Se piden una vez por perfil y no una vez por obra: doce
  // consultas para dibujar doce corazones sería pagar la red por decoración.
  const saved = useSaved(userId)

  // Los estados de error traen su propia salida adentro de `ErrorView`. Dos
  // "Volver" en la misma pantalla no son dos salidas: son una pregunta sobre
  // cuál de las dos hace qué.
  const bodyHasOwnBack =
    query.error != null || (!query.isPending && query.data == null)

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
    // La obra que se tocó manda sobre la destacada. Solo si sigue estando
    // publicada: si el artista la bajó entre la grilla y el perfil, vale la
    // regla de siempre.
    const tocada =
      entrance.heroPieceId == null
        ? undefined
        : pieces.find((piece) => piece.id === entrance.heroPieceId)
    const hero = tocada ?? pieces.find((piece) => piece.isFeatured) ?? pieces[0]
    const rest = pieces.filter((piece) => piece.id !== hero?.id)

    // Se anota cuál es el hero para que la vuelta sepa qué obra devolver. Es un
    // ref y no estado: cambiarlo no tiene que redibujar nada.
    heroShown.current = hero ?? null
    rearmReturn()

    return (
      <Box gap="lg" testID="profile-content">
        {/* Invisible mientras la copia viaja: si los dos se vieran a la vez,
            la transición mostraría el truco. */}
        {hero != null ? (
          <Hero
            piece={hero}
            hidden={entrance.growing != null}
            saved={userId != null ? saved.isSaved(hero.id) : null}
            onToggleSaved={() => saved.toggle(hero.id)}
          />
        ) : null}

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

        {/* Con qué frecuencia contesta. Un hecho calculado de sus propias
            conversaciones, no una promesa ni una medalla — y puede decir que
            tarda. Ver ADR-022. Un fixture no tiene conversaciones. */}
        {!professional.isFixture ? (
          <ReplyHabitRow professionalId={professional.id} />
        ) : null}

        {/* Contesta "¿tiene lugar esta semana?" antes de escribirle, que es la
            pregunta que hoy se hace por chat y tarda un día en responderse.
            Solo para perfiles reales: un fixture no tiene agenda. */}
        {!professional.isFixture ? (
          <PublicCalendar professionalId={professional.id} />
        ) : null}

        {/* Las reseñas van arriba del precio y de la obra a propósito: es lo
            que decide si la persona sigue leyendo. Solo para perfiles reales —
            un registro de prueba no tuvo turnos, así que no puede tener
            reseñas, y mostrar la sección vacía en quince perfiles ficticios
            haría parecer que nadie reseña nunca. */}
        {!professional.isFixture ? (
          <ReviewList professionalId={professional.id} userId={userId} />
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
            <Grid
              pieces={rest}
              isSaved={userId == null ? null : saved.isSaved}
              onToggleSaved={saved.toggle}
            />
          </Section>
        ) : null}

        {/* A un registro de prueba no se le escribe, y eso se DICE acá.

            Antes los dos botones aparecían igual y "Escribirle" llevaba a una
            pantalla que cortaba el contacto. Funcionaba, pero se enteraba
            después de tocar, y la ausencia del botón de chat se leía como que
            la app no tiene chat. El corte de `ContactScreen` sigue estando:
            esto es lo que se ve, aquello es lo que garantiza. */}
        {professional.isFixture ? (
          <Text
            role="body"
            color="textSecondary"
            testID="profile-fixture-nochat"
          >
            {t('profile.fixture.noContact')}
          </Text>
        ) : (
          <>
            {/* El chat va primero cuando existe, y el contacto externo queda de
                secundario: escribir adentro de MESH no obliga a nadie a dar su
                número. Cuando el perfil no está reclamado el chat no aparece —
                no ofrecemos un canal que no llega a ninguna parte. */}
            {onChat != null && canChat ? (
              <Button
                label={t('chat.open')}
                onPress={() =>
                  onChat(professional.id, professional.displayName)
                }
                fullWidth
                testID="profile-chat"
              />
            ) : null}

            <Button
              label={t('profile.contact')}
              variant={onChat != null && canChat ? 'secondary' : 'primary'}
              onPress={() => onContact(professional.slug)}
              fullWidth
              testID="profile-contact"
            />

            {/* Al final, debajo de las acciones que la persona vino a hacer.
                Arriba competirían con ellas; adentro de un menú de tres puntos
                no las encuentra quien las necesita. Ver ADR-023. */}
            <SafetyRow
              userId={userId ?? null}
              target={{
                kind: 'professional',
                professionalId: professional.id,
              }}
              blockProfessionalId={professional.id}
            />
          </>
        )}
      </Box>
    )
  })()

  return (
    // La raíz existe por la transición: `GrowingArtwork` se posiciona en
    // coordenadas de ventana, y para eso su padre tiene que estar en el origen
    // de la ventana. Adentro del ScrollView quedaría atado al scroll y la obra
    // aterrizaría corrida en cuanto alguien tocara una obra de más abajo.
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: SCREEN_GUTTER,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        // El hero se mueve con el scroll, así que la vuelta se rearma. Sin
        // esto, cerrar el perfil desde abajo mandaría la obra a encoger desde
        // un lugar donde ya no está.
        onScroll={({ nativeEvent }: { nativeEvent: NativeScrollEvent }) => {
          scrollY.current = nativeEvent.contentOffset.y
          // El umbral es el alto del propio control: es exactamente cuando el
          // contenido empieza a pasarle por debajo.
          const hayContenidoAbajo =
            nativeEvent.contentOffset.y > MIN_TOUCH_TARGET
          setTapando((antes: boolean) =>
            antes === hayContenidoAbajo ? antes : hayContenidoAbajo,
          )
          rearmReturn()
        }}
        scrollEventThrottle={64}
        testID="screen-profile"
      >
        {body}
      </ScrollView>

      {/* La salida.
          Un perfil se abre a pantalla completa y sin barra: hasta acá la única
          forma de volver era el gesto del sistema, y navigation.md §6 dice que
          una pantalla cuya única salida es ese gesto es un defecto. Va sobre la
          obra porque no hay encabezado donde ponerlo, y con fondo opaco porque
          el contraste de un texto sobre una foto no se puede verificar.

          Y **con una banda detrás en cuanto el contenido le pasa por abajo**:
          arriba de todo flota sobre la foto, que es lo que se diseñó, pero al
          desplazarse le tapaba palabras a media altura —"Tomando turnos"
          quedaba cortado atrás de la pastilla— y un texto cortado por un botón
          se lee como un defecto, no como una decisión. Con la banda, el texto
          pasa por debajo de una barra, que es lo que efectivamente hace. */}
      {bodyHasOwnBack ? null : (
        <BackControl
          onPress={onBack}
          insetTop={insets.top}
          withBand={tapando}
        />
      )}

      {entrance.growing != null ? (
        <GrowingArtwork
          from={entrance.growing.from}
          to={entrance.growing.to}
          // `md` y no `lg`: es el mismo archivo que la grilla ya bajó y tiene
          // en caché. Pedir el grande acá pondría una descarga en el camino de
          // la animación, que es justo lo que no puede tener.
          source={mediaUrl(entrance.growing.mediaPath, 'md')}
          blurhash={entrance.growing.blurhash}
          durationMs={durationOf('standard')}
          onArrived={entrance.onArrived}
          testID="profile-growing-artwork"
        />
      ) : null}
    </View>
  )
}

/**
 * Con qué frecuencia contesta este artista.
 *
 * Tres decisiones, y las tres son sobre no convertir un dato en un adorno:
 *
 * · **Si no hay datos, no se dibuja nada.** Ni un guion, ni un "sin datos" —
 *   una línea vacía igual ocupa lugar y sugiere que hay algo que falta.
 * · **Una de las tres frases es mala.** Un indicador que solo puede decir cosas
 *   buenas es publicidad, y no sirve para decidir.
 * · **Debajo va de dónde sale.** Sin eso es un juicio de MESH sobre una
 *   persona; con eso es una cuenta que cualquiera puede entender.
 *
 * Ver ADR-022.
 */
function ReplyHabitRow({ professionalId }: { professionalId: string }) {
  const t = useT()

  const habito = useQuery({
    queryKey: ['reply-habit', professionalId],
    queryFn: () => fetchReplyHabit(professionalId),
  })

  if (habito.data == null) return null

  return (
    <Box gap="xxs" testID="profile-reply-habit">
      <Text role="body">
        {t(`replyHabit.${habito.data}` as TranslationKey)}
      </Text>
      <Text role="label" color="textTertiary">
        {t('replyHabit.source')}
      </Text>
    </Box>
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

/**
 * Volver.
 *
 * Sin ícono: MESH no tiene set propio, y uno genérico de librería al lado de la
 * tipografía de marca se lee como pegado — la misma razón por la que la barra
 * de pestañas es solo texto. La palabra ocupa más que una flecha y dice
 * exactamente lo que hace.
 */
function BackControl({
  onPress,
  insetTop,
  withBand,
}: {
  onPress: () => void
  insetTop: number
  /** El contenido ya le pasa por abajo, así que hace falta una barra. */
  withBand: boolean
}) {
  const t = useT()
  const theme = useTheme()

  return (
    <>
      {withBand ? (
        <View
          pointerEvents="none"
          testID="profile-back-band"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insetTop + spacing.sm + MIN_TOUCH_TARGET + spacing.sm,
            backgroundColor: theme.surface,
            borderBottomWidth: HAIRLINE,
            borderBottomColor: theme.borderSubtle,
            zIndex: 1,
          }}
        />
      ) : null}

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('profile.back')}
        testID="profile-back"
        style={{
          position: 'absolute',
          top: insetTop + spacing.sm,
          left: SCREEN_GUTTER,
          minHeight: MIN_TOUCH_TARGET,
          justifyContent: 'center',
          paddingHorizontal: spacing.sm,
          borderRadius: radius.full,
          borderWidth: HAIRLINE,
          borderColor: theme.borderSubtle,
          backgroundColor: theme.surface,
          zIndex: 2,
        }}
      >
        <Text role="label">{t('profile.back')}</Text>
      </Pressable>
    </>
  )
}

function Hero({
  piece,
  hidden,
  saved,
  onToggleSaved,
}: {
  piece: PortfolioPiece
  hidden: boolean
  /** `null` cuando no hay sesión: sin dónde guardarlo, no se ofrece. */
  saved: boolean | null
  onToggleSaved: () => void
}) {
  const theme = useTheme()
  const aspectRatio = ratioOf(piece.width, piece.height)

  return (
    <View>
      <Image
        // `lg` solo acá: es la única imagen a ancho completo de la pantalla.
        source={mediaUrl(piece.mediaPath, 'lg')}
        placeholder={
          piece.blurhash != null ? { blurhash: piece.blurhash } : null
        }
        placeholderContentFit="cover"
        contentFit="cover"
        transition={0}
        accessible={false}
        style={{
          width: '100%',
          aspectRatio,
          borderRadius: radius.lg,
          backgroundColor: theme.surfaceRaised,
          opacity: hidden ? 0 : 1,
        }}
      />
      {/* Abajo a la derecha, encima de la obra. Ponerlo debajo empujaría el
          nombre del artista fuera de la primera pantalla, y el nombre es lo
          que contesta a quién estás mirando. */}
      {saved != null && !hidden ? (
        <View
          style={{
            position: 'absolute',
            right: spacing.xs,
            bottom: spacing.xs,
          }}
        >
          <SaveHeart
            isSaved={saved}
            onToggle={onToggleSaved}
            testID="profile-hero-heart"
          />
        </View>
      ) : null}
    </View>
  )
}

/**
 * Grilla de obra.
 *
 * Dos columnas con `aspectRatio` fijo: la grilla **no puede saltar** mientras
 * cargan las imágenes. Con altura derivada de cada foto, cada llegada
 * reacomodaría lo que ya se está mirando.
 */
function Grid({
  pieces,
  isSaved,
  onToggleSaved,
}: {
  pieces: readonly PortfolioPiece[]
  /** `null` cuando no hay sesión: sin dónde guardarlo, no se ofrece. */
  isSaved: ((portfolioItemId: string) => boolean) | null
  onToggleSaved: (portfolioItemId: string) => void
}) {
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const columnWidth = (width - SCREEN_GUTTER * 2 - spacing.xxs) / 2

  return (
    <Box direction="row" gap="xxs" wrap>
      {pieces.map((piece) => (
        <View key={piece.id} style={{ width: columnWidth }}>
          <Image
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
          {isSaved != null ? (
            <View
              style={{
                position: 'absolute',
                right: spacing.xxs,
                bottom: spacing.xxs,
              }}
            >
              <SaveHeart
                isSaved={isSaved(piece.id)}
                onToggle={() => onToggleSaved(piece.id)}
                testID={`profile-piece-heart-${piece.id}`}
              />
            </View>
          ) : null}
        </View>
      ))}
    </Box>
  )
}
