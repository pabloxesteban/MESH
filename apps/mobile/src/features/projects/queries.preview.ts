/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * Solo implementa lo que el flujo de preview realmente ejercita: crear un
 * proyecto liviano desde "buscar por fotos" y volver a leerlo por id. No hay
 * lista de proyectos ni formulario completo en el preview — esa pantalla
 * necesitaría su propia versión si algún día se agrega.
 */

import type { WeightedStyle } from '@mesh/domain'

import {
  attachPreviewSearchReference,
  createPreviewProject,
  nextPreviewTimestamp,
  openPreviewSearch,
  previewProject,
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
    styleSlugs: draft.styleSlugs,
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
