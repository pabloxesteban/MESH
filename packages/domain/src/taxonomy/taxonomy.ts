/**
 * Taxonomía: categorías, estilos y rasgos.
 *
 * Esto es la fuente de verdad en tiempo de compilación para lo que se carga en
 * las tablas `categories` y `styles`. En la base, la taxonomía son filas — no
 * un enum — para que agregar una categoría no requiera migración. Ver
 * docs/architecture/data-model.md §1.
 *
 * Reglas:
 *   - Los slugs son estables, en minúscula, y NUNCA se traducen.
 *   - Los nombres visibles son claves de i18n, no strings — la taxonomía no
 *     puede tener forma de un solo idioma dentro de la base.
 *   - Agregar un estilo requiere una migración y revisión de content-engineer:
 *     todo vector de gusto existente cambia de significado en silencio cuando
 *     cambia el vocabulario. Ver docs/product/content-policy.md §6.
 */

export type CategorySlug = 'tattoo'

export interface CategoryDefinition {
  readonly slug: CategorySlug
  readonly nameKey: string
  readonly sortOrder: number
  readonly isActive: boolean
}

export interface StyleDefinition {
  readonly slug: string
  readonly categorySlug: CategorySlug
  readonly nameKey: string
  readonly descriptionKey: string
  /**
   * Términos alternativos que los artistas usan para el mismo estilo. Permiten
   * fusionar dos estilos más adelante sin una migración de datos.
   */
  readonly aliases: readonly string[]
  readonly sortOrder: number
  readonly isActive: boolean
}

export const CATEGORIES: readonly CategoryDefinition[] = [
  { slug: 'tattoo', nameKey: 'category.tattoo', sortOrder: 1, isActive: true },
] as const

/**
 * Vocabulario inicial de tatuaje.
 *
 * `fileteado-porteno` está incluido a propósito: es específico de Buenos Aires
 * y le señala al usuario local que MESH se construyó para su ciudad en lugar de
 * traducirse a ella.
 *
 * `old-school` y `traditional` se solapan mucho en la práctica. Se mantienen
 * separados porque los artistas usan los dos términos; los `aliases` permiten
 * fusionarlos más adelante sin migración.
 */
export const STYLES: readonly StyleDefinition[] = [
  s('fine-line', 1, ['linea fina', 'microrealismo lineal']),
  s('blackwork', 2, ['negro solido']),
  s('dotwork', 3, ['puntillismo']),
  s('old-school', 4, ['oldschool']),
  s('traditional', 5, ['tradicional', 'american traditional']),
  s('neo-traditional', 6, ['neotradicional']),
  s('realism', 7, ['realismo']),
  s('black-and-grey', 8, ['negro y gris', 'black and gray']),
  s('watercolor', 9, ['acuarela']),
  s('ornamental', 10, ['ornamental geometrico']),
  s('japanese', 11, ['japones', 'irezumi']),
  s('lettering', 12, ['caligrafia', 'tipografia']),
  s('minimalist', 13, ['minimalista', 'minimal']),
  s('fileteado-porteno', 14, ['fileteado']),
  s('handpoke', 15, ['stick and poke', 'a mano']),
]

/**
 * Las dimensiones de un brief. Espeja el enum `trait_dimension` de Postgres.
 *
 * Los nombres son genéricos a propósito: otro rubro puede usar `size` y
 * `palette` con otros slugs, y puede no tener `body_area`. Nada obliga a que
 * una categoría use las tres. Ver ADR-020.
 */
export type TraitDimension = 'body_area' | 'size' | 'palette'

export const TRAIT_DIMENSIONS: readonly TraitDimension[] = [
  'body_area',
  'size',
  'palette',
] as const

export interface TraitDefinition {
  readonly slug: string
  readonly categorySlug: CategorySlug
  readonly dimension: TraitDimension
  readonly nameKey: string
  readonly sortOrder: number
  readonly isActive: boolean
}

