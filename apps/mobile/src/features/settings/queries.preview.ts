/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El interruptor se puede tocar y recuerda su estado durante la sesión. No hay
 * nada que recolectar: el preview no manda un solo evento a ningún lado.
 */

let optIn = true

export async function fetchAnalyticsOptIn(_userId: string): Promise<boolean> {
  return optIn
}

export async function updateAnalyticsOptIn(
  _userId: string,
  next: boolean,
): Promise<void> {
  optIn = next
}
