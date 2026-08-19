/**
 * Los mismos datos para las cuatro direcciones visuales.
 *
 * Compartidos a propósito: si cada dirección trajera su propio contenido, la
 * comparación mediría el contenido y no la composición. Con el mismo material,
 * lo único que cambia entre A, B, C y D es la decisión de diseño.
 *
 * Todo es fixture. Nada de esto sale de la base ni pretende ser una persona
 * real — los nombres son inventados y están escritos para que se note.
 */

/**
 * Una obra, sin foto.
 *
 * Los prototipos de dirección no usan fotografías: usan bloques teñidos con el
 * color de la familia del estilo. No es una limitación técnica, es lo que se
 * está evaluando — una composición que solo funciona porque la foto es linda
 * no es una composición, y con fotos reales de artistas reales la comparación
 * se vuelve un concurso de fotos. Ver `ArtworkSlot`.
 */
export interface ObraFixture {
  readonly id: string
  readonly styleSlug: string
  /** Alto / ancho. Las obras reales no son todas cuadradas y la grilla tiene que aguantarlo. */
  readonly ratio: number
}

export const OBRAS: readonly ObraFixture[] = [
  { id: 'o1', styleSlug: 'fine-line', ratio: 1.25 },
  { id: 'o2', styleSlug: 'blackwork', ratio: 0.8 },
  { id: 'o3', styleSlug: 'japanese', ratio: 1.4 },
  { id: 'o4', styleSlug: 'dotwork', ratio: 1 },
  { id: 'o5', styleSlug: 'lettering', ratio: 0.75 },
  { id: 'o6', styleSlug: 'minimalist', ratio: 1.2 },
  { id: 'o7', styleSlug: 'traditional', ratio: 1 },
  { id: 'o8', styleSlug: 'handpoke', ratio: 1.35 },
]

export interface ArtistaFixture {
  readonly nombre: string
  readonly barrio: string
  readonly estilos: readonly string[]
  /** Cuántas obras suyas marcó la persona. Es el sustento del encaje, no un puntaje inventado. */
  readonly marcadas: number
}

export const ARTISTA: ArtistaFixture = {
  nombre: 'Nombre Inventado',
  barrio: 'Palermo',
  estilos: ['fine-line', 'minimalist', 'dotwork'],
  marcadas: 17,
}

export interface GustoFixture {
  readonly styleSlug: string
  readonly label: string
  /** 0–1. Cuánto de lo que marcó la persona cubre este estilo. */
  readonly score: number
  /** Cuántas decisiones lo sostienen. Sin esto un puntaje es una afirmación sin respaldo. */
  readonly support: number
}

export const GUSTO: readonly GustoFixture[] = [
  { styleSlug: 'fine-line', label: 'Línea fina', score: 0.82, support: 9 },
  { styleSlug: 'minimalist', label: 'Minimalista', score: 0.68, support: 5 },
  { styleSlug: 'dotwork', label: 'Puntillismo', score: 0.51, support: 3 },
]

/**
 * Las razones de un encaje.
 *
 * Cada una tiene que poder rastrearse a algo que la persona hizo. "Trabaja
 * línea fina, que marcaste 9 veces" es verificable; "vibra con vos" no. Ver
 * docs/product/matching.md §6.
 */
export const MOTIVOS: readonly string[] = [
  'Trabaja línea fina, el estilo que más marcaste',
  'También hace puntillismo, que marcaste 3 veces',
  'En Palermo, a 2,4 km tuyo',
]

/** Los pasos del armador de proyecto, tal como se leen en pantalla. */
export const PROYECTO_OPCIONES: readonly string[] = [
  'Algo chico',
  'Algo con historia',
  'Algo grande',
  'Todavía no sé',
]
