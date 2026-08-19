/**
 * El pasamanos de la transición obra → artista.
 *
 * Cuando alguien toca una obra, la pantalla que la tenía sabe **dónde estaba**
 * y la pantalla que se abre necesita saberlo. Entre las dos hay una navegación,
 * y una navegación no lleva rectángulos: los parámetros de ruta son texto en
 * una URL, y meter cuatro coordenadas ahí las volvería parte de un enlace que
 * alguien podría compartir con la posición de un scroll ajeno adentro.
 *
 * Así que el rectángulo viaja por afuera, en este módulo, y con tres candados:
 *
 * · **Un solo uso.** Se reclama una vez y se borra. Sin esto, volver atrás y
 *   entrar de nuevo desde otro lado reproduciría la animación desde una
 *   posición vieja.
 * · **Con vencimiento.** Si entre el toque y la apertura pasó más de un
 *   suspiro, la obra ya no está donde estaba y crecer desde ahí sería mentir.
 * · **Atado al artista.** Solo lo reclama el perfil que corresponde. Abrir un
 *   perfil distinto no hereda la animación de otro.
 *
 * Es estado global mutable, que normalmente no se hace. Acá se justifica:
 * es un dato de un solo fotograma que muere apenas se usa, y la alternativa
 * —un contexto de React envolviendo el navegador— haría re-renderizar la app
 * entera para pasar algo que nadie más necesita leer.
 */

import type { Rect } from './geometry.ts'

export interface ArtworkHandoff {
  /** La obra que se tocó. El perfil la usa como hero. */
  readonly portfolioItemId: string
  /** A quién se está abriendo. El candado que evita heredar la animación. */
  readonly professionalSlug: string
  readonly mediaPath: string
  readonly blurhash: string | null
  readonly aspectRatio: number
  /** Dónde estaba la obra en la pantalla, en coordenadas de ventana. */
  readonly from: Rect
  /** Cuándo se tocó. Para el vencimiento. */
  readonly at: number
}

/**
 * Cuánto vive un pasamanos sin reclamar.
 *
 * Un segundo. Es holgado para una navegación normal —que tarda decenas de
 * milisegundos— y corto para cualquier otra cosa: si el perfil tardó más de un
 * segundo en montarse, la persona ya dejó de mirar el lugar de donde salió la
 * obra, y una animación que crece desde ahí llega tarde a explicar algo que ya
 * nadie está siguiendo.
 */
export const HANDOFF_TTL = 1000

let pending: ArtworkHandoff | null = null

/** La pantalla de origen deja la obra y su rectángulo. */
export function offerArtwork(handoff: ArtworkHandoff): void {
  pending = handoff
}

/**
 * El perfil reclama la obra, si le corresponde y si todavía sirve.
 *
 * Devuelve `null` —y no una animación degradada— cuando algo no cierra: sin
 * origen confiable, la entrada sin animación es la respuesta correcta, no una
 * animación desde un lugar inventado.
 */
export function claimArtwork(
  professionalSlug: string,
  now: number = Date.now(),
): ArtworkHandoff | null {
  const handoff = pending
  if (handoff == null) return null

  // Se borra pase lo que pase: un pasamanos que no sirvió tampoco tiene que
  // quedar esperando a la próxima navegación.
  pending = null

  if (handoff.professionalSlug !== professionalSlug) return null
  if (now - handoff.at > HANDOFF_TTL) return null
  if (now < handoff.at) return null

  return handoff
}

/** Solo para tests: deja el módulo como recién importado. */
export function __resetArtworkHandoff(): void {
  pending = null
}
