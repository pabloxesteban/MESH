/**
 * Motor de match (`match/1`).
 *
 * Determinístico, versionado y explicable. Nada de ML, nada de LLM: el puntaje
 * es una suma ponderada de cuatro componentes y cualquiera puede rehacerlo a
 * mano con los números que quedan guardados en la fila.
 *
 * Las dos reglas que definen el carácter de este archivo:
 *
 * 1. **Los componentes omitidos no puntúan cero: se eliminan y los pesos se
 *    renormalizan.** Un dato faltante nunca puede parecer una mala respuesta.
 *    Un artista que no publicó precio no es un peor match, simplemente sabemos
 *    menos de él.
 * 2. **Las razones se derivan, no se redactan.** Una razón solo puede existir
 *    si el componente que la respalda efectivamente aportó al puntaje, por
 *    encima de un umbral. No hay fallback de "buena onda general".
 *
 * Nada acá lee el reloj: la fecha entra por parámetro. Ver la nota sobre
 * disponibilidad vieja.
 */

import type {
  Match,
  MatchBand,
  MatchComponents,
  MatchReason,
  Professional,
  TasteProfile,
} from '../types/core.ts'
import { isSameMetro } from '../taxonomy/locations.ts'
import { MATCHING_VERSION, TASTE_VERSION } from '../version.ts'
import { topStyles } from '../taste/taste.ts'
import {
  AMBIENT_TASTE_WEIGHT,
  AVAILABILITY_STALE_DAYS,
  AVAILABILITY_VALUE,
  AVERSION_FACTOR,
  BAND_GOOD,
  BAND_STRONG,
  COMPONENT_WEIGHTS,
  LOCATION_VALUE,
  MAX_REASONS,
  PROJECT_WEIGHT,
  REASON_MIN_CONTRIBUTION,
  REASON_STYLE_MIN_SCORE,
  SCORE_FLOOR,
  TOP_STYLES,
  type ComponentName,
} from './config.ts'

export interface MatchContext {
  /** Vector de gusto. Puede estar vacío si el match es solo por proyecto. */
  readonly taste: Pick<TasteProfile, 'scores' | 'aversion'>
  /** Slug de ubicación del usuario o del proyecto. Ausente → componente omitido. */
  readonly locationSlug?: string | undefined
  /** Presupuesto declarado. Ausente → componente omitido. */
  readonly budget?:
    { readonly minCents: number; readonly maxCents: number } | undefined
  /**
   * Fecha de hoy, ISO (AAAA-MM-DD).
   *
   * Entra por parámetro y no se lee del reloj a propósito: `packages/domain`
   * tiene prohibido `new Date()` por lint, y un motor que depende del reloj no
   * se puede testear ni reproducir. Ver ADR-008.
   */
  readonly today: string
  /**
   * Si es `false`, el componente de ubicación se omite aunque haya datos.
   *
   * En V1 todos los artistas están en CABA, así que ubicación es constante y no
   * discrimina. Ver matching.md §4.2.
   */
  readonly locationDiscriminates?: boolean
}

export interface Candidate {
  readonly professional: Professional
}

export interface ScoredMatch extends Match {
  /** Cuántos estilos del top del usuario cubre. Segunda clave de orden. */
  readonly overlappingStyles: number
}

// --- componentes -------------------------------------------------------------

/** `undefined` significa OMITIDO, que no es lo mismo que 0. */
type ComponentValue = number | undefined

/**
 * Estilo. El componente dominante.
 *
 * `style_raw` se lee directo: del gusto que esta persona demostró, qué fracción
 * cubre este artista.
 */
