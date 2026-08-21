/**
 * Tu pedido, arriba de todo en Inicio.
 *
 * **Es el giro de la app.** Hasta el 2026-08-21 Inicio abría con una grilla de
 * tatuadores desconocidos: una vidriera, con la misma respuesta para todos y
 * nada que hacer. El pedido existía —lo arma una foto o el asistente— pero
 * después de publicarlo no había ninguna pantalla que dijera en qué andaba.
 * Se publicaba y desaparecía. Ver `docs/product/por-que-mesh.md`.
 *
 * Ahora lo primero que se ve es lo tuyo, y contesta la única pregunta que
 * alguien se hace al abrir la app dos días después de escribir su idea:
 * **¿esto le llegó a alguien?**
 *
 * Cuatro estados y ninguno miente:
 *
 * · **Sin pedido** — la invitación, con los dos caminos que ya existen: una
 *   foto, o contarlo con palabras.
 * · **Cerrado** — "elegiste que no lo vea nadie, y no le llegó a ningún
 *   tatuador". Con el botón para abrirlo. Es la vuelta atrás que
 *   [ADR-014](../../../../../docs/decisions/ADR-014-two-sided.md) nunca tuvo:
 *   la decisión se tomaba al publicar y quedaba clavada.
 * · **Abierto, sin respuestas** — lo pueden ver quienes tatúan ese estilo, y
 *   todavía no contestó nadie. **No se estima cuándo** ni se dice a cuántos:
 *   inventar un número o una espera es exactamente el innegociable 2.
 * · **Con propuestas** — las que volvieron, con su precio real. Es
 *   `InterestList`, que antes vivía abajo de los chats: una propuesta es la
 *   respuesta a un pedido, no una conversación.
 *
 * Lo que **no** hace, a propósito: no cuenta propuestas en grande, no pone
 * insignia, no dice "¡3 tatuadores te esperan!". Un número cuyo propósito es
 * que alguien vuelva a entrar está prohibido por el innegociable 3.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { View } from 'react-native'

import {
  Box,
  Button,
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

import { InterestList } from '../demand/InterestList.tsx'
import { fetchSearchInterests } from '../demand/interests.ts'
import { fetchProjects, setProjectOpen } from '../projects/queries.ts'
import type { ProjectSummary } from '../projects/queries.ts'

export interface RequestBandProps {
  /** Sin sesión no hay pedido que leer, y la banda no se muestra. */
  userId: string | null
  onSearchByPhotos: () => void
  onSearchByWords: () => void
  onOpenArtist: (professionalSlug: string) => void
  /** Lleva a Explorar filtrado por el estilo del pedido. */
  onExploreStyle: (styleSlug: string) => void
}

export function RequestBand({
  userId,
  onSearchByPhotos,
  onSearchByWords,
  onOpenArtist,
  onExploreStyle,
}: RequestBandProps) {
  const t = useT()

  const pedidos = useQuery({
    queryKey: ['projects'],
    enabled: userId != null,
    queryFn: fetchProjects,
  })

  const propuestas = useQuery({
    queryKey: ['search-interests'],
    enabled: userId != null,
    queryFn: () => fetchSearchInterests(),
  })

  if (userId == null) return null

  if (pedidos.error != null) {
    return (
      <Marco>
        <ErrorView
          error={pedidos.error}
          onRetry={() => void pedidos.refetch()}
          testID="request-error"
        />
      </Marco>
    )
  }

  if (pedidos.isPending) {
    return (
      <Marco>
        <Box gap="xs" testID="request-loading">
          <Skeleton height={20} width="40%" />
          <Skeleton height={72} radius="md" />
        </Box>
      </Marco>
    )
  }

  // El más nuevo. En V1 alguien tiene un pedido, no veinte, y una lista que
  // casi siempre muestra un ítem es un toque de más entre la persona y lo que
  // vino a hacer. Los demás siguen existiendo y se leen desde Perfil.
  const pedido = pedidos.data[0]

  if (pedido == null) {
    return (
      <Marco>
        <Box gap="xs" testID="request-empty">
          <Text role="titleLg">{t('request.empty.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('request.empty.body')}
          </Text>
          <Box gap="xxs" paddingTop="xxs">
            <Button
              label={t('request.empty.photos')}
              onPress={onSearchByPhotos}
              fullWidth
              testID="request-empty-photos"
            />
            <Button
              label={t('request.empty.words')}
              variant="secondary"
              onPress={onSearchByWords}
              fullWidth
              testID="request-empty-words"
            />
          </Box>
          {/* Y abajo sigue la grilla. La invitación no tapa la salida: quien
              vino solo a mirar quién tatúa cerca suyo desplaza y la tiene. */}
          <Text role="body" color="textTertiary">
            {t('request.empty.orBrowse')}
          </Text>
        </Box>
      </Marco>
    )
  }

  const suyas = (propuestas.data ?? []).filter(
    (item) => item.projectId === pedido.id,
  )

  return (
    <Marco>
      <Box gap="sm" testID="request-band">
        <Text role="titleLg">{t('request.title')}</Text>
        <PedidoCard pedido={pedido} onExploreStyle={onExploreStyle} />
        <Alcance pedido={pedido} tieneRespuestas={suyas.length > 0} />
        <InterestList onOpenProfile={onOpenArtist} />
      </Box>
    </Marco>
  )
}

/** El margen lateral y el aire de abajo, en un solo lugar. */
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <Box paddingX="lg" paddingBottom="lg">
      {children}
    </Box>
  )
}

