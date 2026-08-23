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
  type ViewStyle,
} from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
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
import {
  DIM_PEEK,
  IMAGE_OVERSCALE,
  SCALE_FOCUS,
  SCALE_PEEK,
} from '@/features/artists/carouselMotion.ts'
import { SaveHeart } from '@/features/saved/SaveHeart.tsx'
import { PublicCalendar } from '@/features/scheduling/PublicCalendar.tsx'
import { ReviewList } from '@/features/reviews/ReviewList.tsx'
import { SafetyRow } from '@/features/moderation/SafetyRow.tsx'
import { useSaved } from '@/features/saved/useSaved.ts'
import { mediaUrl } from '@/features/discovery/queries.ts'
import { GrowingArtwork } from '@/features/transitions/GrowingArtwork.tsx'
import { DEFAULT_RATIO } from '@/features/transitions/geometry.ts'
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
  onChat?:
    | ((professionalId: string, name: string, initialDraft?: string) => void)
    | undefined
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
    // Diseños propios (ADR-034): su propia sub-sección, separada de "Obra" —
    // que sigue siendo solo tatuajes ya hechos. La destacada sale del set
    // completo más arriba y no cambia; acá solo se reparte lo que queda.
    const obraPieces = rest.filter((piece) => !piece.isOriginalDesign)
    const ownDesignPieces = rest.filter((piece) => piece.isOriginalDesign)

    // Se anota cuál es el hero para que la vuelta sepa qué obra devolver. Es un
    // ref y no estado: cambiarlo no tiene que redibujar nada.
    heroShown.current = hero ?? null
    rearmReturn()

    return (
      <Box gap="lg" testID="profile-content">
        {/* La obra y el resto de la obra, en un solo carrusel horizontal
            grande — no una foto estática seguida, más abajo, de una fila de
            miniaturas. El hero sigue siendo el primero (D-011: es la obra que
            se tocó, o la destacada) y es el único invisible mientras la copia
            que crece viaja hacia acá: si los dos se vieran a la vez, la
            transición mostraría el truco. */}
        {hero != null ? (
          <HeroCarousel
            pieces={[hero, ...obraPieces]}
            heroHidden={entrance.growing != null}
            isSaved={userId == null ? null : saved.isSaved}
            onToggleSaved={saved.toggle}
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

        {/* Diseños propios: flash o boceto que el artista ya tiene listo,
            con tamaño y precio declarados por él. Separada de "Obra" —
            que sigue siendo solo tatuajes ya hechos en un cliente. Nunca la
            palabra "disponible" sola, nunca un botón de reservar: el
            contacto sigue siendo el chat de siempre. Ver ADR-034. */}
        {ownDesignPieces.length > 0 ? (
          <Section title={t('profile.ownDesigns')}>
            <Text role="label" color="textTertiary">
              {t('profile.ownDesigns.hint')}
            </Text>
            <OwnDesignsGrid
              pieces={ownDesignPieces}
              isSaved={userId == null ? null : saved.isSaved}
              onToggleSaved={saved.toggle}
              locale={locale}
              onPress={
                canChat && onChat != null
                  ? (piece) => {
                      if (piece.price == null || piece.sizeLabel == null) {
                        return
                      }
                      onChat(
                        professional.id,
                        professional.displayName,
                        t('ownDesign.chat.draft', {
                          size: piece.sizeLabel,
                          price: formatMoney(
                            piece.price.cents,
                            piece.price.currency,
                            locale,
                          ),
                        }),
                      )
                    }
                  : null
              }
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

/**
 * Geometría compartida por la imagen y el velo de atenuación de cada página
 * del carrusel, dentro de `Frame` — mismo objeto para las dos, mismo motivo
 * que `OVERSCALE_FRAME_STYLE` de `ArtistCard.tsx`: si el velo se quedara al
 * 100% mientras la imagen está sobredimensionada, un anillo de imagen sin
 * atenuar quedaría visible en el borde al encogerse.
 */
const HERO_OVERSCALE_FRAME_STYLE = {
  position: 'absolute',
  left: `${-(IMAGE_OVERSCALE - 1) * 50}%`,
  top: `${-(IMAGE_OVERSCALE - 1) * 50}%`,
  width: `${IMAGE_OVERSCALE * 100}%`,
  height: `${IMAGE_OVERSCALE * 100}%`,
} as const

/**
 * El hero y el resto de la obra, en un solo carrusel horizontal grande, con
 * el mismo efecto de foco que ya tiene el carrusel de Inicio.
 *
 * Antes eran dos cosas: una foto estática a ancho completo (`Hero`) y, más
 * abajo, una fila de miniaturas de 168pt (`Grid`). Un pedido directo cambió
 * eso: la obra tiene que verse grande, deslizable, arriba de todo — y
 * después, otro pedido directo, que se vea con el mismo lenguaje de foco
 * (escala + atenuación) que Inicio, y que el tamaño de la caja sea el mismo
 * en todos los perfiles, no uno distinto por artista.
 *
 * **La geometría del hero no cambió de lugar — sigue siendo la que espera
 * D-011.** `heroRect()` calcula el destino de la transición obra → perfil
 * con estas mismas cuentas: ancho de pantalla menos `SCREEN_GUTTER` de cada
 * lado, y `y = insetTop + spacing.md`. Acá la primera página (`pieces[0]`,
 * siempre el hero) ocupa exactamente esa caja — mismo ancho, mismo `y`, sin
 * `gap` ni `peek` que la angoste — porque el `ScrollView` vive adentro del
 * mismo `padding: SCREEN_GUTTER` que ya tenía `Hero`, y `pagingEnabled`
 * pagina por el ancho propio del `ScrollView`, que es esa misma caja.
 *
 * **Lo que sí cambió: el alto ya no sale de la forma real de la obra —
 * `DEFAULT_RATIO` fijo, mismo default que ya comparten `heroRect()` y el
 * resto del sistema de transiciones.** Antes cada perfil se veía con un alto
 * distinto según la relación de aspecto real de su hero (D-011: "el hero del
 * perfil respeta la forma real de la obra"); el pedido de mismo tamaño en
 * todos los perfiles revierte eso a propósito. Como el destino de la
 * transición también tiene que coincidir con lo que se dibuja acá,
 * `useArtworkEntrance.ts` cambió con esto — los dos usan `DEFAULT_RATIO`
 * ahora, no la forma real de la pieza tocada. Todas las fotos se recortan
 * con `cover` dentro de esa misma caja, mismo criterio que ya usa
 * `OwnDesignsGrid`.
 *
 * **El efecto de foco reusa las constantes de `carouselMotion.ts` tal
 * cual** —`SCALE_PEEK`, `SCALE_FOCUS`, `DIM_PEEK`, `IMAGE_OVERSCALE`— porque
 * el pedido fue literalmente "el mismo efecto", no uno nuevo con números
 * propios. La cuenta de cobertura de `IMAGE_OVERSCALE` ya está hecha para el
 * peor caso de ese archivo (combinado con el foco vertical de
 * `ArtistsScreen`, que acá ni existe); el caso de acá —solo horizontal, sin
 * ningún otro eje— es más chico que ese peor caso, así que el mismo valor ya
 * cubierto alcanza de sobra acá también (ver el caso "horizontal solo" que
 * ya calcula ese archivo).
 *
 * **Sin peek.** El carrusel de Inicio sí lo tiene porque ahí conviene
 * mostrar que hay más al costado; acá angostar la primera página rompería la
 * geometría de arriba. El efecto de foco igual se nota — en el gesto de
 * deslizar, cuando dos páginas se ven a la vez a mitad de camino — sin
 * necesitar que ninguna se vea nunca recortada en reposo.
 *
 * Cada página no tiene ancla de `useArtworkAnchor` —a diferencia de
 * `CarouselPiece` de Inicio, acá no hay una transición obra → perfil que
 * salga de esta pantalla, ya se está en el perfil— así que no rige la regla
 * de nunca animar el `Pressable` ancla: no hay ningún `Pressable` acá.
 */
function HeroCarousel({
  pieces,
  heroHidden,
  isSaved,
  onToggleSaved,
}: {
  pieces: readonly PortfolioPiece[]
  /** La primera página (el hero) es invisible mientras la copia que crece viaja hacia acá. */
  heroHidden: boolean
  /** `null` cuando no hay sesión: sin dónde guardarlo, no se ofrece. */
  isSaved: ((portfolioItemId: string) => boolean) | null
  onToggleSaved: (portfolioItemId: string) => void
}) {
  const { width } = useWindowDimensions()
  const pageWidth = Math.max(width - SCREEN_GUTTER * 2, 0)

  const scrollX = useSharedValue(0)
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

  return (
    <Animated.ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      testID="profile-hero-carousel"
    >
      {pieces.map((piece, index) => (
        <HeroCarouselPage
          key={piece.id}
          piece={piece}
          index={index}
          pageWidth={pageWidth}
          scrollX={scrollX}
          hidden={index === 0 && heroHidden}
          isSaved={isSaved}
          onToggleSaved={onToggleSaved}
        />
      ))}
    </Animated.ScrollView>
  )
}

function HeroCarouselPage({
  piece,
  index,
  pageWidth,
  scrollX,
  hidden,
  isSaved,
  onToggleSaved,
}: {
  piece: PortfolioPiece
  index: number
  pageWidth: number
  scrollX: SharedValue<number>
  /** Invisible mientras la copia que crece viaja hacia acá. */
  hidden: boolean
  isSaved: ((portfolioItemId: string) => boolean) | null
  onToggleSaved: (portfolioItemId: string) => void
}) {
  const theme = useTheme()
  const { reduceMotion } = useMotion()

  // Posición de reposo de esta página. JS puro: `pageWidth` no cambia
  // mientras la pantalla está montada (solo con una rotación de dispositivo,
  // que remonta la pantalla igual).
  const itemLeft = index * pageWidth

  const frameStyle = useAnimatedStyle<ViewStyle>(() => {
    if (reduceMotion) return { transform: [{ scale: 1 }], opacity: hidden ? 0 : 1 }

    const distance = itemLeft - scrollX.value
    const scale = interpolate(
      distance,
      [-pageWidth, 0, pageWidth],
      [SCALE_PEEK, SCALE_FOCUS, SCALE_PEEK],
      Extrapolation.CLAMP,
    )
    return { transform: [{ scale }], opacity: hidden ? 0 : 1 }
  })

  const scrimStyle = useAnimatedStyle<ViewStyle>(() => {
    if (reduceMotion) return { opacity: 0 }

    const distance = itemLeft - scrollX.value
    const dim = interpolate(
      distance,
      [-pageWidth, 0, pageWidth],
      [DIM_PEEK, 0, DIM_PEEK],
      Extrapolation.CLAMP,
    )
    return { opacity: dim }
  })

  return (
    <View style={{ width: pageWidth }}>
      <View
        style={{
          width: pageWidth,
          aspectRatio: DEFAULT_RATIO,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: theme.surfaceRaised,
        }}
      >
        <Animated.View
          style={[{ width: '100%', height: '100%' }, frameStyle]}
        >
          <Image
            // `lg`: son las únicas imágenes a ancho completo de la pantalla.
            source={mediaUrl(piece.mediaPath, 'lg')}
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
            style={HERO_OVERSCALE_FRAME_STYLE}
          />
          <Animated.View
            style={[
              HERO_OVERSCALE_FRAME_STYLE,
              { backgroundColor: theme.overlayScrim },
              scrimStyle,
            ]}
          />
        </Animated.View>
      </View>
      {/* Abajo a la derecha, encima de la obra. Ponerlo debajo empujaría el
          nombre del artista fuera de la primera pantalla, y el nombre es lo
          que contesta a quién estás mirando. Afuera de `Frame` a propósito:
          el corazón no tiene que achicarse ni atenuarse con el foco. */}
      {isSaved != null && !hidden ? (
        <View
          style={{
            position: 'absolute',
            right: spacing.xs,
            bottom: spacing.xs,
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
  )
}

/** Ancho fijo de cada foto de la grilla de diseños propios — ver `OwnDesignsGrid`. */
const PORTFOLIO_PIECE_WIDTH = 168

/**
 * Grilla de diseños propios (ADR-034).
 *
 * Misma geometría que `Grid` —mismo ancho de pieza, mismo `ScrollView`
 * horizontal, mismo corazón absolutamente posicionado— pero cada ítem puede
 * ser tocable: abre el chat con un mensaje armado, editable, nunca enviado
 * solo. Sin `onPress` es exactamente la misma tarjeta que `Grid`, sin gesto.
 *
 * Debajo de la imagen van tamaño, precio y la fecha en que el artista los
 * declaró — mismo patrón de confianza que `profile.price.asOf`. Sin altura
 * fija: la tipografía dinámica no tiene por qué recortarse acá.
 */
function OwnDesignsGrid({
  pieces,
  isSaved,
  onToggleSaved,
  locale,
  onPress,
}: {
  pieces: readonly PortfolioPiece[]
  /** `null` cuando no hay sesión: sin dónde guardarlo, no se ofrece. */
  isSaved: ((portfolioItemId: string) => boolean) | null
  onToggleSaved: (portfolioItemId: string) => void
  locale: string
  /** `null` cuando no se puede chatear: la tarjeta no es tocable. */
  onPress: ((piece: PortfolioPiece) => void) | null
}) {
  const theme = useTheme()
  const t = useT()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: spacing.xxs,
        paddingHorizontal: SCREEN_GUTTER,
      }}
      testID="profile-own-designs-grid"
    >
      {pieces.map((piece) => {
        // La restricción de base solo obliga en un sentido (ADR-034 §5): si
        // NO es diseño propio, tamaño y precio tienen que ser nulos. No exige
        // lo inverso — el Estudio pide los tres juntos al subir, pero nada en
        // la base impide un diseño propio todavía sin precio declarado (ver
        // ADR-034, "Lo que NO está"). Por eso se protege acá, por ítem: una
        // pieza a medias no se muestra, y no tira la pantalla entera.
        if (piece.price == null || piece.sizeLabel == null) return null
        const { price, sizeLabel } = piece

        const priceLabel = formatMoney(price.cents, price.currency, locale)
        const dateLabel = formatDate(price.pricedAt, locale)

        const image = (
          <Image
            // `sm`: una miniatura de 168pt no necesita 1600px.
            source={mediaUrl(piece.mediaPath, 'sm')}
            placeholder={
              piece.blurhash != null ? { blurhash: piece.blurhash } : null
            }
            placeholderContentFit="cover"
            contentFit="cover"
            recyclingKey={piece.id}
            transition={0}
            accessible={false}
            style={{
              width: PORTFOLIO_PIECE_WIDTH,
              aspectRatio: 1,
              borderRadius: radius.md,
              backgroundColor: theme.surfaceRaised,
            }}
          />
        )

        return (
          <View key={piece.id} style={{ width: PORTFOLIO_PIECE_WIDTH }}>
            {/* La imagen y el corazón comparten este contenedor, del mismo
                tamaño que la imagen — nada más. El corazón se posiciona
                `absolute` contra ESTE `View`, no contra la tarjeta entera: si
                compartiera contenedor con el bloque de texto de abajo (como
                pasó en un primer intento), "bottom" se mediría contra la
                altura de imagen+texto y el corazón terminaría flotando sobre
                el precio en vez de la esquina de la foto. */}
            <View>
              {onPress != null ? (
                <Pressable
                  onPress={() => onPress(piece)}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    'profile.ownDesigns.piece.a11yLabel',
                    { size: sizeLabel, price: priceLabel, fecha: dateLabel },
                  )}
                  accessibilityHint={t('profile.ownDesigns.piece.a11yHint')}
                  testID={`profile-own-design-${piece.id}`}
                >
                  {image}
                </Pressable>
              ) : (
                <View testID={`profile-own-design-${piece.id}`}>{image}</View>
              )}
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
                    testID={`profile-own-design-heart-${piece.id}`}
                  />
                </View>
              ) : null}
            </View>
            <Text role="body">{sizeLabel}</Text>
            <Text role="body">{priceLabel}</Text>
            <Text role="micro" color="textTertiary">
              {t('profile.ownDesigns.price.asOf', { fecha: dateLabel })}
            </Text>
          </View>
        )
      })}
    </ScrollView>
  )
}
