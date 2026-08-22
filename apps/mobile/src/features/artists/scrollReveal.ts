/**
 * El revelado editorial de Inicio: constantes.
 *
 * Cada tarjeta de la grilla pasa por tres estados según su posición de
 * scroll — entrando, en wipe, resuelta — en vez de aparecer de una. Estas
 * constantes son la spec técnica de `interaction-designer` convertida en
 * números; viven acá y no en `design-system/tokens/motion.ts` porque no son
 * duraciones ni easings, son bandas de posición, un umbral de velocidad y
 * rangos de interpolación propios de esta feature. `apps/mobile/CLAUDE.md`
 * pide que todo valor crudo fuera del design system quede documentado línea
 * por línea — eso es lo que sigue.
 *
 * El borde del wipe es recto a propósito: no hay librería de masking en el
 * proyecto, y el producto ya aprobó esa limitación en vez de sumar una
 * dependencia nueva por un borde curvo.
 */

/**
 * Techo de la banda de entrada, como fracción del alto de viewport.
 *
 * Cuando el centro de una tarjeta está a esta distancia (hacia abajo) del
 * techo de la pantalla, todavía no empezó a resolverse: `progress = 0`.
 */
export const ENTER_BAND_RATIO = 1.0

/**
 * Piso de la banda activa, como fracción del alto de viewport.
 *
 * Cuando el centro de la tarjeta llega acá, ya terminó de resolverse:
 * `progress = 1`. Más arriba de esto no sigue interpolando — se queda ahí.
 */
export const ACTIVE_BAND_RATIO = 0.35

/**
 * Por encima de esta velocidad (px/s) el ojo no puede seguir el wipe, así que
 * no tiene sentido simularlo — no hay mecanismo de blur real disponible, y
 * fingirlo se vería peor que saltarlo. La obra se muestra directo en su
 * forma resuelta mientras el scroll va rápido.
 */
export const FAST_SCROLL_THRESHOLD = 1200

/**
 * Si el momentum termina a esta distancia (px) o menos de un borde de
 * tarjeta, el snap la termina de alinear con un `scrollTo` animado. Más
 * lejos que esto, no hace nada — el snap corrige un scroll casi-servido, no
 * decide por la persona a dónde ir.
 */
export const SNAP_CAPTURE = 24

/**
 * Cuánto más grande que su caja se renderiza la imagen de cada obra. El
 * `scale` mínimo del wipe (`IMAGE_SCALE_ENTER`) encoge visualmente el marco
 * de la imagen sin cambiar su tamaño de layout, lo que dejaría un borde del
 * fondo `surfaceRaised` a la vista si la imagen no sobrara alrededor.
 */
export const IMAGE_OVERSCALE = 1.15

/**
 * Alto del wipe en el estado de entrada, como fracción de la caja. Recorta
 * el 40% superior de la obra — el "pull-through" empieza revelando solo la
 * base.
 */
export const CLIP_HEIGHT_ENTER = 0.6

/** Alto del wipe en el estado resuelto: la obra entera. */
export const CLIP_HEIGHT_ACTIVE = 1.0

/**
 * Escala de la obra en el estado de entrada. Apenas por debajo de 1 — el
 * crecimiento hasta `IMAGE_SCALE_ACTIVE` se lee como un asentamiento, no
 * como una aparición brusca.
 */
export const IMAGE_SCALE_ENTER = 0.96

/** Escala de la obra en el estado resuelto: tamaño real. */
export const IMAGE_SCALE_ACTIVE = 1.0

/**
 * Opacidad de la fila de identidad (avatar, nombre, ubicación) en el estado
 * de entrada. Nunca invisible — apenas apagada, para que el ojo entienda que
 * ya hay algo ahí antes de que termine de asentarse.
 */
export const IDENTITY_OPACITY_ENTER = 0.9

/** Opacidad de la fila de identidad en el estado resuelto. */
export const IDENTITY_OPACITY_ACTIVE = 1.0

/**
 * Cuánto baja la fila de identidad en el estado de entrada, en puntos. Sigue
 * el mismo `progress` que la obra, un paso más chico — es la fila de texto,
 * no el protagonista.
 */
export const IDENTITY_TRANSLATE_Y_ENTER = 6

/** Posición de la fila de identidad en el estado resuelto: en su lugar. */
export const IDENTITY_TRANSLATE_Y_ACTIVE = 0
