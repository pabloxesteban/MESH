/**
 * Ubicaciones: la fuente de verdad en tiempo de compilación para la tabla
 * `locations`.
 *
 * Granularidad: ciudad. Un barrio NO es una ubicación acá. Poner "Palermo" en
 * la columna `city` sería llamar ciudad a algo que no lo es, y el día que
 * queramos mostrar el barrio va a ser una columna nueva, no un campo torcido.
 *
 * `metroKey` es lo único que mira el matching: dos ubicaciones con el mismo
 * `metroKey` son la misma ciudad a los fines de "¿le queda cerca?". Vicente
 * López y CABA comparten `amba`; La Plata no, porque está a 55 km y tratarla
 * como el mismo lugar sería mentirle a alguien sobre cuánto tiene que viajar.
 *
 * Sin `lat`/`lng`: la columna existe en la tabla, pero no vamos a escribir
 * coordenadas que no verificamos y que V1 no usa. El componente de ubicación
 * del matching es una comparación de `metroKey`, no una distancia.
 */

export interface LocationDefinition {
  readonly slug: string
  readonly countryCode: string
  readonly adminArea: string
  readonly city: string
  readonly metroKey: string
}

export const LOCATIONS: readonly LocationDefinition[] = [
  loc('caba', 'Ciudad Autónoma de Buenos Aires', 'Buenos Aires', 'amba'),
  loc('vicente-lopez', 'Buenos Aires', 'Vicente López', 'amba'),
  loc('san-isidro', 'Buenos Aires', 'San Isidro', 'amba'),
  loc('tigre', 'Buenos Aires', 'Tigre', 'amba'),
  loc('san-martin', 'Buenos Aires', 'San Martín', 'amba'),
  loc('moron', 'Buenos Aires', 'Morón', 'amba'),
  loc('avellaneda', 'Buenos Aires', 'Avellaneda', 'amba'),
  loc('lomas-de-zamora', 'Buenos Aires', 'Lomas de Zamora', 'amba'),
  loc('quilmes', 'Buenos Aires', 'Quilmes', 'amba'),
  loc('la-plata', 'Buenos Aires', 'La Plata', 'la-plata'),
]

function loc(
  slug: string,
  adminArea: string,
  city: string,
  metroKey: string,
): LocationDefinition {
  return { slug, countryCode: 'AR', adminArea, city, metroKey }
}

const LOCATION_BY_SLUG = new Map<string, LocationDefinition>(
  LOCATIONS.map((location) => [location.slug, location]),
)

export function findLocation(slug: string): LocationDefinition | undefined {
  return LOCATION_BY_SLUG.get(slug)
}

/**
 * Usado por el validador de contenido: una ubicación desconocida aborta la
 * carga antes de insertar nada, igual que un estilo desconocido.
 */
export function isKnownLocation(slug: string): boolean {
  return LOCATION_BY_SLUG.has(slug)
}

/** Dos ubicaciones son "la misma ciudad" para el matching si comparten metro. */
export function isSameMetro(a: string, b: string): boolean {
  const left = LOCATION_BY_SLUG.get(a)
  const right = LOCATION_BY_SLUG.get(b)
  if (left == null || right == null) return false
  return left.metroKey === right.metroKey
}
