/**
 * Búsqueda por fotos → un proyecto liviano → matches.
 *
 * No inventa un mecanismo nuevo: un proyecto ya es "estilos + ubicación
 * opcional + hasta N referencias", que es exactamente lo que esto necesita. Lo
 * único que cambia es cómo se llega — un toque (fotos) en vez de un
 * formulario con título, descripción, presupuesto y timing. El estilo lo
 * clasifica `classifyReferencePhoto()` (ver `classify.ts`), no lo elige la
 * persona a mano.
 *
 * El título se arma solo, a partir del estilo detectado — nunca texto libre,
 * y nunca inventado: es un slug real de la taxonomía, traducido, no una
 * descripción generada.
 *
 * Reusa la subida de referencias ya construida en `features/projects/upload.ts`
 * — misma limpieza de EXIF, mismo camino a `references` en storage.
 */

import { createProject, attachReference } from '../projects/queries.ts'
import { uploadReference } from '../projects/upload.ts'

export interface QuickSearchInput {
  readonly userId: string
  readonly title: string
  readonly styleSlugs: readonly string[]
  readonly locationSlug?: string | undefined
  /** URIs locales, ya elegidas del picker. Hasta MAX_PROJECT_REFERENCES. */
  readonly imageUris: readonly string[]
}

export interface QuickSearchResult {
  readonly projectId: string
  /** Cuántas de las fotos elegidas no se pudieron subir. 0 en el camino feliz. */
  readonly failedUploads: number
}

/**
 * Crea el proyecto y sube lo que se pueda.
 *
 * Una foto que falla no aborta la búsqueda entera: la persona ya tocó
 * "buscar", y con al menos un estilo elegido el matching corre igual sin
 * ninguna referencia. Perder una imagen de cuatro no tiene por qué perder el
 * resultado — se cuenta y se informa, no se esconde ni se reintenta en
 * silencio.
 */
export async function createQuickSearch(
  input: QuickSearchInput,
): Promise<QuickSearchResult> {
  const projectId = await createProject(input.userId, {
    title: input.title,
    styleSlugs: input.styleSlugs,
    ...(input.locationSlug != null ? { locationSlug: input.locationSlug } : {}),
  })

  let failedUploads = 0
  for (const [index, uri] of input.imageUris.entries()) {
    try {
      const { mediaId } = await uploadReference(input.userId, uri)
      await attachReference(projectId, mediaId, index)
    } catch {
      // Cualquier fallo en ESTA foto —subida o el insert de la fila que la
      // liga al proyecto— se cuenta y se sigue con la siguiente. El proyecto
      // ya existe con sus estilos: abortar la búsqueda entera porque una de
      // cuatro fotos falló sería peor que mostrar el resultado sin ella.
      failedUploads += 1
    }
  }

  return { projectId, failedUploads }
}
