/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El mazo del artista anda de verdad acá: hay dos búsquedas de ejemplo y se
 * suman las que abras vos desde "Buscar por fotos". Lo que NO se prueba es lo
 * único que importa de privacidad —que una búsqueda cerrada no la vea nadie—,
 * porque eso lo decide RLS y acá no hay base. Está en
 * supabase/tests/46_open_searches.sql y en tests/integration.
 */

import {
  decidePreviewSearch,
  previewMediaUrl,
  previewOpenSearches,
  undoPreviewSearchDecision,
} from '../../../preview/store.ts'

export interface OpenSearch {
  readonly projectId: string
  readonly title: string
  readonly description: string | null
  readonly locationSlug: string | null
  readonly budgetMinCents: number | null
  readonly budgetMaxCents: number | null
  readonly budgetCurrency: string | null
  readonly timing: string | null
  readonly sizeNote: string | null
  readonly createdAt: string
  readonly styleSlugs: readonly string[]
  readonly referenceUrls: readonly string[]
}

export interface OpenSearchPage {
  readonly items: readonly OpenSearch[]
  readonly nextCursor: string | null
}

export async function fetchOpenSearchFeed(
  _categorySlug: string,
  _cursor: string | null,
): Promise<OpenSearchPage> {
  return {
    items: previewOpenSearches().map((search) => ({
      projectId: search.projectId,
      title: search.title,
      description: null,
      locationSlug: search.locationSlug,
      budgetMinCents: null,
      budgetMaxCents: null,
      budgetCurrency: null,
      timing: null,
      sizeNote: null,
      createdAt: search.createdAt,
      styleSlugs: search.styleSlugs,
      // En el preview no hay URLs firmadas: la imagen ya está adentro del
      // bundle, y `previewMediaUrl` la resuelve al data URI.
      referenceUrls: search.referenceIds.map(previewMediaUrl).filter(Boolean),
    })),
    // Una sola página: el catálogo de preview entra entero en memoria.
    nextCursor: null,
  }
}

export type Verdict = 'interest' | 'pass'

export async function decideOnSearch(
  projectId: string,
  _professionalId: string,
  verdict: Verdict,
): Promise<void> {
  decidePreviewSearch(projectId, verdict)
}

export async function undoDecision(
  projectId: string,
  _professionalId: string,
): Promise<void> {
  undoPreviewSearchDecision(projectId)
}
