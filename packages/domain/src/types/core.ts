/**
 * Tipos centrales del dominio.
 *
 * Estos reflejan el esquema de docs/architecture/data-model.md. Cuando llegue la
 * Fase 4 y se generen los tipos desde Postgres, una discrepancia entre aquellos
 * y estos es un bug en alguno de los dos — se resuelve en el momento, no
 * después. Ver .claude/workflows/database-change.md §5.
 *
 * Nada acá conoce la categoría "tattoo". Ver ADR-003.
 */

import type { CategorySlug } from '../taxonomy/taxonomy.ts'

export type Uuid = string

/** Valores del enum `interaction_verdict` de Postgres. */
export type InteractionVerdict = 'like' | 'pass'

/** Valores del enum `interaction_source` de Postgres. */
export type InteractionSource = 'discover' | 'search' | 'profile'

/** Valores del enum `availability_status` de Postgres. */
export type AvailabilityStatus = 'open' | 'limited' | 'waitlist' | 'closed'

/** Valores del enum `project_timing` de Postgres. */
export type ProjectTiming = 'asap' | 'weeks' | 'months' | 'flexible'

/** Valores del enum `project_status` de Postgres. */
export type ProjectStatus = 'draft' | 'active' | 'archived'

/**
 * Valores del enum `match_band` de Postgres.
 *
 * La UI muestra la banda, nunca el puntaje numérico: con una ciudad y una docena
 * de artistas, dos cifras significativas afirman una resolución que los datos no
 * sostienen. Ver ADR-005.
 */
export type MatchBand = 'strong' | 'good' | 'possible'

/** Un estilo con el peso que tiene sobre una pieza o un proyecto. */
export interface WeightedStyle {
  readonly styleSlug: string
  /** Los pesos de una misma pieza suman 1 ± 0,001. */
  readonly weight: number
}

/** Un estilo con la solvencia declarada del profesional. */
export interface StyleProficiency {
  readonly styleSlug: string
  /** En (0, 1]. Primario = 1,0; secundario ≈ 0,6. */
  readonly proficiency: number
  readonly isPrimary: boolean
}

export interface MoneyRange {
  readonly minCents: number
  readonly maxCents: number
  readonly currency: string
  /**
   * Cuándo declaró este rango el artista. Requerido si hay precio: en Argentina
   * un precio sin fecha no es información. Ver product-spec §14 Q5.
   */
  readonly pricedAt: string
}

export interface Availability {
  readonly status: AvailabilityStatus
  readonly updatedAt: string
}

export interface Location {
  readonly id: Uuid
  readonly slug: string
  readonly city: string
  readonly adminArea: string
  readonly countryCode: string
  /** Agrupa CABA con el Gran Buenos Aires para el componente de ubicación. */
  readonly metroKey: string
}

export interface Professional {
  readonly id: Uuid
  readonly slug: string
  readonly categorySlug: CategorySlug
  readonly displayName: string
  readonly bio: string | null
  readonly location: Location | null
  readonly travels: boolean
  readonly styles: readonly StyleProficiency[]
  readonly price: MoneyRange | null
  readonly availability: Availability | null
  readonly instagramHandle: string | null
  readonly whatsappE164: string | null
  readonly isFixture: boolean
}

export interface PortfolioItem {
  readonly id: Uuid
  readonly professionalId: Uuid
  readonly mediaId: Uuid
  readonly caption: string | null
  readonly year: number | null
  readonly isFeatured: boolean
  readonly styles: readonly WeightedStyle[]
  readonly isFixture: boolean
}

/**
 * Estado actual de una interacción, no un log de eventos.
 *
 * Una fila por (usuario, pieza). El gusto es una función pura de estas filas,
 * así que deshacer es un update o un delete y no depende del orden de
 * reproducción. Ver ADR-003.
 *
 * `isSaved: true` con `verdict: 'pass'` es un estado inválido, rechazado por una
 * restricción CHECK en la base.
 */
export interface Interaction {
  readonly portfolioItemId: Uuid
  readonly verdict: InteractionVerdict
  readonly isSaved: boolean
  readonly source: InteractionSource
}

/**
 * Vector de gusto de una persona en una categoría.
 *
 * `scores` y `aversion` van de slug de estilo a [0, 1). La aversión se usa en el
 * ranking pero NUNCA se muestra de vuelta: un paso es evidencia débil y
 * presentarla como un juicio sobre el gusto de alguien es incorrecto.
 */
export interface TasteProfile {
  readonly categorySlug: CategorySlug
  readonly scores: Readonly<Record<string, number>>
  readonly aversion: Readonly<Record<string, number>>
  readonly decisiveCount: number
  readonly isReady: boolean
  readonly algoVersion: string
}

export interface ProjectBrief {
  readonly id: Uuid
  readonly categorySlug: CategorySlug
  readonly title: string
  readonly description: string | null
  readonly styles: readonly WeightedStyle[]
  readonly location: Location | null
  readonly budget: Omit<MoneyRange, 'pricedAt'> | null
  readonly timing: ProjectTiming | null
  readonly status: ProjectStatus
}

/** Los componentes que aportaron a un puntaje, guardados para poder auditarlo. */
export interface MatchComponents {
  readonly style: number
  readonly location?: number
  readonly price?: number
  readonly availability?: number
}

/**
 * Una razón derivada de un componente que efectivamente aportó al puntaje.
 *
 * Las razones nunca se redactan: se derivan de componentes con aporte medido por
 * encima del umbral, desde un conjunto cerrado de plantillas. Una razón no puede
 * referenciar un componente omitido. Ver docs/product/matching.md §4.5.
 */
export interface MatchReason {
  readonly templateKey: string
  readonly styleSlugs: readonly string[]
  readonly contribution: number
}

export interface Match {
  readonly professionalId: Uuid
  readonly projectId: Uuid | null
  readonly score: number
  readonly band: MatchBand
  readonly components: MatchComponents
  readonly reasons: readonly MatchReason[]
  readonly matchingVersion: string
  readonly tasteVersion: string
}
