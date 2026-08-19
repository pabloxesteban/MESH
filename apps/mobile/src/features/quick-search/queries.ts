/**
 * Una foto real por estilo, para el selector visual.
 *
 * Un solo round trip: `get_style_examples` hace la selección determinística
 * en la base (mayor peso declarado, entre lo publicado). Acá no se elige
 * nada — solo se lee.
 */

import { supabase } from '../../data/supabase.ts'

export interface StyleExample {
  readonly styleSlug: string
  readonly mediaPath: string
}

export async function fetchStyleExamples(
  categorySlug: string,
): Promise<readonly StyleExample[]> {
  const { data, error } = await supabase.rpc('get_style_examples', {
    p_category_slug: categorySlug,
  })

  if (error != null) throw error

  return (data ?? []).map((row) => ({
    styleSlug: String(row.style_slug),
    mediaPath: String(row.media_path),
  }))
}
