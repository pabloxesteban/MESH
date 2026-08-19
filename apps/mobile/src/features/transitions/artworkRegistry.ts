/**
 * Qué obra está en pantalla, y dónde.
 *
 * La ida es fácil: la obra que se toca está ahí, se mide y listo. La vuelta no,
 * porque cuando el perfil se cierra hay que saber **a dónde** volver, y eso
 * depende de una grilla que quedó atrás — que pudo scrollearse, o desmontar la
 * tarjeta, o directamente ser otra pestaña.
 *
 * Así que cada obra visible se anota acá mientras está montada. No es un caché
 * de posiciones: es una lista de "esta obra existe y sabe medirse". La posición
 * se pregunta en el momento, porque la de hace tres segundos ya no sirve.
 *
 * **Está separado por superficie.** Las pestañas quedan montadas todas a la
 * vez, así que la misma obra puede estar registrada por Explorar y por el
 * carrusel de Inicio al mismo tiempo. Sin separar, la vuelta a Inicio podría
 * terminar animando la tarjeta de Explorar, que nadie está mirando.
 */

import { isUsableRect, type Rect } from './geometry.ts'

/** Las superficies que muestran obra y a las que se puede volver. */
export type ArtworkScope = 'explore' | 'artists'

type Measure = () => Rect | null

const registry = new Map<ArtworkScope, Map<string, Measure>>()

function surfaceOf(scope: ArtworkScope): Map<string, Measure> {
  const existing = registry.get(scope)
  if (existing != null) return existing
  const created = new Map<string, Measure>()
  registry.set(scope, created)
  return created
}

/**
 * Anota una obra visible. Devuelve la función para borrarla.
 *
 * Pensado para usarse desde un efecto: `useEffect(() => registerArtwork(...))`.
 */
export function registerArtwork(
  scope: ArtworkScope,
  portfolioItemId: string,
  measure: Measure,
): () => void {
  const surface = surfaceOf(scope)
  surface.set(portfolioItemId, measure)

  return () => {
    // Solo si sigue siendo la misma: si la tarjeta se remontó, la entrada
    // nueva es la buena y borrarla dejaría la obra sin registrar.
    if (surface.get(portfolioItemId) === measure) {
      surface.delete(portfolioItemId)
    }
  }
}

/**
 * Dónde está esa obra ahora mismo, si está.
 *
 * `null` cuando la tarjeta no está montada —la grilla scrolleó lejos— o cuando
 * lo que devuelve la medición no sirve. En los dos casos la respuesta correcta
 * es no animar: una obra que encoge hacia un lugar donde no hay nada se ve
 * peor que una pantalla que simplemente se cierra.
 */
export function measureArtwork(
  scope: ArtworkScope,
  portfolioItemId: string,
  windowSize?: { width: number; height: number },
): Rect | null {
  const measure = registry.get(scope)?.get(portfolioItemId)
  if (measure == null) return null

  const rect = measure()
  if (!isUsableRect(rect)) return null

  // Una tarjeta montada pero fuera de la ventana —scrolleada arriba o abajo—
  // sigue midiendo bien y sigue sin servir: la obra encogería hacia un punto
  // que no se ve, y el ojo la perdería igual que sin animación.
  if (windowSize != null && !intersectsWindow(rect, windowSize)) return null

  return rect
}

function intersectsWindow(
  rect: Rect,
  windowSize: { width: number; height: number },
): boolean {
  return (
    rect.x < windowSize.width &&
    rect.y < windowSize.height &&
    rect.x + rect.width > 0 &&
    rect.y + rect.height > 0
  )
}

/** Solo para tests: deja el módulo como recién importado. */
export function __resetArtworkRegistry(): void {
  registry.clear()
}
