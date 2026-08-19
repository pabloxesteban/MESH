/**
 * La geometría de la transición obra → artista.
 *
 * Todo lo que decide **dónde** está cada cosa vive acá, en funciones puras, por
 * la misma razón por la que el orden por cercanía no está en SQL: es lo que se
 * puede equivocar en silencio, y un rectángulo mal calculado se ve como un
 * salto de un fotograma que nadie va a poder reproducir a mano.
 *
 * La pieza clave es `heroRect`. La transición **no mide** el destino: lo
 * calcula, con las mismas constantes con las que `ProfileScreen` dibuja su
 * hero. Medir habría sido más obvio, pero el perfil llega por red y el hero no
 * existe durante los primeros fotogramas — la obra se quedaría quieta en su
 * lugar viejo esperando que baje el JSON, que es exactamente la sensación de
 * "se colgó" que la transición viene a evitar.
 *
 * El precio de calcular en vez de medir es que estas constantes y las de
 * `ProfileScreen` tienen que coincidir. Hay un test que las compara.
 */

/** Un rectángulo en coordenadas de ventana, como los devuelve `measureInWindow`. */
export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Relación de aspecto por defecto.
 *
 * El mismo 4:5 que usan la tarjeta de la grilla y el hero del perfil. Está
 * repetido a propósito en los tres lugares y verificado por un test: importar
 * un token de layout desde acá ataría la geometría al design system, y lo que
 * tiene que estar atado es al revés — si el hero cambia de forma, este archivo
 * se entera por el test, no por el import.
 */
export const DEFAULT_RATIO = 4 / 5

/**
 * Dónde termina la obra: el hero del perfil.
 *
 * Se deriva de cómo `ProfileScreen` arma su `contentContainerStyle`
 * (`padding: SCREEN_GUTTER`, `paddingTop: insets.top + spacing.md`) y de que el
 * hero es el primer hijo, a ancho completo.
 */
export function heroRect({
  screenWidth,
  insetTop,
  aspectRatio,
  gutter,
  topSpacing,
}: {
  screenWidth: number
  insetTop: number
  /** Ancho / alto de la obra. */
  aspectRatio: number
  gutter: number
  topSpacing: number
}): Rect {
  const width = Math.max(screenWidth - gutter * 2, 0)
  const ratio = aspectRatio > 0 ? aspectRatio : DEFAULT_RATIO

  return {
    x: gutter,
    y: insetTop + topSpacing,
    width,
    height: width / ratio,
  }
}

/**
 * La relación de aspecto de una obra, con el mismo default en todas partes.
 *
 * Una obra sin medidas declaradas no es un borde raro: es lo normal en las
 * piezas viejas del catálogo. Que la tarjeta y el hero elijan el mismo default
 * es lo que hace que la transición no cambie de forma en el camino.
 */
export function ratioOf(
  width: number | null | undefined,
  height: number | null | undefined,
): number {
  if (width == null || height == null || height <= 0 || width <= 0) {
    return DEFAULT_RATIO
  }
  return width / height
}

/**
 * El rectángulo intermedio en el momento `t` (0 = origen, 1 = destino).
 *
 * Interpolación lineal de las cuatro medidas, no de una escala: escalar
 * alrededor de un centro deja los bordes fuera de lugar cuando el origen y el
 * destino no son concéntricos, y en una grilla de dos columnas nunca lo son.
 */
export function interpolateRect(from: Rect, to: Rect, t: number): Rect {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t
  const mix = (a: number, b: number) => a + (b - a) * clamped

  return {
    x: mix(from.x, to.x),
    y: mix(from.y, to.y),
    width: mix(from.width, to.width),
    height: mix(from.height, to.height),
  }
}

/**
 * ¿Vale la pena animar?
 *
 * Si el origen y el destino son prácticamente el mismo rectángulo, la
 * animación no comunica nada —no hay movimiento que seguir— y lo único que
 * aporta son 280ms de espera. El umbral está en píxeles y no en porcentaje
 * porque lo que importa es si el ojo lo ve, y el ojo mide en pantalla.
 */
export function isWorthAnimating(from: Rect, to: Rect): boolean {
  const MINIMUM_SHIFT = 8
  return (
    Math.abs(from.x - to.x) > MINIMUM_SHIFT ||
    Math.abs(from.y - to.y) > MINIMUM_SHIFT ||
    Math.abs(from.width - to.width) > MINIMUM_SHIFT ||
    Math.abs(from.height - to.height) > MINIMUM_SHIFT
  )
}

/**
 * ¿El rectángulo medido tiene sentido?
 *
 * `measureInWindow` puede devolver ceros o `NaN` cuando la vista se desmontó
 * entre el toque y la medición — con un scroll rápido pasa. Un origen inválido
 * haría que la obra crezca desde la esquina superior izquierda, que se ve como
 * un error y no como una transición.
 */
export function isUsableRect(rect: Rect | null | undefined): rect is Rect {
  if (rect == null) return false
  const finite = [rect.x, rect.y, rect.width, rect.height].every((value) =>
    Number.isFinite(value),
  )
  return finite && rect.width > 0 && rect.height > 0
}
