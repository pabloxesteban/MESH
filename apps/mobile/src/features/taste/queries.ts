/**
 * Gusto: leer las interacciones propias y persistir el vector.
 *
 * El cálculo NO pasa por acá — vive en `packages/domain`, es puro, y corre en
 * el cliente. Esto solo trae las filas que necesita y guarda el resultado.
 *
 * Por qué se calcula en el cliente: es una función pura de filas que la persona
 * ya posee, así que no hay ningún límite de confianza que defender, y
 * calcularlo local hace que la pantalla se actualice al instante. Se persiste
 * para continuidad entre dispositivos y para poder responder meses después "¿con
 * qué gusto se generó este match?".
 */

import type { Interaction, PieceStyles } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'

export interface TasteSource {
  readonly interactions: readonly Interaction[]
  readonly pieces: ReadonlyMap<string, PieceStyles>
}

interface InteractionRow {
  portfolio_item_id: string
  verdict: 'like' | 'pass'
  is_saved: boolean
  source: 'discover' | 'search' | 'profile'
}

interface PieceStyleRow {
  portfolio_item_id: string
  weight: number
  styles: { slug: string } | null
}

/**
 * Trae las interacciones y las etiquetas de las piezas involucradas.
 *
 * Dos consultas y no un join: PostgREST devolvería la fila de estilos anidada
 * dentro de cada interacción, repitiendo las etiquetas de una misma pieza tantas
 * veces como personas la hayan marcado. Acá siempre es una sola persona, pero la
 * forma de dos consultas es la que sigue siendo correcta cuando el catálogo
 * crece.
 */
export async function fetchTasteSource(): Promise<TasteSource> {
  const { data: rows, error } = await supabase
    .from('interactions')
    .select('portfolio_item_id, verdict, is_saved, source')

  if (error != null) throw error

  const interactions: Interaction[] = (rows ?? []).map(
    (row: InteractionRow) => ({
      portfolioItemId: row.portfolio_item_id,
      verdict: row.verdict,
      isSaved: row.is_saved,
      source: row.source,
    }),
  )

  if (interactions.length === 0) return { interactions, pieces: new Map() }

  const { data: styleRows, error: styleError } = await supabase
    .from('portfolio_item_styles')
    .select('portfolio_item_id, weight, styles(slug)')
    .in(
      'portfolio_item_id',
      interactions.map((interaction) => interaction.portfolioItemId),
    )

  if (styleError != null) throw styleError

  const pieces = new Map<
    string,
    {
      portfolioItemId: string
      styles: Array<{ styleSlug: string; weight: number }>
    }
  >()
  for (const row of (styleRows ?? []) as unknown as PieceStyleRow[]) {
    const slug = row.styles?.slug
    if (slug == null) continue
    const entry = pieces.get(row.portfolio_item_id) ?? {
      portfolioItemId: row.portfolio_item_id,
      styles: [],
    }
    entry.styles.push({ styleSlug: slug, weight: Number(row.weight) })
    pieces.set(row.portfolio_item_id, entry)
  }

  return { interactions, pieces }
}

export interface PersistableTaste {
  readonly categoryId: string
  readonly scores: Readonly<Record<string, number>>
  readonly aversion: Readonly<Record<string, number>>
  readonly decisiveCount: number
  readonly isReady: boolean
  readonly algoVersion: string
}

/** Guarda el vector. Falla en silencio: es un caché, no la fuente de verdad. */
export async function persistTaste(
  userId: string,
  taste: PersistableTaste,
): Promise<void> {
  await supabase.from('taste_profiles').upsert(
    {
      user_id: userId,
      category_id: taste.categoryId,
      vector: taste.scores,
      aversion: taste.aversion,
      decisive_count: taste.decisiveCount,
      is_ready: taste.isReady,
      algo_version: taste.algoVersion,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,category_id' },
  )
}

export async function fetchCategoryId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  return data?.id ?? null
}

/**
 * Borra todas las interacciones de la persona y su vector.
 *
 * Es una acción destructiva y explícita, con confirmación en la pantalla. Existe
 * porque el gusto que MESH aprendió tiene que poder desaprenderse: un perfil que
 * no se puede borrar es un perfil que la persona no controla.
 */
export async function resetTaste(userId: string): Promise<void> {
  await supabase.from('interactions').delete().eq('user_id', userId)
  await supabase.from('taste_profiles').delete().eq('user_id', userId)
}
