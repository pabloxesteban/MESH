/**
 * Ubicaciones: la fuente de verdad en tiempo de compilación para la tabla
 * `locations`.
 *
 * Dos niveles: **ciudad** y **barrio**. Un barrio siempre cuelga de una ciudad.
 *
 * Antes había uno solo, y este archivo decía que un barrio no era una ubicación
 * — que poner "Palermo" en `city` sería llamar ciudad a algo que no lo es, y
 * que el día que quisiéramos el barrio iba a ser una columna nueva y no un
 * campo torcido. Llegó ese día: `kind` y `parentSlug` son esas columnas.
 *
 * ## Cómo se mide "cerca"
 *
 * Sin coordenadas. La columna `lat`/`lng` existe en la tabla y sigue vacía: no
 * vamos a escribir coordenadas que no verificamos, y una distancia en línea
 * recta miente sobre una ciudad con río, autopistas y subte.
 *
 * En su lugar, tres agrupaciones que son datos oficiales y verificables:
 *
 * · `groupKey` — la **comuna** de CABA (las 15 de la Ley 1777). Es la división
 *   administrativa real, así que "misma comuna" es un hecho, no una estimación
 *   nuestra de cercanía. Palermo es Comuna 14; Chacarita, Villa Crespo y Paternal
 *   son la 15, que es la de al lado.
 * · `parentSlug` — la ciudad.
 * · `metroKey` — el aglomerado. Vicente López y CABA comparten `amba`; La Plata
 *   no, porque está a 55 km y tratarla como el mismo lugar sería mentirle a
 *   alguien sobre cuánto tiene que viajar.
 *
 * Lo que NO afirma: que dos barrios de la misma comuna estén a la misma
 * distancia entre sí que otros dos. La comuna es una cota superior barata y
 * cierta, no una métrica.
 */

export type LocationKind = 'city' | 'neighborhood'

export interface LocationDefinition {
  readonly slug: string
  readonly countryCode: string
  readonly adminArea: string
  readonly city: string
  /** Nombre del barrio. `null` en una ciudad. */
  readonly neighborhood: string | null
  readonly metroKey: string
  readonly kind: LocationKind
  /** Barrio → ciudad. `null` en una ciudad. */
  readonly parentSlug: string | null
  /**
   * Agrupación oficial dentro de la ciudad — en CABA, la comuna.
   *
   * `null` cuando no aplica o no la tenemos. `null` nunca "coincide" con otro
   * `null`: dos ubicaciones sin grupo no están cerca, simplemente no sabemos.
   */
  readonly groupKey: string | null
}

const CABA = 'Ciudad Autónoma de Buenos Aires'

export const LOCATIONS: readonly LocationDefinition[] = [
  city('caba', CABA, 'Buenos Aires', 'amba'),
  city('vicente-lopez', 'Buenos Aires', 'Vicente López', 'amba'),
  city('san-isidro', 'Buenos Aires', 'San Isidro', 'amba'),
  city('tigre', 'Buenos Aires', 'Tigre', 'amba'),
  city('san-martin', 'Buenos Aires', 'San Martín', 'amba'),
  city('moron', 'Buenos Aires', 'Morón', 'amba'),
  city('avellaneda', 'Buenos Aires', 'Avellaneda', 'amba'),
  city('lomas-de-zamora', 'Buenos Aires', 'Lomas de Zamora', 'amba'),
  city('quilmes', 'Buenos Aires', 'Quilmes', 'amba'),
  city('la-plata', 'Buenos Aires', 'La Plata', 'la-plata'),

  // Los 48 barrios de CABA, con su comuna según la Ley 1777.
  hood('retiro', 'Retiro', 'comuna-1'),
  hood('san-nicolas', 'San Nicolás', 'comuna-1'),
  hood('puerto-madero', 'Puerto Madero', 'comuna-1'),
  hood('san-telmo', 'San Telmo', 'comuna-1'),
  hood('montserrat', 'Montserrat', 'comuna-1'),
  hood('constitucion', 'Constitución', 'comuna-1'),
  hood('recoleta', 'Recoleta', 'comuna-2'),
  hood('balvanera', 'Balvanera', 'comuna-3'),
  hood('san-cristobal', 'San Cristóbal', 'comuna-3'),
  hood('la-boca', 'La Boca', 'comuna-4'),
  hood('barracas', 'Barracas', 'comuna-4'),
  hood('parque-patricios', 'Parque Patricios', 'comuna-4'),
  hood('nueva-pompeya', 'Nueva Pompeya', 'comuna-4'),
  hood('almagro', 'Almagro', 'comuna-5'),
  hood('boedo', 'Boedo', 'comuna-5'),
  hood('caballito', 'Caballito', 'comuna-6'),
  hood('flores', 'Flores', 'comuna-7'),
  hood('parque-chacabuco', 'Parque Chacabuco', 'comuna-7'),
  hood('villa-soldati', 'Villa Soldati', 'comuna-8'),
  hood('villa-riachuelo', 'Villa Riachuelo', 'comuna-8'),
  hood('villa-lugano', 'Villa Lugano', 'comuna-8'),
  hood('liniers', 'Liniers', 'comuna-9'),
  hood('mataderos', 'Mataderos', 'comuna-9'),
  hood('parque-avellaneda', 'Parque Avellaneda', 'comuna-9'),
  hood('villa-luro', 'Villa Luro', 'comuna-10'),
  hood('velez-sarsfield', 'Vélez Sarsfield', 'comuna-10'),
  hood('floresta', 'Floresta', 'comuna-10'),
  hood('monte-castro', 'Monte Castro', 'comuna-10'),
  hood('villa-real', 'Villa Real', 'comuna-10'),
  hood('versalles', 'Versalles', 'comuna-10'),
  hood('villa-general-mitre', 'Villa General Mitre', 'comuna-11'),
  hood('villa-devoto', 'Villa Devoto', 'comuna-11'),
  hood('villa-del-parque', 'Villa del Parque', 'comuna-11'),
  hood('villa-santa-rita', 'Villa Santa Rita', 'comuna-11'),
  hood('coghlan', 'Coghlan', 'comuna-12'),
  hood('saavedra', 'Saavedra', 'comuna-12'),
  hood('villa-urquiza', 'Villa Urquiza', 'comuna-12'),
  hood('villa-pueyrredon', 'Villa Pueyrredón', 'comuna-12'),
  hood('nunez', 'Núñez', 'comuna-13'),
  hood('belgrano', 'Belgrano', 'comuna-13'),
  hood('colegiales', 'Colegiales', 'comuna-13'),
  hood('palermo', 'Palermo', 'comuna-14'),
  hood('chacarita', 'Chacarita', 'comuna-15'),
  hood('villa-crespo', 'Villa Crespo', 'comuna-15'),
  hood('paternal', 'La Paternal', 'comuna-15'),
  hood('villa-ortuzar', 'Villa Ortúzar', 'comuna-15'),
  hood('agronomia', 'Agronomía', 'comuna-15'),
  hood('parque-chas', 'Parque Chas', 'comuna-15'),
]

