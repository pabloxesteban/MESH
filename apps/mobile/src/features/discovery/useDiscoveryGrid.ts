/**
 * Estado de la grilla.
 *
 * Hermano de `useDiscoveryDeck`, y con dos diferencias que importan:
 *
 * · Pide el feed **con lo ya visto**. En el mazo, una obra que vuelve es una
 *   decisión que no se respetó; en la grilla, esconderla haría que quien marcó
 *   treinta obras no encuentre ninguna.
 * · Filtra por estilo del lado del cliente, sobre lo que ya bajó. Es
 *   deliberado y tiene un límite conocido: filtra la página, no el catálogo.
 *   Ver el comentario de `FILTROS`.
 */

import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { fetchDiscoveryFeed, type FeedItem } from './queries.ts'

export interface GridState {
  readonly items: readonly FeedItem[]
  /** Los estilos presentes en lo que bajó, para armar la fila de filtros. */
  readonly availableStyles: readonly string[]
  readonly activeStyle: string | null
  readonly setActiveStyle: (slug: string | null) => void
  readonly isLoading: boolean
  readonly isEmpty: boolean
  /** Vacío por el filtro, no por falta de catálogo. Son dos mensajes distintos. */
  readonly isFilteredEmpty: boolean
  readonly error: unknown
  readonly loadMore: () => void
  readonly retry: () => void
}

export function useDiscoveryGrid(
  categorySlug: string,
  userId: string | null,
): GridState {
  const [activeStyle, setActiveStyle] = useState<string | null>(null)

  const query = useInfiniteQuery({
    queryKey: ['discovery-grid', categorySlug, userId],
    enabled: userId != null,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchDiscoveryFeed(categorySlug, pageParam, { includeSeen: true }),
    getNextPageParam: (page) => page.nextCursor,
  })

  const all = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.items),
    [query.data],
  )

  /**
   * Los estilos que se ofrecen son los que existen en lo que bajó, no la
   * taxonomía entera: un chip que no filtra nada es una promesa vacía.
   */
  const availableStyles = useMemo(() => {
    const vistos = new Set<string>()
    for (const item of all) {
      for (const style of item.styles) vistos.add(style.slug)
    }
    return [...vistos].sort()
  }, [all])

  const items = useMemo(
    () =>
      activeStyle == null
        ? all
        : all.filter((item) =>
            item.styles.some((style) => style.slug === activeStyle),
          ),
    [all, activeStyle],
  )

  // La llama la pantalla cuando el scroll se acerca al final. Con un filtro
  // activo puede pedir varias páginas seguidas sin agregar nada visible — es
  // correcto: la página que bajó puede no tener ninguna obra de ese estilo.
  function loadMore() {
    if (query.hasNextPage !== true || query.isFetchingNextPage) return
    void query.fetchNextPage()
  }

  return {
    items,
    availableStyles,
    activeStyle,
    setActiveStyle,
    isLoading: query.isPending && userId != null,
    isEmpty: !query.isPending && all.length === 0,
    isFilteredEmpty:
      !query.isPending && all.length > 0 && items.length === 0,
    error: query.error,
    loadMore,
    retry: () => void query.refetch(),
  }
}