function PedidoCard({
  pedido,
  onExploreStyle,
}: {
  pedido: ProjectSummary
  onExploreStyle: (styleSlug: string) => void
}) {
  const t = useT()
  const theme = useTheme()
  const estilo = pedido.styles[0]?.styleSlug ?? null

  return (
    <View
      testID={`request-project-${pedido.id}`}
      style={{
        borderRadius: radius.md,
        backgroundColor: theme.surfaceRaised,
        padding: spacing.sm,
        gap: spacing.xs,
      }}
    >
      <Text role="title">{pedido.title}</Text>

      {pedido.description != null ? (
        <Text role="body" color="textSecondary" numberOfLines={3}>
          {pedido.description}
        </Text>
      ) : null}

      {pedido.styles.length > 0 ? (
        <Box direction="row" gap="xxs" wrap>
          {pedido.styles.map((style) => (
            <Tag
              key={style.styleSlug}
              label={t(`style.tattoo.${style.styleSlug}` as TranslationKey)}
              styleSlug={style.styleSlug}
              filled
            />
          ))}
        </Box>
      ) : null}

      {estilo != null ? (
        <Button
          label={t('request.exploreStyle', {
            estilo: t(`style.tattoo.${estilo}` as TranslationKey),
          })}
          variant="ghost"
          size="sm"
          onPress={() => onExploreStyle(estilo)}
          testID="request-explore-style"
        />
      ) : null}
    </View>
  )
}

/**
 * A dónde llegó, dicho sin adornar.
 *
 * Con propuestas no dice nada: las propuestas que siguen abajo ya lo
 * contestaron, y repetirlo sería relleno.
 */
function Alcance({
  pedido,
  tieneRespuestas,
}: {
  pedido: ProjectSummary
  tieneRespuestas: boolean
}) {
  const t = useT()
  const client = useQueryClient()

  const abrir = useMutation({
    mutationFn: (open: boolean) => setProjectOpen(pedido.id, open),
    onSuccess: () => client.invalidateQueries({ queryKey: ['projects'] }),
  })

  if (tieneRespuestas) return null

  if (!pedido.openToProfessionals) {
    return (
      <Box gap="xxs" testID="request-closed">
        <Text role="body" color="textSecondary">
          {t('request.closed.body')}
        </Text>
        <Button
          label={t('request.closed.action')}
          loading={abrir.isPending}
          onPress={() => abrir.mutate(true)}
          fullWidth
          testID="request-open"
        />
      </Box>
    )
  }

  return (
    <Box gap="xxs" testID="request-waiting">
      <Text role="body" color="textSecondary">
        {t('request.waiting.body')}
      </Text>
      {/* Cerrarlo es un fantasma y no un botón lleno: la acción de esta
          pantalla es esperar o mirar obra, no arrepentirse. */}
      <Button
        label={t('request.waiting.close')}
        variant="ghost"
        size="sm"
        loading={abrir.isPending}
        onPress={() => abrir.mutate(false)}
        testID="request-close"
      />
    </Box>
  )
}