export function styleComponent(
  taste: Pick<TasteProfile, 'scores' | 'aversion'>,
  professional: Professional,
): {
  value: ComponentValue
  overlapping: number
  topContributor: string | null
} {
  const top = topStyles({ scores: taste.scores }, TOP_STYLES)
  if (top.length === 0) {
    return { value: undefined, overlapping: 0, topContributor: null }
  }

  const proficiency = new Map(
    professional.styles.map((style) => [style.styleSlug, style.proficiency]),
  )

  let numerator = 0
  let denominator = 0
  let overlapping = 0
  let bestContribution = 0
  let topContributor: string | null = null

  for (const [slug, score] of top) {
    denominator += score
    const p = proficiency.get(slug) ?? 0
    if (p > 0) overlapping += 1
    const contribution = score * p
    numerator += contribution
    if (contribution > bestContribution) {
      bestContribution = contribution
      topContributor = slug
    }
  }

  const styleRaw = denominator === 0 ? 0 : numerator / denominator

  let aversionNumerator = 0
  let aversionDenominator = 0
  for (const [slug, score] of Object.entries(taste.aversion)) {
    aversionDenominator += score
    aversionNumerator += score * (proficiency.get(slug) ?? 0)
  }
  const aversion =
    aversionDenominator === 0 ? 0 : aversionNumerator / aversionDenominator

  const value = clamp01(styleRaw - AVERSION_FACTOR * aversion)
  return { value, overlapping, topContributor }
}

export function locationComponent(
  context: MatchContext,
  professional: Professional,
): ComponentValue {
  if (context.locationDiscriminates === false) return undefined
  if (context.locationSlug == null) return undefined

  const artistLocation = professional.location?.slug
  if (artistLocation == null) return undefined

  if (artistLocation === context.locationSlug) return LOCATION_VALUE.sameCity
  if (isSameMetro(artistLocation, context.locationSlug))
    return LOCATION_VALUE.sameMetro
  return professional.travels
    ? LOCATION_VALUE.travels
    : LOCATION_VALUE.elsewhere
}

/**
 * Precio: qué fracción de la banda de presupuesto cubre el rango del artista.
 *
 * Se mide contra la banda del PRESUPUESTO y no contra el rango del artista: lo
 * que importa es cuánto de lo que la persona puede gastar queda cubierto, no
 * cuánto del catálogo del artista entra.
 */
export function priceComponent(
  context: MatchContext,
  professional: Professional,
): ComponentValue {
  const budget = context.budget
  const price = professional.price
  if (budget == null || price == null) return undefined

  const span = budget.maxCents - budget.minCents
  const overlap =
    Math.min(budget.maxCents, price.maxCents) -
    Math.max(budget.minCents, price.minCents)

  if (overlap < 0) return 0

  // Presupuesto puntual (min = max): o el precio lo contiene o no.
  if (span === 0) return overlap >= 0 ? 1 : 0

  return clamp01(overlap / span)
}

export function availabilityComponent(
  context: MatchContext,
  professional: Professional,
): ComponentValue {
  const availability = professional.availability
  if (availability == null) return undefined

  const age = daysBetween(availability.updatedAt, context.today)
  // Vieja = desconocida, y desconocida se OMITE. Un artista con disponibilidad
  // de hace tres meses no debería puntuar peor que uno que nunca la declaró:
  // de los dos sabemos lo mismo, que es nada.
  if (age == null || age > AVAILABILITY_STALE_DAYS) return undefined

  return AVAILABILITY_VALUE[availability.status]
}

// --- puntaje -----------------------------------------------------------------

export interface ScoreBreakdown {
  readonly score: number
  readonly components: MatchComponents
  /** Aporte de cada componente al puntaje final, ya renormalizado. */
  readonly contributions: Readonly<Partial<Record<ComponentName, number>>>
  readonly overlappingStyles: number
  readonly topStyle: string | null
}

