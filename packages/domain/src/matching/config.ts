/**
 * Constantes del motor de match.
 *
 * Archivo aparte para que cambiar una sea visible en un diff y obligue a subir
 * `MATCHING_VERSION`. Ver docs/product/matching.md §4 y §9.
 */

/** Pesos de los componentes. Ver matching.md §4.2. */
export const COMPONENT_WEIGHTS = {
  style: 0.7,
  location: 0.15,
  price: 0.1,
  availability: 0.05,
} as const

export type ComponentName = keyof typeof COMPONENT_WEIGHTS

/** Cuántos estilos del usuario entran al componente de estilo. */
export const TOP_STYLES = 6

/**
 * La aversión resta a la mitad.
 *
 * Los pasos son evidencia débil (§3.1), y preferimos mostrar un artista
 * levemente equivocado antes que suprimir en silencio uno bueno.
 */
export const AVERSION_FACTOR = 0.5

/** Valores del componente de ubicación. Ver matching.md §4.1. */
export const LOCATION_VALUE = {
  sameCity: 1.0,
  sameMetro: 0.7,
  travels: 0.4,
  elsewhere: 0.0,
} as const

/** Valores del componente de disponibilidad. */
export const AVAILABILITY_VALUE = {
  open: 1.0,
  limited: 0.7,
  waitlist: 0.5,
  closed: 0.2,
} as const

/**
 * A partir de acá una disponibilidad se considera desconocida y el componente
 * se OMITE. MESH no afirma una disponibilidad que no puede sostener.
 */
export const AVAILABILITY_STALE_DAYS = 45

/** Piso de visualización. Por debajo, el candidato no se muestra en absoluto. */
export const SCORE_FLOOR = 0.4

/** Límites de banda. Ver ADR-005. */
export const BAND_STRONG = 0.75
export const BAND_GOOD = 0.55

/** Una razón se emite solo si su componente aporta al menos esto del puntaje. */
export const REASON_MIN_CONTRIBUTION = 0.1

/** Como mucho tres. Más de tres deja de ser explicación y pasa a ser defensa. */
export const MAX_REASONS = 3

/** Un estilo tiene que llegar a esto para que su razón hable de él por nombre. */
export const REASON_STYLE_MIN_SCORE = 0.5

/** Mezcla proyecto/gusto para el matching por proyecto. Ver matching.md §5. */
export const PROJECT_WEIGHT = 0.75
export const AMBIENT_TASTE_WEIGHT = 0.25
