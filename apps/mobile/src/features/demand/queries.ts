/**
 * El único lugar donde el mazo del artista habla con Supabase.
 *
 * Todo lo de acá está autorizado por RLS y por la proyección del RPC, no por
 * estas funciones: un cliente modificado que llame `decideOnSearch` con el id
 * de otro profesional recibe un 42501, y `select * from projects` no devuelve
 * una sola fila ajena. Ver supabase/tests/46_open_searches.sql.
 */

import { supabase } from '../../data/supabase.ts'

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
  /**
   * URLs firmadas de las fotos de referencia. Vacío si la persona no subió
   * ninguna — que pasa, y la tarjeta lo dice en vez de mostrar un hueco.
   */
  readonly referenceUrls: readonly string[]
}

export interface OpenSearchPage {
  readonly items: readonly OpenSearch[]
  /** `created_at` de la última fila. `null` cuando no hay más. */
  readonly nextCursor: string | null
}

/** Cuánto vive una URL firmada. Alcanza de sobra para mirar una tarjeta. */
const SIGNED_URL_TTL_SECONDS = 60 * 60

const PAGE_SIZE = 12

/**
 * Las búsquedas abiertas que piden algo que este artista hace.
 *
 * El filtro por estilo lo hace el RPC y no el cliente: bajar todas las
 * búsquedas abiertas para descartar la mayoría acá sería, además de lento,
 * exponer las que no corresponden.
 */
export async function fetchOpenSearchFeed(
  categorySlug: string,
  cursor: string | null,
): Promise<OpenSearchPage> {
  const { data, error } = await supabase.rpc('get_open_search_feed', {
    p_category_slug: categorySlug,
    p_limit: PAGE_SIZE,
    ...(cursor != null ? { p_cursor: cursor } : {}),
  })

  if (error != null) throw error

  const rows = data ?? []
  const items = await Promise.all(rows.map(toOpenSearch))
  const last = rows[rows.length - 1]

  return {
    items,
    nextCursor: rows.length < PAGE_SIZE ? null : (last?.created_at ?? null),
  }
}

interface FeedRow {
  project_id: string
  title: string
  description: string | null
  location_slug: string | null
  budget_min_cents: number | null
  budget_max_cents: number | null
  budget_currency: string | null
  timing: string | null
  size_note: string | null
  created_at: string
  style_slugs: string[] | null
  reference_paths: string[] | null
}

async function toOpenSearch(row: FeedRow): Promise<OpenSearch> {
  return {
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    locationSlug: row.location_slug,
    budgetMinCents: row.budget_min_cents,
    budgetMaxCents: row.budget_max_cents,
    budgetCurrency: row.budget_currency,
    timing: row.timing,
    sizeNote: row.size_note,
    createdAt: row.created_at,
    styleSlugs: row.style_slugs ?? [],
    referenceUrls: await signReferences(row.reference_paths ?? []),
  }
}

/**
 * El bucket `references` es privado, así que no hay URL pública: hay que
 * firmar. La firma la autoriza la política de storage, no esta función — un
 * artista que pida la ruta de una búsqueda cerrada recibe un error, y por eso
 * un fallo devuelve la lista sin esa foto en vez de romper la tarjeta.
 */
async function signReferences(
  paths: readonly string[],
): Promise<readonly string[]> {
  if (paths.length === 0) return []

  const { data, error } = await supabase.storage
    .from('references')
    .createSignedUrls([...paths], SIGNED_URL_TTL_SECONDS)

  if (error != null) return []

  return (data ?? [])
    .map((entry) => entry.signedUrl)
    .filter((url): url is string => url != null)
}

export type Verdict = 'interest' | 'pass'

/**
 * La decisión del artista sobre una búsqueda.
 *
 * `interest` le llega a la persona; `pass` no le llega a nadie y solo existe
 * para que el mazo no repita. Las dos se guardan por el mismo camino porque
 * son la misma decisión con dos resultados.
 */
export async function decideOnSearch(
  projectId: string,
  professionalId: string,
  verdict: Verdict,
): Promise<void> {
  const { error } = await supabase.from('project_interests').insert({
    project_id: projectId,
    professional_id: professionalId,
    verdict,
  })

  if (error != null) throw error
}

/** Deshacer. La búsqueda vuelve al mazo en la próxima página. */
export async function undoDecision(
  projectId: string,
  professionalId: string,
): Promise<void> {
  const { error } = await supabase
    .from('project_interests')
    .delete()
    .eq('project_id', projectId)
    .eq('professional_id', professionalId)

  if (error != null) throw error
}