/**
 * Vocabulario de rasgos de tatuaje.
 *
 * Es lo que el clasificador puede devolver y lo que la pantalla del brief
 * ofrece — la misma lista, y por eso vive acá y no en el prompt: un vocabulario
 * escrito dos veces se separa a la primera edición.
 *
 * Las listas son **cortas a propósito**. Diez zonas del cuerpo y no un atlas de
 * anatomía: con treinta opciones nadie elige, y la diferencia entre "gemelo" y
 * "pantorrilla" no cambia ni el precio ni el artista.
 */
export const TRAITS: readonly TraitDefinition[] = [
  // Zona del cuerpo, de la más pedida a la menos.
  t('body_area', 'antebrazo', 10),
  t('body_area', 'brazo', 20),
  t('body_area', 'hombro', 30),
  t('body_area', 'espalda', 40),
  t('body_area', 'pecho', 50),
  t('body_area', 'costillas', 60),
  t('body_area', 'pierna', 70),
  t('body_area', 'tobillo', 80),
  t('body_area', 'mano', 90),
  t('body_area', 'cuello', 100),

  // Tamaño. La referencia en centímetros va en el nombre traducido, no en el
  // slug: "chico" no cambia de significado, la referencia sí puede afinarse.
  t('size', 'mini', 10),
  t('size', 'chico', 20),
  t('size', 'mediano', 30),
  t('size', 'grande', 40),
  t('size', 'gran-formato', 50),

  // Paleta. Tres, que es como se decide de verdad.
  t('palette', 'negro', 10),
  t('palette', 'negro-y-gris', 20),
  t('palette', 'color', 30),
]

/** Los rasgos de una dimensión, en orden. */
export function traitsOf(
  dimension: TraitDimension,
  categorySlug: CategorySlug = 'tattoo',
): readonly TraitDefinition[] {
  return TRAITS.filter(
    (trait) =>
      trait.dimension === dimension &&
      trait.categorySlug === categorySlug &&
      trait.isActive,
  )
}

function t(
  dimension: TraitDimension,
  slug: string,
  sortOrder: number,
): TraitDefinition {
  return {
    slug,
    categorySlug: 'tattoo',
    dimension,
    nameKey: `trait.tattoo.${slug}`,
    sortOrder,
    isActive: true,
  }
}

function s(
  slug: string,
  sortOrder: number,
  aliases: readonly string[],
): StyleDefinition {
  return {
    slug,
    categorySlug: 'tattoo',
    nameKey: `style.tattoo.${slug}`,
    descriptionKey: `style.tattoo.${slug}.description`,
    aliases,
    sortOrder,
    isActive: true,
  }
}

const STYLES_BY_CATEGORY = new Map<CategorySlug, readonly StyleDefinition[]>()
for (const category of CATEGORIES) {
  STYLES_BY_CATEGORY.set(
    category.slug,
    STYLES.filter((style) => style.categorySlug === category.slug),
  )
}

const STYLE_BY_KEY = new Map<string, StyleDefinition>(
  STYLES.map((style) => [`${style.categorySlug}/${style.slug}`, style]),
)

/** Estilos activos de una categoría, en orden de presentación. */
export function stylesForCategory(
  categorySlug: CategorySlug,
): readonly StyleDefinition[] {
  return STYLES_BY_CATEGORY.get(categorySlug) ?? []
}

/** Devuelve el estilo, o `undefined` si el slug no existe en esa categoría. */
export function findStyle(
  categorySlug: CategorySlug,
  styleSlug: string,
): StyleDefinition | undefined {
  return STYLE_BY_KEY.get(`${categorySlug}/${styleSlug}`)
}

/**
 * Usado por el validador de contenido: un slug de estilo desconocido aborta la
 * carga antes de insertar nada. Ver docs/product/content-policy.md §5.
 */
export function isKnownStyle(
  categorySlug: CategorySlug,
  styleSlug: string,
): boolean {
  return STYLE_BY_KEY.has(`${categorySlug}/${styleSlug}`)
}

export function isKnownCategory(slug: string): slug is CategorySlug {
  return CATEGORIES.some((category) => category.slug === slug)
}
