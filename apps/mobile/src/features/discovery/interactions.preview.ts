/**
 * Versión de preview de `interactions.ts`. Ver apps/mobile/preview/store.ts.
 *
 * No hay cola offline porque no hay red: la decisión se guarda en memoria y se
 * pierde al recargar. Eso es correcto para un preview —cada persona que abre el
 * enlace arranca de cero— y es exactamente lo que NO hace la app real, donde la
 * cola sobrevive al cierre.
 */

import type { Interaction } from '@mesh/domain'

import {
  forgetPreviewInteraction,
  recordPreviewInteraction,
} from '../../../preview/store.ts'

export interface PendingInteraction {
  readonly portfolioItemId: string
  readonly verdict: 'like' | 'pass'
  readonly isSaved: boolean
  readonly source: 'discover' | 'search' | 'profile'
}

export async function readQueue(): Promise<readonly PendingInteraction[]> {
  return []
}

export async function enqueue(_item: PendingInteraction): Promise<void> {}

export async function flushQueue(_userId: string): Promise<number> {
  return 0
}

export async function recordInteraction(
  _userId: string,
  interaction: PendingInteraction,
): Promise<void> {
  recordPreviewInteraction(interaction as Interaction)
}

export async function undoInteraction(
  _userId: string,
  portfolioItemId: string,
): Promise<void> {
  forgetPreviewInteraction(portfolioItemId)
}
