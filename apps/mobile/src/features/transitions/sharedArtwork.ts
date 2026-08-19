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

import type { ArtworkScope } from './artworkRegistry.ts'
import type { Rect } from './geometry.ts'

export interface ArtworkHandoff {
  /** La obra que se tocó. El perfil la usa como hero. */
  readonly portfolioItemId: string
  /** A quién se está abriendo. El candado que evita heredar la animación. */
  readonly professionalSlug: string
  /** De qué superficie salió. Es a la que después se vuelve. */
  readonly scope: ArtworkScope
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

// ---------------------------------------------------------------------------
// La vuelta
// ---------------------------------------------------------------------------
//
// El camino de ida y el de vuelta no son simétricos, y por una razón que no es
// de código: **al ir, la obra está en pantalla y se puede medir; al volver, el
// destino es una grilla que quedó atrás.** Puede haber scrolleado, puede haber
// desmontado la tarjeta, puede ser otra pestaña.
//
// Y hay un problema más: no hay un solo "atrás". Está el botón, está el gesto
// de borde de iOS y está el botón físico de Android. Interceptarlos a los tres
// —con `beforeRemove` y `preventDefault`— es frágil y pelea con el gesto justo
// cuando la pantalla ya se movió con el dedo.
//
// Así que no se intercepta nada. El perfil **arma** la vuelta mientras está en
// pantalla, y la **suelta al desmontarse**, que es exactamente el momento en
// que se fue por cualquiera de los tres caminos. La grilla está suscripta y se
// entera sola. Nadie pregunta "¿me fui?": el desmontaje es la respuesta.

/** La obra que vuelve, y a qué superficie. */
export interface ReturnHandoff {
  readonly portfolioItemId: string
  readonly mediaPath: string
  readonly blurhash: string | null
  readonly aspectRatio: number
  /** Dónde está el hero ahora, ya ajustado por el scroll del perfil. */
  readonly from: Rect
  /** De qué superficie vino, y por lo tanto a cuál vuelve. */
  readonly scope: ArtworkScope
}

let armed: ReturnHandoff | null = null
let pendingReturn: ReturnHandoff | null = null
const listeners = new Set<() => void>()

/**
 * El perfil deja lista la vuelta.
 *
 * Se llama en cada layout del hero, no una sola vez: si la persona scrollea, el
 * hero se mueve, y volver desde una posición vieja haría que la obra salga
 * volando desde fuera de la pantalla. `null` desarma — es lo correcto cuando el
 * hero quedó fuera de vista.
 */
export function armReturn(handoff: ReturnHandoff | null): void {
  armed = handoff
}

/**
 * El perfil se fue. Lo armado pasa a estar disponible.
 *
 * Es lo que se llama al desmontar. Si no había nada armado —se llegó desde un
 * chat, o el hero no estaba a la vista— no pasa nada, que es la respuesta
 * correcta: sin origen no hay animación.
 */
export function releaseReturn(): void {
  if (armed == null) return
  pendingReturn = armed
  armed = null
  for (const listener of [...listeners]) listener()
}

/** La grilla se entera de que hay una vuelta esperando. */
export function subscribeReturn(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * La superficie que corresponde se queda con la vuelta.
 *
 * Un solo uso y atada a la superficie: con las pestañas montadas todas a la
 * vez, sin el candado la vuelta a Inicio se la podría llevar Explorar, que
 * nadie está mirando — y entonces no se ve ninguna animación.
 */
export function claimReturn(scope: ArtworkScope): ReturnHandoff | null {
  if (pendingReturn == null || pendingReturn.scope !== scope) return null
  const handoff = pendingReturn
  pendingReturn = null
  return handoff
}

/** Solo para tests: deja el módulo como recién importado. */
export function __resetReturnHandoff(): void {
  armed = null
  pendingReturn = null
  listeners.clear()
}
