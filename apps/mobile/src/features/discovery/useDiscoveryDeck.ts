/**
 * Estado del mazo.
 *
 * Una sola responsabilidad: qué tarjetas hay, cuál está arriba, y qué pasa
 * cuando alguien decide. El gesto no vive acá — vive en el hilo de UI, en
 * `SwipeCard`, y solo cruza a React cuando la decisión ya está tomada.
 *
 * Deshacer existe porque una decisión de una décima de segundo se equivoca. Sin
 * deshacer, el mazo castiga el error con contenido perdido, y eso enseña a
 * deslizar despacio — que es exactamente lo contrario de para qué sirve.
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { recordInteraction, undoInteraction } from './interactions.ts'
import { fetchDiscoveryFeed, type FeedItem } from './queries.ts'

/** Cuántas tarjetas quedan cuando se pide la página siguiente. */
const PREFETCH_THRESHOLD = 4

/** Cuántas tarjetas se mantienen montadas. Ver el presupuesto de performance. */
export const MOUNTED_CARDS = 3

export type Decision = 'like' | 'save' | 'pass'

export interface DeckState {
  readonly cards: readonly FeedItem[]
  readonly top: FeedItem | undefined
  readonly isLoading: boolean
  readonly isEmpty: boolean
  readonly error: unknown
  readonly canUndo: boolean
  /** Qué se desharía. Lo necesita analytics, y también un aviso de "deshecho". */
  readonly undoTarget: {
    readonly portfolioItemId: string
    readonly verdict: 'like' | 'pass'
  } | null
  readonly decide: (decision: Decision) => void
  readonly undo: () => void
  readonly retry: () => void
}

export function useDiscoveryDeck(
  categorySlug: string,
  userId: string | null,
): DeckState {
  const queryClient = useQueryClient()
  const [decidedIds, setDecidedIds] = useState<readonly string[]>([])
  const [lastDecided, setLastDecided] = useState<FeedItem | null>(null)
  const [lastVerdict, setLastVerdict] = useState<'like' | 'pass'>('like')

  const query = useInfiniteQuery({
    queryKey: ['discovery', categorySlug],
    queryFn: ({ pageParam }) => fetchDiscoveryFeed(categorySlug, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: userId != null,
  })

  const all = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  )

  // Se filtra en el cliente en vez de refetchear: el RPC ya excluye lo visto,
  // pero refetchear en cada deslizada tiraría la página entera y volvería a
  // pedirla. La lista local es la verdad hasta la próxima página.
  const cards = useMemo(() => {
    const decided = new Set(decidedIds)
    return all.filter((item) => !decided.has(item.portfolioItemId))
  }, [all, decidedIds])

  const remaining = cards.length
  if (
    remaining <= PREFETCH_THRESHOLD &&
    query.hasNextPage &&
    !query.isFetchingNextPage
  ) {
    void query.fetchNextPage()
  }

  const decide = useCallback(
    (decision: Decision) => {
      const top = cards[0]
      if (top == null || userId == null) return

      // Optimista: la tarjeta se va ya. La escritura viaja detrás, y si no hay
      // red se encola. Esperar la red para mover una tarjeta convierte un gesto
      // de 200ms en uno de dos segundos.
      setDecidedIds((previous) => [...previous, top.portfolioItemId])
      setLastDecided(top)
      setLastVerdict(decision === 'pass' ? 'pass' : 'like')

      void recordInteraction(userId, {
        portfolioItemId: top.portfolioItemId,
        verdict: decision === 'pass' ? 'pass' : 'like',
        isSaved: decision === 'save',
        source: 'discover',
      })
    },
    [cards, userId],
  )

  const undo = useCallback(() => {
    if (lastDecided == null || userId == null) return
    const restored = lastDecided
    setLastDecided(null)
    setDecidedIds((previous) =>
      previous.filter((id) => id !== restored.portfolioItemId),
    )
    void undoInteraction(userId, restored.portfolioItemId)
  }, [lastDecided, userId])

  const retry = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['discovery', categorySlug],
    })
  }, [queryClient, categorySlug])

  return {
    cards: cards.slice(0, MOUNTED_CARDS),
    top: cards[0],
    isLoading: query.isPending,
    // Vacío de verdad: cargó, no hay error, y no queda nada ni por traer.
    isEmpty:
      !query.isPending &&
      query.error == null &&
      cards.length === 0 &&
      !query.hasNextPage,
    error: query.error,
    canUndo: lastDecided != null,
    undoTarget:
      lastDecided == null
        ? null
        : {
            portfolioItemId: lastDecided.portfolioItemId,
            verdict: lastVerdict,
          },
    decide,
    undo,
    retry,
  }
}
