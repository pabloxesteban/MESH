/**
 * Motor de gusto (`taste/1`).
 *
 * Una función pura de las interacciones actuales de una persona al vector que
 * describe su gusto. Sin ML, sin LLM, sin estado escondido: el mismo conjunto
 * de interacciones produce siempre el mismo vector, y cualquiera puede seguir
 * la cuenta a mano.
 *
 * Que sea pura es lo que hace que **deshacer sea trivial**: borrar la fila y
 * recalcular devuelve exactamente el vector anterior. Si esto fuera un
 * acumulador incremental, deshacer requeriría un evento compensatorio y el
 * resultado dependería del orden.
 *
 * Nada acá lee el reloj. Ver matching.md §3.6: V1 no aplica decaimiento
 * temporal, y no lo aplica a propósito.
 */

import type { Interaction, TasteProfile } from '../types/core.ts'
import type { CategorySlug } from '../taxonomy/taxonomy.ts'
import { TASTE_VERSION } from '../version.ts'
import {
  DISPLAY_MIN_SCORE,
  DISPLAY_MIN_SUPPORT,
  INTERACTION_VALUE,
  READY_MIN_INTERACTIONS,
  READY_MIN_SCORE,
  READY_MIN_STYLES,
  SATURATION_K,
} from './config.ts'

/** Las etiquetas de estilo de una pieza. Suman 1 por pieza. */
export interface PieceStyles {
  readonly portfolioItemId: string
  readonly styles: ReadonlyArray<{
    readonly styleSlug: string
    readonly weight: number
  }>
}

export interface TasteInput {
  readonly categorySlug: CategorySlug
  readonly interactions: readonly Interaction[]
  /** Etiquetas de las piezas con las que se interactuó, por id. */
  readonly pieces: ReadonlyMap<string, PieceStyles>
}

/** Un estilo con su puntaje y de dónde salió. Es lo que muestra la pantalla. */
export interface TasteEvidence {
  readonly styleSlug: string
  readonly score: number
  /** Cuántas interacciones aportaron. Es la "evidencia" de la vista de detalle. */
  readonly support: number
  readonly likes: number
  readonly saves: number
  readonly passes: number
}

export interface TasteResult extends TasteProfile {
  /** Estilos que se pueden mostrar, mejor primero. Ver matching.md §3.5. */
  readonly visible: readonly TasteEvidence[]
  /** Cuántas más faltan para el umbral. 0 cuando ya está listo. */
  readonly interactionsToReady: number
}

/** El valor de una interacción según su estado. */
export function valueOf(interaction: Interaction): number {
  if (interaction.verdict === 'pass') return INTERACTION_VALUE.pass
  return interaction.isSaved ? INTERACTION_VALUE.saved : INTERACTION_VALUE.like
}

/**
 * Saturación. `raw / (raw + K)`, asintótica a 1 sin llegar nunca.
 *
 * No se normaliza contra el estilo más fuerte a propósito: eso forzaría a algún
 * estilo a 1,0 incluso con tres interacciones, y 1,0 se lee como una certeza
 * que no tenemos. Esta forma es absoluta — dice "cuánta evidencia hay", no
 * "cuál es el más alto de los tuyos".
 */
export function saturate(raw: number): number {
  const positive = Math.max(0, raw)
  return positive / (positive + SATURATION_K)
}

export function computeTaste(input: TasteInput): TasteResult {
  const raw = new Map<string, number>()
  const evidence = new Map<
    string,
    { support: number; likes: number; saves: number; passes: number }
  >()

  let decisiveCount = 0

  for (const interaction of input.interactions) {
    const piece = input.pieces.get(interaction.portfolioItemId)
    // Una interacción sobre una pieza que no conocemos no se cuenta. Pasa si el
    // catálogo cambió debajo de una cola offline; contarla con estilos vacíos
    // inflaría `n` sin aportar señal, y `n` es la mitad del umbral de listo.
    if (piece == null) continue

    decisiveCount += 1
    const value = valueOf(interaction)

    for (const style of piece.styles) {
      raw.set(
        style.styleSlug,
        (raw.get(style.styleSlug) ?? 0) + value * style.weight,
      )

      const current = evidence.get(style.styleSlug) ?? {
        support: 0,
        likes: 0,
        saves: 0,
        passes: 0,
      }
      evidence.set(style.styleSlug, {
        support: current.support + 1,
        likes:
          current.likes +
          (interaction.verdict === 'like' && !interaction.isSaved ? 1 : 0),
        saves: current.saves + (interaction.isSaved ? 1 : 0),
        passes: current.passes + (interaction.verdict === 'pass' ? 1 : 0),
      })
    }
  }

  const scores: Record<string, number> = {}
  const aversion: Record<string, number> = {}

  for (const [styleSlug, value] of raw) {
    // Positivo y negativo se separan: un estilo no puede tener puntaje
    // negativo. La evidencia en contra vive en `aversion`, que el ranking usa
    // pero la pantalla NUNCA muestra — un paso es evidencia débil, y
    // presentarla como un juicio sobre el gusto de alguien es incorrecto.
    const positive = saturate(value)
    const negative = saturate(-value)
    if (positive > 0) scores[styleSlug] = positive
    if (negative > 0) aversion[styleSlug] = negative
  }

  const readyStyles = Object.values(scores).filter(
    (score) => score >= READY_MIN_SCORE,
  ).length

  // Dos condiciones y no una: doce interacciones repartidas parejo entre doce
  // estilos no son un gusto, son ruido.
  const isReady =
    decisiveCount >= READY_MIN_INTERACTIONS && readyStyles >= READY_MIN_STYLES

  const visible: TasteEvidence[] = Object.entries(scores)
    .filter(([styleSlug, score]) => {
      const support = evidence.get(styleSlug)?.support ?? 0
      return score >= DISPLAY_MIN_SCORE && support >= DISPLAY_MIN_SUPPORT
    })
    .map(([styleSlug, score]) => {
      const counts = evidence.get(styleSlug)
      return {
        styleSlug,
        score,
        support: counts?.support ?? 0,
        likes: counts?.likes ?? 0,
        saves: counts?.saves ?? 0,
        passes: counts?.passes ?? 0,
      }
    })
    // Desempate por slug: el orden tiene que ser estable entre corridas o la
    // pantalla de gusto se reordena sola con cada render.
    .sort((a, b) => b.score - a.score || a.styleSlug.localeCompare(b.styleSlug))

  return {
    categorySlug: input.categorySlug,
    scores,
    aversion,
    decisiveCount,
    isReady,
    algoVersion: TASTE_VERSION,
    visible,
    interactionsToReady: Math.max(0, READY_MIN_INTERACTIONS - decisiveCount),
  }
}

/** Los N estilos con mayor puntaje. Entrada del componente de estilo del match. */
export function topStyles(
  profile: Pick<TasteProfile, 'scores'>,
  limit: number,
): ReadonlyArray<readonly [string, number]> {
  return Object.entries(profile.scores)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
}
