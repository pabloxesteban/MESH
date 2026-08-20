/**
 * El brief, contra la base.
 *
 * Tres cosas distintas y conviene no confundirlas:
 *
 * - **El vocabulario** (`traits`) es público y sale de la tabla. No está
 *   hardcodeado acá a propósito: la lista que la pantalla ofrece tiene que ser
 *   exactamente la que el clasificador puede devolver, y una lista escrita dos
 *   veces se separa a la primera edición.
 * - **Los rasgos de una búsqueda** los escribe su dueña, y solo ella los lee.
 * - **La propuesta** la escribe el artista acá y la lee la dueña desde
 *   `features/demand/interests.ts`, que es donde ya vivía la lista de quién le
 *   respondió. Una segunda lista con los mismos datos habría sido la que nadie
 *   abre.
 *
 * Ver ADR-020.
 */

import type { TraitDimension } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'

export interface Trait {
  readonly id: string
  readonly slug: string
  readonly dimension: TraitDimension
  readonly nameKey: string
}

/** El vocabulario de una categoría, en el orden en que se muestra. */
export async function fetchTraits(
  categorySlug = 'tattoo',
): Promise<readonly Trait[]> {
  const { data, error } = await supabase
    .from('traits')
    .select('id, slug, dimension, name_key, categories!inner(slug)')
    .eq('categories.slug', categorySlug)
    .eq('is_active', true)
    .order('dimension')
    .order('sort_order')
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    dimension: row.dimension as TraitDimension,
    nameKey: row.name_key,
  }))
}

/** Los rasgos que ya tiene una búsqueda propia. */
export async function fetchProjectTraits(
  projectId: string,
): Promise<readonly string[]> {
  const { data, error } = await supabase
    .from('project_traits')
    .select('traits!inner(slug)')
    .eq('project_id', projectId)
  if (error != null) throw error

  return (data ?? []).map((row) =>
    String((row.traits as { slug: string }).slug),
  )
}

/**
 * Deja los rasgos de una búsqueda exactamente en los que se piden.
 *
 * Borra y escribe en vez de calcular la diferencia: son tres filas, la tabla no
 * tiene UPDATE a propósito, y un diff de tres elementos es más código del que
 * ahorra.
 */
export async function setProjectTraits(
  projectId: string,
  traitIds: readonly string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('project_traits')
    .delete()
    .eq('project_id', projectId)
  if (deleteError != null) throw deleteError

  if (traitIds.length === 0) return

  const { error } = await supabase
    .from('project_traits')
    .insert(
      traitIds.map((traitId) => ({ project_id: projectId, trait_id: traitId })),
    )
  if (error != null) throw error
}

/** Los rasgos de una búsqueda ABIERTA, para el mazo del artista. */
export async function fetchOpenSearchTraits(
  projectId: string,
): Promise<readonly { dimension: TraitDimension; slug: string }[]> {
  const { data, error } = await supabase.rpc('get_open_search_traits', {
    p_project_id: projectId,
  })
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    dimension: row.dimension as TraitDimension,
    slug: row.slug,
  }))
}

/**
 * El artista responde con una propuesta.
 *
 * No abre chat y no manda ningún mensaje: la propuesta vive en la búsqueda de
 * la persona, y el chat lo sigue abriendo ella. Ver ADR-012 y ADR-014.
 */
export async function sendProposal(input: {
  projectId: string
  professionalId: string
  priceMinCents: number
  priceMaxCents: number
  sessions: number
  note: string | null
}): Promise<void> {
  const { error } = await supabase.from('project_interests').insert({
    project_id: input.projectId,
    professional_id: input.professionalId,
    verdict: 'interest',
    price_min_cents: input.priceMinCents,
    price_max_cents: input.priceMaxCents,
    price_currency: 'ARS',
    sessions: input.sessions,
    note: input.note,
  })
  if (error != null) throw error
}
