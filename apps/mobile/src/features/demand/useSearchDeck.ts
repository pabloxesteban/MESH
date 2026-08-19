/**
 * Estado del mazo del artista.
 *
 * Hermano de `useDiscoveryDeck` y con la misma forma a propósito: el gesto no
 * vive acá, deshacer existe, y la decisión solo cruza a React cuando ya está
 * tomada. Lo que cambia es qué se decide — una búsqueda de alguien, no una
 * obra— y que del otro lado hay una persona esperando.
 *
 * Por eso deshacer importa más todavía que en el otro mazo: acá un error no
 * pierde contenido, le manda un aviso a alguien.
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import {
  decideOnSearch,
  fetchOpenSearchFeed,
  undoDecision,
  type OpenSearch,
  type Verdict,
} from './queries.ts'

/** Cuántas tarjetas quedan cuando se pide la página siguiente. */
const PREFETCH_THRESHOLD = 4

/** Cuántas tarjetas se mantienen montadas. Ver el presupuesto de performance. */
export const MOUNTED_CARDS = 3

export interface SearchDeckState {
  readonly cards: readonly OpenSearch[]
  readonly top: OpenSearch | undefined
  readonly isLoading: boolean
  readonly isEmpty: boolean
  readonly error: unknown
  readonly canUndo: boolean
  readonly undoTarget: {
    readonly projectId: string
    readonly verdict: Verdict
  } | null
  readonly decide: (verdict: Verdict) => void
  readonly undo: () => void
  readonly retry: () => void
}

export function useSearchDeck(
  categorySlug: string,
  professionalId: string | null,
): SearchDeckState {
  const queryClient = useQueryClient()
  const [decidedIds, setDecidedIds] = useState<readonly string[]>([])
  const [last, setLast] = useState<
    { search: OpenSearch; verdict: Verdict } | null
  >(null)

  const query = useInfiniteQuery({
    queryKey: ['open-searches', categorySlug, professionalId],
    // Sin perfil de artista no hay nada que pedir. El RPC devolvería vacío
    // igual, pero pedirlo sería un round trip para confirmar lo que ya sabemos.
    enabled: professionalId != null,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchOpenSearchFeed(categorySlug, pageParam),
    getNextPageParam: (page) => page.nextCursor,
  })

  const cards = useMemo(() => {
    const decided = new Set(decidedIds)
    return (query.data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((item) => !decided.has(item.projectId))
  }, [query.data, decidedIds])

  const top = cards[0]

  const decide = useCallback(
    (verdict: Verdict) => {
      if (top == null || professionalId == null) return

      // La tarjeta se va ya. La escritura va detrás: hacer esperar a alguien
      // por un round trip para ver la tarjeta siguiente convierte un mazo en
      // un formulario.
      setDecidedIds((previous) => [...previous, top.projectId])
      setLast({ search: top, verdict })

      void decideOnSearch(top.projectId, professionalId, verdict).catch(() => {
        // Si la escritura falla, la tarjeta vuelve. Es preferible mostrarla dos
        // veces a decirle a alguien que mandó un interés que nunca salió.
        setDecidedIds((previous) =>
          previous.filter((id) => id !== top.projectId),
        )
        setLast(null)
      })

      if (
        cards.length - 1 <= PREFETCH_THRESHOLD &&
        query.hasNextPage &&
        !query.isFetchingNextPage
      ) {
        void query.fetchNextPage()
      }
    },
    [top, professionalId, cards.length, query],
  )

  const undo = useCallback(() => {
    if (last == null || professionalId == null) return
    const { search } = last
    setDecidedIds((previous) =>
      previous.filter((id) => id !== search.projectId),
    )
    setLast(null)
    void undoDecision(search.projectId, professionalId).then(() =>
      queryClient.invalidateQueries({ queryKey: ['open-searches'] }),
    )
  }, [last, professionalId, queryClient])

  return {
    cards: cards.slice(0, MOUNTED_CARDS),
    top,
    isLoading: query.isPending && professionalId != null,
    isEmpty: !query.isPending && cards.length === 0,
    error: query.error,
    canUndo: last != null,
    undoTarget:
      last == null
        ? null
        : { projectId: last.search.projectId, verdict: last.verdict },
    decide,
    undo,
    retry: () => void query.refetch(),
  }
}
