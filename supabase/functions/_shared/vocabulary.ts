// El vocabulario cerrado que las dos funciones de IA comparten.
//
// Vive acá y no duplicado porque `resolveSlug` es una **barrera de seguridad**,
// no una utilidad: es la que garantiza que nada que el modelo haya inventado
// salga de una Edge Function. Dos copias de una barrera es una barrera que
// algún día se arregla en un solo lado.
//
// Ver ADR-011 (clasificar la foto) y ADR-021 (el asistente).

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface Vocabulary {
  /** Los slugs de estilo activos de la categoría. */
  readonly styleSlugs: readonly string[]
  /** Cómo se llama cada estilo también, para que el modelo lo reconozca escrito. */
  readonly styleList: string
  /** Los slugs de rasgo activos, agrupados por dimensión de `trait_dimension`. */
  readonly traitsByDimension: Readonly<Record<string, readonly string[]>>
}

/**
 * Trae el vocabulario de una categoría **con el cliente de quien llama**.
 *
 * Con su JWT y no con la service key: las políticas de `styles`, `categories` y
 * `traits` ya son de lectura pública para lo activo, así que alcanzan — y así
 * ninguna de estas funciones tiene más acceso a la base que la propia persona.
 */
export async function fetchVocabulary(
  supabase: SupabaseClient,
  categorySlug: string,
): Promise<Vocabulary | null> {
  const { data: styles, error } = await supabase
    .from('styles')
    .select('slug, aliases, categories!inner(slug, is_active)')
    .eq('categories.slug', categorySlug)
    .eq('categories.is_active', true)
    .eq('is_active', true)

  if (error != null || styles == null || styles.length === 0) return null

  const { data: traits } = await supabase
    .from('traits')
    .select('slug, dimension, categories!inner(slug, is_active)')
    .eq('categories.slug', categorySlug)
    .eq('categories.is_active', true)
    .eq('is_active', true)
    .order('sort_order')

  const traitsByDimension: Record<string, string[]> = {}
  for (const row of traits ?? []) {
    const dimension = String(row.dimension)
    ;(traitsByDimension[dimension] ??= []).push(String(row.slug))
  }

  return {
    styleSlugs: styles.map((row) => String(row.slug)),
    styleList: styles
      .map((row) => {
        const aliases = (row.aliases as string[] | null) ?? []
        return aliases.length > 0
          ? `${String(row.slug)} (también: ${aliases.join(', ')})`
          : String(row.slug)
      })
      .join('\n'),
    traitsByDimension,
  }
}

/**
 * Valida que un slug que devolvió el modelo sea uno de los que le ofrecimos.
 *
 * Es la segunda barrera después del `tool_choice` forzado — si algo raro pasa
 * (una versión de API distinta, un cambio de comportamiento del modelo), esto
 * nunca deja pasar un término inventado.
 */
export function resolveSlug(
  raw: unknown,
  knownSlugs: readonly string[],
): string | null {
  if (typeof raw !== 'string') return null
  return knownSlugs.includes(raw) ? raw : null
}

/**
 * Los rasgos que el modelo eligió, dimensión por dimensión, ya validados.
 *
 * Lo que no está en la lista que entró, no sale.
 */
export function resolveTraits(
  input: Record<string, unknown>,
  traitsByDimension: Readonly<Record<string, readonly string[]>>,
): Array<{ dimension: string; slug: string }> {
  const resolved: Array<{ dimension: string; slug: string }> = []
  for (const [dimension, slugs] of Object.entries(traitsByDimension)) {
    const slug = resolveSlug(input[dimension], slugs)
    if (slug != null) resolved.push({ dimension, slug })
  }
  return resolved
}
