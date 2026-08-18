/**
 * Constantes del motor de gusto.
 *
 * Están en un archivo aparte para que cambiar una sea visible en un diff y
 * obligue a subir `TASTE_VERSION`. Ver docs/product/matching.md §3 y §9.
 */

/** Valor de una interacción, por estado. Ver matching.md §3.1. */
export const INTERACTION_VALUE = {
  /** Me gusta. */
  like: 1.0,
  /**
   * Me gusta + guardado. Cuesta una acción extra y expresa intención de volver,
   * así que pesa 1,5×.
   */
  saved: 1.5,
  /**
   * Paso. Evidencia débil: se pasa sobre buen trabajo por la ubicación en el
   * cuerpo, el humor o la velocidad del scroll. Un cuarto de un me gusta.
   *
   * La asimetría es intencional: perderte algo que te gustaría es más barato
   * que recomendarte a la persona equivocada.
   */
  pass: -0.25,
} as const

/**
 * Constante de saturación.
 *
 * `t_s = raw / (raw + K)`. Con K = 3, unas tres piezas marcadas en un estilo
 * llegan a 0,5 y unas siete a 0,7 — que se alinea con cuánta evidencia alguien
 * consideraría convincente sobre sí mismo.
 */
export const SATURATION_K = 3.0

/** Umbral de listo: interacciones decisivas mínimas. Ver matching.md §3.4. */
export const READY_MIN_INTERACTIONS = 12

/** Umbral de listo: estilos distintos que tienen que superar `READY_MIN_SCORE`. */
export const READY_MIN_STYLES = 3

/** Puntaje mínimo de un estilo para contar hacia el umbral de listo. */
export const READY_MIN_SCORE = 0.3

/** Un estilo se muestra si supera esto Y lo sostienen ≥2 interacciones. */
export const DISPLAY_MIN_SCORE = 0.15
export const DISPLAY_MIN_SUPPORT = 2
