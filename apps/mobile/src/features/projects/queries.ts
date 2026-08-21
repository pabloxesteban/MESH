/**
 * Proyectos: leer, crear, actualizar, borrar.
 *
 * Todo pasa por RLS con `auth.uid()`. El cliente nunca manda "dame los
 * proyectos del usuario X": manda "dame mis proyectos" y la base decide qué
 * significa eso.
 */

import type { ProjectStatus, ProjectTiming, WeightedStyle } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'

export interface ProjectSummary {
  readonly id: string
  readonly title: string
  readonly description: string | null
  readonly status: ProjectStatus
  readonly timing: ProjectTiming | null
  readonly budget: {
    readonly minCents: number
    readonly maxCents: number
    readonly currency: string
  } | null
  readonly locationSlug: string | null
  readonly styles: readonly WeightedStyle[]
  readonly referenceCount: number
  /**
   * Si los tatuadores lo pueden ver. Es lo primero que hay que poder leer de
   * un pedido: un pedido cerrado está guardado y no le llegó a nadie, y eso
   * hay que decirlo en vez de dejar a alguien esperando. Ver ADR-014.
   */
  readonly openToProfessionals: boolean
}

export interface ProjectDraft {
  readonly title: string
  readonly description?: string | undefined
  readonly styleSlugs: readonly string[]
  readonly budget?:
    { readonly minCents: number; readonly maxCents: number } | undefined
  readonly timing?: ProjectTiming | undefined
  readonly locationSlug?: string | undefined
  /**
   * Si los tatuadores pueden ver esta búsqueda. Apagado salvo que se pida.
   *
   * El default vive en la base (`is_open_to_professionals` arranca en `false`)
   * y se repite acá a propósito: un campo que decide si las fotos de alguien
   * las ve un desconocido no se deja en manos de que el cliente se acuerde de
   * mandarlo. Ver ADR-014.
   */
  readonly openToProfessionals?: boolean | undefined
}

const SELECT = `
  id, title, description, status, timing, is_open_to_professionals,
  budget_min_cents, budget_max_cents, budget_currency,
  locations ( slug ),
  project_styles ( weight, styles ( slug ) ),
  project_references ( media_id )
`

interface ProjectRow {
  id: string
  title: string
  description: string | null
  status: ProjectStatus
  timing: ProjectTiming | null
  is_open_to_professionals: boolean
  budget_min_cents: number | null
  budget_max_cents: number | null
  budget_currency: string | null
  locations: { slug: string } | null
  project_styles: Array<{ weight: number; styles: { slug: string } | null }>
  project_references: Array<{ media_id: string }>
}

export async function fetchProjects(): Promise<readonly ProjectSummary[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(SELECT)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (error != null) throw error
  return ((data ?? []) as unknown as ProjectRow[]).map(toSummary)
}

export async function fetchProject(id: string): Promise<ProjectSummary | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error != null) throw error
  return data == null ? null : toSummary(data as unknown as ProjectRow)
}

function toSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    timing: row.timing,
    budget:
      row.budget_min_cents == null
        ? null
        : {
            minCents: row.budget_min_cents,
            maxCents: row.budget_max_cents ?? row.budget_min_cents,
            currency: row.budget_currency ?? 'ARS',
          },
    locationSlug: row.locations?.slug ?? null,
    // Los pesos se guardan tal como los declaró la persona; el motor los
    // normaliza. Guardarlos ya normalizados perdería cuánto pesó cada uno
    // respecto de los otros si después se agrega o se saca uno.
    styles: row.project_styles
      .filter((style) => style.styles != null)
      .map((style) => ({
        styleSlug: String(style.styles?.slug),
        weight: Number(style.weight),
      })),
    referenceCount: row.project_references.length,
    openToProfessionals: row.is_open_to_professionals,
  }
}

/**
 * Crea un proyecto y sus estilos.
 *
 * `user_id` se manda explícito aunque RLS lo verifique: la política usa
 * `with check (user_id = auth.uid())`, así que mandar otro id no crea nada — el
 * insert es rechazado, no reasignado.
 */
export async function createProject(
  userId: string,
  draft: ProjectDraft,
  categorySlug = 'tattoo',
): Promise<string> {
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .maybeSingle()

  if (category == null) throw new Error('categoría desconocida')

  let locationId: string | null = null
  if (draft.locationSlug != null) {
    const { data } = await supabase
      .from('locations')
      .select('id')
      .eq('slug', draft.locationSlug)
      .maybeSingle()
    locationId = data?.id ?? null
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      category_id: category.id,
      title: draft.title.trim(),
      // Un campo vacío se guarda como NULL, no como "". La base distingue
      // "no lo escribió" de "escribió nada", y la pantalla también.
      description: emptyToNull(draft.description),
      location_id: locationId,
      budget_min_cents: draft.budget?.minCents ?? null,
      budget_max_cents: draft.budget?.maxCents ?? null,
      budget_currency: draft.budget != null ? 'ARS' : null,
      timing: draft.timing ?? null,
      is_open_to_professionals: draft.openToProfessionals ?? false,
      status: 'active',
    })
    .select('id')
    .single()

  if (error != null || data == null) {
    throw error ?? new Error('no se pudo crear el proyecto')
  }

  await replaceProjectStyles(data.id, draft.styleSlugs)
  return data.id
}

export async function replaceProjectStyles(
  projectId: string,
  styleSlugs: readonly string[],
): Promise<void> {
  await supabase.from('project_styles').delete().eq('project_id', projectId)
  if (styleSlugs.length === 0) return

  const { data: styles } = await supabase
    .from('styles')
    .select('id, slug')
    .in('slug', [...styleSlugs])

  const rows = (styles ?? []).map((style) => ({
    project_id: projectId,
    style_id: style.id,
    // Peso parejo: la persona eligió estilos, no proporciones. Pedirle que
    // gradúe cuánto de cada uno sería pedirle precisión que no tiene.
    weight: Number((1 / (styles ?? []).length).toFixed(3)),
  }))

  if (rows.length > 0) await supabase.from('project_styles').insert(rows)
}

export async function attachReference(
  projectId: string,
  mediaId: string,
  sortOrder: number,
): Promise<void> {
  const { error } = await supabase
    .from('project_references')
    .insert({ project_id: projectId, media_id: mediaId, sort_order: sortOrder })
  if (error != null) throw error
}

/**
 * Abrir o cerrar el pedido a los tatuadores, después de haberlo publicado.
 *
 * Existe porque la decisión se toma una vez, al confirmar, y hasta acá no
 * había forma de cambiarla: quien elegía que no lo viera nadie se quedaba con
 * un pedido guardado y sin vuelta atrás. Una decisión que no se puede
 * revisar deja de ser una decisión.
 *
 * No hace falta política nueva: `projects_update_own` ya guarda `using` y
 * `with check` por `auth.uid()`, así que esto no puede tocar el pedido de
 * otro.
 */
export async function setProjectOpen(
  id: string,
  open: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ is_open_to_professionals: open })
    .eq('id', id)
  if (error != null) throw error
}

/** Archivar, no borrar. Archivar libera cuota y conserva lo que se escribió. */
export async function archiveProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', id)
  if (error != null) throw error
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length === 0 ? null : trimmed
}
