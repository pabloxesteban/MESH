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

import {
  previewProfessionalId,
  previewOwnProfile,
} from '../../../preview/store.ts'

import type { Proposal, Trait } from './queries.ts'

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

const propuestas = new Map<string, Proposal[]>()
let contador = 0

export async function fetchProposals(
  projectId: string,
): Promise<readonly Proposal[]> {
  return propuestas.get(projectId) ?? []
}

export async function sendProposal(input: {
  projectId: string
  professionalId: string
  priceMinCents: number
  priceMaxCents: number
  sessions: number
  note: string | null
}): Promise<void> {
  const own = previewOwnProfile()
  contador += 1

  const lista = propuestas.get(input.projectId) ?? []
  lista.unshift({
    interestId: `preview-proposal-${String(contador)}`,
    professionalId: input.professionalId,
    professionalSlug: own?.slug ?? 'artista',
    professionalName: own?.displayName ?? 'Artista',
    isFixture: own?.isFixture ?? false,
    priceMinCents: input.priceMinCents,
    priceMaxCents: input.priceMaxCents,
    priceCurrency: 'ARS',
    sessions: input.sessions,
    note: input.note,
    // Un contador y no un reloj: dos corridas del preview tienen que dar el
    // mismo orden.
    createdAt: `2026-08-20T00:00:${String(contador).padStart(2, '0')}Z`,
    sampleMediaPath: null,
  })
  propuestas.set(input.projectId, lista)

  // Se usa para que el id del profesional no quede sin referenciar: en el
  // preview hay un solo perfil con dueño y es el que responde.
  void previewProfessionalId(own?.slug ?? 'artista')
}
