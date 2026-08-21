/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * Implementa lo que el flujo de preview ejercita: crear un pedido liviano
 * desde "buscar por fotos" o desde el asistente, leerlo, listarlo para Inicio,
 * y abrirlo o cerrarlo a los tatuadores.
 *
 * Lo que el preview NO prueba es lo único que importa de esa última parte: que
 * un pedido cerrado no lo vea nadie. Eso lo decide RLS, y está en
 * supabase/tests/46_open_searches.sql.
 */

import type { WeightedStyle } from '@mesh/domain'

import {
  attachPreviewSearchReference,
  createPreviewProject,
  nextPreviewTimestamp,
  openPreviewSearch,
  previewProject,
  previewProjectList,
  setPreviewProjectOpen,
} from '../../../preview/store.ts'

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
  readonly openToProfessionals: boolean
}

export interface ProjectDraft {
  readonly title: string
  readonly description?: string | undefined
  readonly styleSlugs: readonly string[]
  readonly budget?:
    { readonly minCents: number; readonly maxCents: number } | undefined
  readonly timing?: string | undefined
  readonly locationSlug?: string | undefined
  readonly openToProfessionals?: boolean | undefined
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
  const projectId = createPreviewProject({
    title: draft.title,
    ...(draft.description != null ? { description: draft.description } : {}),
    styleSlugs: draft.styleSlugs,
    openToProfessionals: draft.openToProfessionals ?? false,
    ...(draft.locationSlug != null ? { locationSlug: draft.locationSlug } : {}),
  })

  // Solo si la persona lo pidió. El default apagado se respeta acá igual que
  // en la base: el preview no puede ser más permisivo que el producto, porque
  // entonces demuestra otra cosa. Ver ADR-014.
  if (draft.openToProfessionals === true) {
    openPreviewSearch({
      projectId,
      title: draft.title,
      styleSlugs: draft.styleSlugs,
      locationSlug: draft.locationSlug ?? null,
      // Las referencias se adjuntan después, con `attachReference`.
      referenceIds: [],
      createdAt: nextPreviewTimestamp(),
    })
  }

  return projectId
}

function toSummary(project: {
  id: string
  title: string
  description: string | null
  styleSlugs: readonly string[]
  locationSlug: string | null
  openToProfessionals: boolean
}): ProjectSummary {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: 'active',
    timing: null,
    budget: null,
    locationSlug: project.locationSlug,
    styles: toWeightedStyles(project.styleSlugs),
    referenceCount: 0,
    openToProfessionals: project.openToProfessionals,
  }
}

export async function fetchProject(id: string): Promise<ProjectSummary | null> {
  const project = previewProject(id)
  return project == null ? null : toSummary(project)
}

/** Los pedidos propios. Es lo que Inicio lee para saber en qué anda. */
export async function fetchProjects(): Promise<readonly ProjectSummary[]> {
  return previewProjectList().map(toSummary)
}

export async function setProjectOpen(
  id: string,
  open: boolean,
): Promise<void> {
  setPreviewProjectOpen(id, open)
}

export async function attachReference(
  projectId: string,
  mediaId: string,
  _sortOrder: number,
): Promise<void> {
  // Si la búsqueda está abierta, la foto es lo que ve el tatuador en su mazo.
  // `upload.preview.ts` ya dejó la imagen accesible por su id, así que alcanza
  // con anotarla. Si la búsqueda está cerrada esto no hace nada, que es lo
  // correcto: no existe para nadie más.
  attachPreviewSearchReference(projectId, mediaId)
}
