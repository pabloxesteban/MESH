/**
 * El único lugar donde los ajustes hablan con Supabase.
 *
 * La preferencia de analytics vivía adentro del componente, importando
 * `supabase` directo. Salió de ahí por la misma razón que en el resto de las
 * features: sin un `queries.ts` no hay nada que el preview web pueda
 * reemplazar, y el interruptor quedaba pidiéndole datos a un host inexistente.
 */

import { supabase } from '../../data/supabase.ts'

/** El default es `true`: se recolecta hasta que alguien diga que no. */
export async function fetchAnalyticsOptIn(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('analytics_opt_in')
    .eq('id', userId)
    .maybeSingle()
  return data?.analytics_opt_in ?? true
}

export async function updateAnalyticsOptIn(
  userId: string,
  next: boolean,
): Promise<void> {
  await supabase
    .from('profiles')
    .update({ analytics_opt_in: next })
    .eq('id', userId)
}
