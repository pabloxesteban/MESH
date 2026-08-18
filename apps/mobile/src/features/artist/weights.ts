/**
 * De una selección ordenada de estilos a pesos que suman 1.
 *
 * La base exige que los pesos de una pieza sumen 1 ± 0,001, y ese número es lo
 * que hace explicable el gusto: si una pieza es 0,6 traditional y 0,4 lettering,
 * un me gusta reparte así.
 *
 * Pedirle a alguien que escriba tres decimales que sumen exactamente 1 es
 * pedirle que haga aritmética para poder subir una foto. Acá el artista solo
 * ORDENA: el primero que toca es el que más pesa. Los repartos están fijos y
 * son los mismos siempre, así que dos piezas etiquetadas igual pesan igual.
 *
 * Por qué no un reparto parejo: dos estilos al 50 % dice "esta pieza es tanto
 * una cosa como la otra", que casi nunca es cierto. Una pieza tiene un estilo
 * dominante y algo más.
 */

/** Índice = cantidad de estilos. Cada fila suma exactamente 1. */
const REPARTOS: readonly (readonly number[])[] = [
  [],
  [1],
  [0.6, 0.4],
  [0.5, 0.3, 0.2],
]

export const MAX_STYLES_PER_PIECE = REPARTOS.length - 1

export interface WeightedStyleSlug {
  readonly slug: string
  readonly weight: number
}

export function weightsFor(
  slugsInOrder: readonly string[],
): readonly WeightedStyleSlug[] {
  const reparto = REPARTOS[slugsInOrder.length]
  if (reparto == null) {
    throw new Error(
      `Una pieza lleva entre 1 y ${MAX_STYLES_PER_PIECE} estilos, no ${slugsInOrder.length}`,
    )
  }
  return slugsInOrder.map((slug, index) => ({
    slug,
    weight: reparto[index] as number,
  }))
}