export function scoreProfessional(
  context: MatchContext,
  professional: Professional,
): ScoreBreakdown {
  const style = styleComponent(context.taste, professional)

  const values: Partial<Record<ComponentName, number>> = {}
  if (style.value != null) values.style = style.value

  const location = locationComponent(context, professional)
  if (location != null) values.location = location

  const price = priceComponent(context, professional)
  if (price != null) values.price = price

  const availability = availabilityComponent(context, professional)
  if (availability != null) values.availability = availability

  // Renormalización: la suma de pesos es sobre lo que se CONOCE, no sobre los
  // cuatro. Sin esto, un artista sin precio publicado arrastraría un 0 × 0,10 y
  // "no sabemos" se leería como "mal".
  let weightSum = 0
  for (const name of Object.keys(values) as ComponentName[]) {
    weightSum += COMPONENT_WEIGHTS[name]
  }

  const contributions: Partial<Record<ComponentName, number>> = {}
  let score = 0
  if (weightSum > 0) {
    for (const name of Object.keys(values) as ComponentName[]) {
      const contribution =
        (COMPONENT_WEIGHTS[name] * (values[name] ?? 0)) / weightSum
      contributions[name] = contribution
      score += contribution
    }
  }

  return {
    score: clamp01(score),
    components: values as MatchComponents,
    contributions,
    overlappingStyles: style.overlapping,
    topStyle: style.topContributor,
  }
}

export function bandFor(score: number): MatchBand {
  if (score >= BAND_STRONG) return 'strong'
  if (score >= BAND_GOOD) return 'good'
  return 'possible'
}

// --- razones -----------------------------------------------------------------

/**
 * Deriva las razones.
 *
 * Conjunto cerrado de plantillas, ordenadas por aporte, como mucho tres, y solo
 * para componentes que superen el umbral. Ninguna razón puede referirse a un
 * componente omitido, porque las razones se arman recorriendo `contributions`,
 * que solo contiene los conocidos.
 */
export function deriveReasons(
  context: MatchContext,
  professional: Professional,
  breakdown: ScoreBreakdown,
): readonly MatchReason[] {
  const reasons: MatchReason[] = []
  const entries = Object.entries(breakdown.contributions) as Array<
    [ComponentName, number]
  >

  for (const [component, contribution] of entries.sort((a, b) => b[1] - a[1])) {
    if (contribution < REASON_MIN_CONTRIBUTION) continue

    const reason = reasonFor(
      component,
      contribution,
      context,
      professional,
      breakdown,
    )
    if (reason != null) reasons.push(reason)
    if (reasons.length === MAX_REASONS) break
  }

  return reasons
}

function reasonFor(
  component: ComponentName,
  contribution: number,
  context: MatchContext,
  professional: Professional,
  breakdown: ScoreBreakdown,
): MatchReason | null {
  switch (component) {
    case 'style': {
      const slug = breakdown.topStyle
      if (slug == null) return null
      const score = context.taste.scores[slug] ?? 0

      // Los estilos primarios del artista que además están en el top del
      // usuario. Si hay dos o más, la razón habla del artista; si no, habla de
      // lo que la persona marcó.
      const primaries = professional.styles
        .filter(
          (style) =>
            style.isPrimary && (context.taste.scores[style.styleSlug] ?? 0) > 0,
        )
        .map((style) => style.styleSlug)
        .sort()

      if (primaries.length >= 2) {
        return {
          component: 'style',
          templateKey: 'match.reason.worksBoth',
          terms: primaries.slice(0, 2),
          contribution,
        }
      }

      if (score < REASON_STYLE_MIN_SCORE) return null

      // De dónde salió el estilo cambia la frase. No es adorno: "guardaste" es
      // una afirmación más fuerte y solo se puede hacer si es cierta.
      return {
        component: 'style',
        templateKey: 'match.reason.markedStyle',
        terms: [slug],
        contribution,
      }
    }

    case 'location': {
      const city = professional.location?.city
      if (city == null) return null
      return {
        component: 'location',
        templateKey: 'match.reason.location',
        terms: [city],
        contribution,
      }
    }

    case 'price':
      // Solo si efectivamente solapa. Un solapamiento de cero no es una razón.
      if ((breakdown.components.price ?? 0) <= 0) return null
      return {
        component: 'price',
        templateKey: 'match.reason.price',
        terms: [],
        contribution,
      }

    case 'availability':
      // Solo `open`. "Está tomando turnos" es falso para waitlist y closed.
      if (professional.availability?.status !== 'open') return null
      return {
        component: 'availability',
        templateKey: 'match.reason.availability',
        terms: [],
        contribution,
      }
  }
}

