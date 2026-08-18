/**
 * El vector de gusto de la persona, calculado en el cliente.
 *
 * `computeTaste` es puro y barato (decenas de interacciones), así que se
 * recalcula en cada cambio en vez de mantener un acumulador. Eso es lo que hace
 * que deshacer funcione sin ninguna lógica de compensación.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { computeTaste, type TasteResult } from '@mesh/domain'

import {
  fetchCategoryId,
  fetchTasteSource,
  persistTaste,
  resetTaste,
} from './queries.ts'

export interface TasteState {
  readonly taste: TasteResult | null
  readonly isLoading: boolean
  readonly error: unknown
  readonly retry: () => void
  readonly reset: () => Promise<void>
}

export function useTaste(
  categorySlug: 'tattoo',
  userId: string | null,
): TasteState {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['taste', categorySlug, userId],
    enabled: userId != null,
    queryFn: async () => {
      const source = await fetchTasteSource()
      const result = computeTaste({
        categorySlug,
        interactions: source.interactions,
        pieces: source.pieces,
      })

      // La persistencia es un efecto secundario del cálculo, no su propósito.
      // Si falla, la pantalla igual muestra el vector — es un caché, y se
      // reconstruye entero desde `interactions`.
      const categoryId = await fetchCategoryId(categorySlug)
      if (categoryId != null && userId != null) {
        await persistTaste(userId, {
          categoryId,
          scores: result.scores,
          aversion: result.aversion,
          decisiveCount: result.decisiveCount,
          isReady: result.isReady,
          algoVersion: result.algoVersion,
        }).catch(() => undefined)
      }

      return result
    },
  })

  const reset = useCallback(async () => {
    if (userId == null) return
    await resetTaste(userId)
    await queryClient.invalidateQueries()
  }, [userId, queryClient])

  const retry = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['taste', categorySlug, userId],
    })
  }, [queryClient, categorySlug, userId])

  return useMemo(
    () => ({
      taste: query.data ?? null,
      isLoading: query.isPending,
      error: query.error,
      retry,
      reset,
    }),
    [query.data, query.isPending, query.error, retry, reset],
  )
}