function city(
  slug: string,
  adminArea: string,
  cityName: string,
  metroKey: string,
): LocationDefinition {
  return {
    slug,
    countryCode: 'AR',
    adminArea,
    city: cityName,
    neighborhood: null,
    metroKey,
    kind: 'city',
    parentSlug: null,
    groupKey: null,
  }
}

/** Un barrio de CABA. Hereda ciudad, provincia y aglomerado de su padre. */
function hood(slug: string, name: string, comuna: string): LocationDefinition {
  return {
    slug,
    countryCode: 'AR',
    adminArea: 'Buenos Aires',
    // `city` sigue siendo la ciudad: el barrio vive en `neighborhood`. Poner
    // "Palermo" acá sería el campo torcido que este archivo viene evitando.
    city: CABA,
    neighborhood: name,
    metroKey: 'amba',
    kind: 'neighborhood',
    parentSlug: 'caba',
    groupKey: comuna,
  }
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

/**
 * Qué tan cerca están dos ubicaciones, en escalones nombrados.
 *
 * De más cerca a más lejos: `same` (la misma) · `group` (misma comuna) ·
 * `city` (misma ciudad) · `metro` (mismo aglomerado) · `far`.
 * `unknown` cuando alguno de los dos slugs no está en la taxonomía.
 *
 * **Los escalones finos solo aparecen si los dos lados tienen el dato.** Si el
 * artista dijo su barrio y la persona no, lo mejor que se puede afirmar es
 * "misma ciudad" — y eso es lo que se devuelve. Inferir el barrio de alguien
 * sería inventarlo.
 */
export type Proximity = 'same' | 'group' | 'city' | 'metro' | 'far' | 'unknown'

export function proximity(a: string, b: string): Proximity {
  const left = LOCATION_BY_SLUG.get(a)
  const right = LOCATION_BY_SLUG.get(b)
  if (left == null || right == null) return 'unknown'

  if (left.slug === right.slug) return 'same'

  // Granularidad desigual: uno dijo el barrio y el otro solo la ciudad. Lo más
  // preciso que se puede afirmar es "la misma ciudad", y eso NO es una mala
  // noticia sobre la distancia — es falta de dato. Vale `same`, porque bajarle
  // el puntaje al que sí declaró su barrio sería premiar al que no lo da.
  if (isCityOf(left, right) || isCityOf(right, left)) return 'same'

  // Misma comuna. `null` no coincide con `null`: dos ubicaciones sin grupo no
  // están cerca, simplemente no sabemos.
  if (
    left.groupKey != null &&
    right.groupKey != null &&
    left.groupKey === right.groupKey
  ) {
    return 'group'
  }

  if (cityOf(left) === cityOf(right)) return 'city'
  if (left.metroKey === right.metroKey) return 'metro'
  return 'far'
}

/** El slug de la ciudad: el propio si es ciudad, el del padre si es barrio. */
function cityOf(location: LocationDefinition): string {
  return location.parentSlug ?? location.slug
}

/** ¿`maybeCity` es la ciudad a la que pertenece `hood`? */
function isCityOf(
  maybeCity: LocationDefinition,
  hood: LocationDefinition,
): boolean {
  return maybeCity.kind === 'city' && hood.parentSlug === maybeCity.slug
}

/**
 * Cómo nombrar una ubicación en pantalla: el barrio si lo hay, si no la ciudad.
 *
 * "Palermo" le dice más a alguien de Buenos Aires que "Ciudad Autónoma de
 * Buenos Aires", y es más corto.
 */
export function locationLabel(slug: string): string | null {
  const location = LOCATION_BY_SLUG.get(slug)
  if (location == null) return null
  return location.neighborhood ?? location.city
}

/** Los barrios de una ciudad, para poblar un selector. */
export function neighborhoodsOf(
  citySlug: string,
): readonly LocationDefinition[] {
  return LOCATIONS.filter((location) => location.parentSlug === citySlug)
}
