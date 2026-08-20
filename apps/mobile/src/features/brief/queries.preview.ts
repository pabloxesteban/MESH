/**
 * El brief en el preview: el vocabulario real, en memoria y sin red.
 *
 * Los rasgos salen de `TRAITS` de `packages/domain` — la misma constante de la
 * que se genera `seed.sql`. Así el preview ofrece exactamente los mismos chips
 * que la app, sin inventar una lista paralela que se desactualice.
 *
 * Las propuestas arrancan vacías, igual que las reseñas: el estado vacío es la
 * mitad que hay que poder mirar.
 */

import { TRAITS } from '@mesh/domain'

import { decidePreviewSearch } from '../../../preview/store.ts'

import type { Trait } from './queries.ts'

/** El id sintético de un rasgo. Estable, porque sale del slug. */
function traitId(slug: string): string {
  return `preview-trait-${slug}`
}

export async function fetchTraits(
  categorySlug = 'tattoo',
): Promise<readonly Trait[]> {
  return TRAITS.filter(
    (trait) => trait.categorySlug === categorySlug && trait.isActive,
  ).map((trait) => ({
    id: traitId(trait.slug),
    slug: trait.slug,
    dimension: trait.dimension,
    nameKey: trait.nameKey,
  }))
}

const rasgosPorBusqueda = new Map<string, string[]>()

export async function fetchProjectTraits(
  projectId: string,
): Promise<readonly string[]> {
  return rasgosPorBusqueda.get(projectId) ?? []
}

export async function setProjectTraits(
  projectId: string,
  traitIds: readonly string[],
): Promise<void> {
  rasgosPorBusqueda.set(
    projectId,
    traitIds.map((id) => id.replace('preview-trait-', '')),
  )
}

export async function fetchOpenSearchTraits(
  projectId: string,
): Promise<readonly { dimension: Trait['dimension']; slug: string }[]> {
  const slugs = rasgosPorBusqueda.get(projectId) ?? []
  return TRAITS.filter((trait) => slugs.includes(trait.slug)).map((trait) => ({
    dimension: trait.dimension,
    slug: trait.slug,
  }))
}

/**
 * El artista responde con una propuesta.
 *
 * Se guarda en el store junto con la decisión, y no en un Map aparte: la lista
 * que la persona mira sale de `previewSearchInterests()`, así que una propuesta
 * guardada en otro lado no llegaría nunca a la pantalla — que es justo el
 * circuito que el preview existe para poder recorrer.
 */
export async function sendProposal(input: {
  projectId: string
  professionalId: string
  priceMinCents: number
  priceMaxCents: number
  sessions: number
  note: string | null
}): Promise<void> {
  decidePreviewSearch(input.projectId, 'interest', {
    priceMinCents: input.priceMinCents,
    priceMaxCents: input.priceMaxCents,
    sessions: input.sessions,
    note: input.note,
  })
}
