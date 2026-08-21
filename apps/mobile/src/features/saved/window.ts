/**
 * Desde cuándo cuenta una ventana del ranking.
 *
 * Archivo propio y no `ranking.ts` por la misma razón mecánica que
 * `scheduling/errors.ts`: `ranking.ts` está en `PREVIEW_TARGETS`, así que
 * reexportar desde ahí adentro del archivo de preview es reexportar desde uno
 * mismo. Ver `preview-swap.test.ts`.
 */

import type { RankingWindow } from './ranking.ts'

const DIAS: Record<RankingWindow, number> = { week: 7, month: 30 }

/**
 * Pura y exportada para poder testearla: es la única parte del ranking donde
 * un error no se ve —una ventana de 7 días que en realidad son 8 devuelve algo
 * verosímil y equivocado— y donde además hay que pensar en zonas horarias.
 */
export function windowStart(window: RankingWindow, now: Date): Date {
  const desde = new Date(now.getTime())
  desde.setUTCDate(desde.getUTCDate() - (DIAS[window] ?? 7))
  return desde
}
