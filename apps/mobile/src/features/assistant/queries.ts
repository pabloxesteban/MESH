/**
 * El hilo del asistente, contra la base.
 *
 * Lo que NO está acá y es a propósito: no hay forma de escribir un turno del
 * asistente. La política de INSERT solo deja `role = 'person'`, así que ni
 * siquiera con este módulo modificado se podría fabricar una respuesta del bot
 * y mostrarla como si MESH la hubiera dicho — que es exactamente la manera de
 * romper las reglas 3, 4 y 5 de ADR-021. El turno del asistente lo escribe la
 * Edge Function; acá solo se lee.
 */

import { supabase } from '../../data/supabase.ts'

export type TurnRole = 'person' | 'assistant'

export interface AssistantTurn {
  readonly id: string
  readonly role: TurnRole
  readonly body: string
  readonly createdAt: string
}

/** Abre un hilo nuevo. Cada pedido arranca de cero: no hay memoria entre hilos. */
export async function startAssistantThread(
  userId: string,
  categorySlug = 'tattoo',
): Promise<string> {
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .maybeSingle()

  if (category == null) throw new Error('categoría desconocida')

  const { data, error } = await supabase
    .from('assistant_threads')
    .insert({ user_id: userId, category_id: category.id })
    .select('id')
    .single()

  if (error != null || data == null) {
    throw error ?? new Error('no se pudo abrir el hilo')
  }

  return data.id
}

export async function fetchAssistantTurns(
  threadId: string,
): Promise<readonly AssistantTurn[]> {
  const { data, error } = await supabase
    .from('assistant_turns')
    .select('id, role, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at')
  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as TurnRole,
    body: row.body,
    createdAt: row.created_at,
  }))
}

/**
 * Tira el hilo entero, con todo lo que se dijo adentro.
 *
 * Los turnos se van por cascade. Es lo mínimo que se le debe a alguien que
 * contó qué se quiere tatuar y por qué.
 */
export async function deleteAssistantThread(threadId: string): Promise<void> {
  const { error } = await supabase
    .from('assistant_threads')
    .delete()
    .eq('id', threadId)
  if (error != null) throw error
}

/** Cuelga del hilo la búsqueda que salió de él. Las dos puntas se verifican en la RPC. */
export async function attachThreadProject(
  threadId: string,
  projectId: string,
): Promise<void> {
  const { error } = await supabase.rpc('attach_thread_project', {
    p_thread_id: threadId,
    p_project_id: projectId,
  })
  if (error != null) throw error
}

/** Un pedido listo para mandar como primer mensaje. */
export interface OwnBrief {
  readonly projectId: string
  readonly title: string
  readonly summary: string
  readonly styleSlug: string | null
  readonly traitSlugs: readonly string[]
}

/**
 * El último pedido propio que tenga texto, para ofrecerlo al abrir un chat.
 *
 * Solo con `description`: una búsqueda por fotos no tiene un pedido en palabras,
 * y mandar su título —que es el nombre de un estilo— como primer mensaje sería
 * peor que no mandar nada.
 *
 * Devuelve `null` sin ruido cuando no hay ninguno. Es el caso normal la primera
 * vez, no un error.
 */
export async function fetchOwnBrief(userId: string): Promise<OwnBrief | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, title, description, project_styles(styles(slug)), project_traits(traits(slug))',
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .not('description', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error != null) throw error
  if (data == null || data.description == null) return null

  const estilos = (data.project_styles ?? []) as Array<{
    styles: { slug: string } | null
  }>
  const rasgos = (data.project_traits ?? []) as Array<{
    traits: { slug: string } | null
  }>

  return {
    projectId: data.id,
    title: data.title,
    summary: data.description,
    styleSlug: estilos[0]?.styles?.slug ?? null,
    traitSlugs: rasgos
      .map((row) => row.traits?.slug)
      .filter((slug): slug is string => slug != null),
  }
}
