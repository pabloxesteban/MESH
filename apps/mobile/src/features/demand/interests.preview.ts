/**
 * Versión de preview de `interests.ts`. Ver apps/mobile/preview/store.ts.
 *
 * En el preview hay un solo artista con dueño —el tuyo— así que esta lista se
 * llena cuando vos mismo tocás "me interesa" sobre una búsqueda que vos mismo
 * abriste. Suena raro y es exactamente lo que hace falta para recorrer el
 * circuito completo sin dos teléfonos.
 */

import {
  dismissPreviewInterest,
  previewSearchInterests,
} from '../../../preview/store.ts'

export interface SearchInterest {
  readonly interestId: string
  readonly projectId: string
  readonly projectTitle: string
  readonly professionalId: string
  readonly professionalSlug: string
  readonly professionalName: string
  readonly createdAt: string
  readonly priceMinCents: number
  readonly priceMaxCents: number
  readonly priceCurrency: string
  readonly sessions: number
  readonly note: string | null
  readonly sampleMediaPath: string | null
}

export async function fetchSearchInterests(
  projectId?: string,
): Promise<readonly SearchInterest[]> {
  return previewSearchInterests()
    .filter((entry) => projectId == null || entry.projectId === projectId)
    .map((entry) => ({
      interestId: entry.interestId,
      projectId: entry.projectId,
      projectTitle: entry.projectTitle,
      professionalId: `preview-${entry.professionalSlug}`,
      professionalSlug: entry.professionalSlug,
      professionalName: entry.professionalName,
      createdAt: entry.createdAt,
      priceMinCents: entry.priceMinCents,
      priceMaxCents: entry.priceMaxCents,
      priceCurrency: 'ARS',
      sessions: entry.sessions,
      note: entry.note,
      // El catálogo del preview no cuelga obra del perfil propio hasta que se
      // sube una, y la lista funciona igual sin ella.
      sampleMediaPath: null,
    }))
}

export async function dismissInterest(interestId: string): Promise<void> {
  dismissPreviewInterest(interestId)
}
