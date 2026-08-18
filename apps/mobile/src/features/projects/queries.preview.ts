/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * Solo implementa lo que el flujo de preview realmente ejercita: crear un
 * proyecto liviano desde "buscar por fotos" y volver a leerlo por id. No hay
 * lista de proyectos ni formulario completo en el preview — esa pantalla
 * necesitaría su propia versión si algún día se agrega.
 */

import type { WeightedStyle } from '@mesh/domain'

import { createPreviewProject, previewProject } from '../../../preview/store.ts'

export interface ProjectSummary {
  readonly id: string
  readonly title: string
  readonly description: string | null
  readonly status: 'draft' | 'active' | 'archived'
  readonly timing: null
  readonly budget: null
  readonly locationSlug: string | null
  readonly styles: readonly WeightedStyle[]
  readonly referenceCount: number
}

export interface ProjectDraft {
  readonly title: string
  readonly description?: string | undefined
  readonly styleSlugs: readonly string[]
  readonly budget?:
    { readonly minCents: number; readonly maxCents: number } | undefined
  readonly timing?: string | undefined
  readonly locationSlug?: string | undefined
}

function toWeightedStyles(slugs: readonly string[]): readonly WeightedStyle[] {
  if (slugs.length === 0) return []
  const weight = Number((1 / slugs.length).toFixed(3))
  return slugs.map((styleSlug) => ({ styleSlug, weight }))
}

export async function createProject(
  _userId: string,
  draft: ProjectDraft,
): Promise<string> {
  return createPreviewProject({
    title: draft.title,
    styleSlugs: draft.styleSlugs,
    ...(draft.locationSlug != null ? { locationSlug: draft.locationSlug } : {}),
  })
}

export async function fetchProject(id: string): Promise<ProjectSummary | null> {
  const project = previewProject(id)
  if (project == null) return null
  return {
    id: project.id,
    title: project.title,
    description: null,
    status: 'active',
    timing: null,
    budget: null,
    locationSlug: project.locationSlug,
    styles: toWeightedStyles(project.styleSlugs),
    referenceCount: 0,
  }
}

export async function attachReference(
  _projectId: string,
  _mediaId: string,
  _sortOrder: number,
): Promise<void> {
  // El preview no lista referencias en ningún lado todavía, así que no hay
  // nada que registrar más allá de que la subida (upload.preview.ts) ya dejó
  // la imagen accesible por su id.
}
