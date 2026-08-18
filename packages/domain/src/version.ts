/**
 * Versiones de algoritmo.
 *
 * Se guardan en cada `taste_profiles` y `matches` persistido, para que una fila
 * cacheada se pueda invalidar cuando el algoritmo cambia.
 *
 * Cambiar cualquiera de estas constantes exige, en el mismo commit:
 *   1. Actualizar docs/product/matching.md, incluida la justificación.
 *   2. Recalcular y revisar los fixtures.
 *   3. Invalidar las filas persistidas con la versión vieja.
 *
 * El ajuste silencioso está prohibido. Ver docs/product/matching.md §9.
 */
export const TASTE_VERSION = 'taste/1'
export const MATCHING_VERSION = 'match/2'

export type TasteVersion = typeof TASTE_VERSION
export type MatchingVersion = typeof MATCHING_VERSION