// --- API ---------------------------------------------------------------------

export interface MatchOptions {
  readonly projectId?: string | null
}

/**
 * Puntúa, filtra y ordena.
 *
 * Los candidatos por debajo del piso NO se devuelven, aunque eso deje la lista
 * corta o vacía. Una lista corta y honesta le gana a una rellenada.
 *
 * Un candidato sin ninguna razón por encima del umbral tampoco se devuelve: si
 * no podemos decir por qué, no lo recomendamos.
 */
export function matchProfessionals(
  context: MatchContext,
  professionals: readonly Professional[],
  options: MatchOptions = {},
): readonly ScoredMatch[] {
  const matches: ScoredMatch[] = []

  for (const professional of professionals) {
    const breakdown = scoreProfessional(context, professional)
    if (breakdown.score < SCORE_FLOOR) continue

    const reasons = deriveReasons(context, professional, breakdown)
    if (reasons.length === 0) continue

    matches.push({
      professionalId: professional.id,
      projectId: options.projectId ?? null,
      score: breakdown.score,
      band: bandFor(breakdown.score),
      components: breakdown.components,
      reasons,
      matchingVersion: MATCHING_VERSION,
      tasteVersion: TASTE_VERSION,
      overlappingStyles: breakdown.overlappingStyles,
    })
  }

  // Puntaje, después solapamiento, después id. La última clave es arbitraria
  // pero estable: sin ella, dos corridas con el catálogo en otro orden podrían
  // devolver listas distintas y los tests E2E serían intermitentes.
  return matches.sort(
    (a, b) =>
      b.score - a.score ||
      b.overlappingStyles - a.overlappingStyles ||
      a.professionalId.localeCompare(b.professionalId),
  )
}

/**
 * Mezcla los estilos declarados de un proyecto con el gusto ambiente.
 *
 * El brief domina —la persona nos dijo qué quiere— pero el gusto sigue rompiendo
 * empates entre artistas que todos hacen lo mismo. Sin gusto, `t' = proyecto` y
 * el match corre igual: alguien que llega con una idea clara no necesita
 * deslizar primero.
 */
export function blendProjectStyles(
  projectStyles: ReadonlyArray<{
    readonly styleSlug: string
    readonly weight: number
  }>,
  taste: Pick<TasteProfile, 'scores'>,
): Readonly<Record<string, number>> {
  const total = projectStyles.reduce((sum, style) => sum + style.weight, 0)
  const blended: Record<string, number> = {}

  for (const style of projectStyles) {
    const normalized = total === 0 ? 0 : style.weight / total
    blended[style.styleSlug] = PROJECT_WEIGHT * normalized
  }

  for (const [slug, score] of Object.entries(taste.scores)) {
    blended[slug] = (blended[slug] ?? 0) + AMBIENT_TASTE_WEIGHT * score
  }

  return blended
}

// --- utilidades --------------------------------------------------------------

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Días entre dos fechas ISO. `null` si alguna no parsea.
 *
 * Aritmética sobre los componentes de la fecha, sin `Date`: `packages/domain`
 * tiene prohibido `new Date()` por lint, y además el parseo de zonas horarias
 * haría que el resultado dependa de dónde corre el código.
 */
export function daysBetween(from: string, to: string): number | null {
  const a = toDayNumber(from)
  const b = toDayNumber(to)
  if (a == null || b == null) return null
  return b - a
}

/** Días desde una época arbitraria, por el algoritmo civil de Howard Hinnant. */
function toDayNumber(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (match == null) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yoe = y - era * 400
  const doy =
    Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}
