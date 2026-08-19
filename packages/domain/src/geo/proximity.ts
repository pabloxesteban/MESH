/**
 * Ordenar gente por cercanía.
 *
 * Vive acá y no en SQL por la misma razón que el motor de gusto: **lo que
 * decide qué se muestra primero se testea sin base y sin simulador.** Un
 * `order by` adentro de un RPC se verifica corriendo Postgres; esto se
 * verifica con una tabla de casos.
 *
 * No es matching y no toca `MATCHING_VERSION`. No hay gusto, no hay puntaje y
 * no hay razones: hay una distancia en kilómetros y un desempate. La regla que
 * lo separa del motor de match es simple — acá nada se pondera.
 *
 * **Lo que hace con quien no tiene ubicación es la decisión que importa.** Un
 * artista sin coordenadas publicadas no se esconde: va después de los que sí
 * las tienen, conservando el orden en que llegó. Esconderlo sería castigar a
 * alguien por no haber compartido su ubicación, y publicarla es voluntario.
 */

import { proximity, type Proximity } from '../taxonomy/locations.ts'

import { haversineKm, type GeoCoordinates } from './distance.ts'

/** Lo mínimo para ordenar. Cualquier cosa con coordenadas opcionales sirve. */
export interface Locatable {
  readonly studioCoordinates: GeoCoordinates | null
}

export interface WithDistance<T> {
  readonly item: T
  /** `null` cuando falta una de las dos puntas. Nunca se estima. */
  readonly distanceKm: number | null
}

/**
 * Ordena por cercanía y anota la distancia.
 *
 * Sin la ubicación de quien mira, devuelve todo en el orden en que llegó y con
 * `distanceKm` en `null`: sin las dos puntas no hay distancia, y mostrar una
 * inventada sería peor que no mostrar ninguna.
 *
 * El orden es estable: dos artistas a la misma distancia —o los dos sin
 * coordenadas— quedan en el orden en que venían, que es la mezcla estable por
 * usuario que hizo la base.
 */
export function sortByProximity<T extends Locatable>(
  items: readonly T[],
  viewer: GeoCoordinates | null,
): readonly WithDistance<T>[] {
  const conDistancia = items.map((item) => ({
    item,
    distanceKm:
      viewer == null || item.studioCoordinates == null
        ? null
        : haversineKm(viewer, item.studioCoordinates),
  }))

  if (viewer == null) return conDistancia

  // `sort` de JS es estable desde ES2019, así que no hace falta llevar el
  // índice original para desempatar.
  return [...conDistancia].sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0
    // Sin coordenadas se va al final, no se esconde.
    if (a.distanceKm == null) return 1
    if (b.distanceKm == null) return -1
    return a.distanceKm - b.distanceKm
  })
}

/**
 * Lo mínimo para ordenar por barrio: el barrio declarado, si lo hay.
 */
export interface Placeable {
  readonly neighborhoodSlug: string | null
}

/**
 * Qué tan cerca está cada nivel de la taxonomía, para ordenar.
 *
 * No son puntajes ni pesos: son un orden. La diferencia importa — un puntaje
 * se pondera con otros y esto no se pondera con nada. Ver `proximity()` en
 * taxonomy/locations.ts, que es quien decide en qué nivel cae cada par.
 */
const RANK: Record<Proximity, number> = {
  same: 0,
  group: 1,
  city: 2,
  metro: 3,
  far: 4,
  // Quien no declaró barrio va último, igual que quien no declaró coordenadas.
  // Último no es escondido.
  unknown: 5,
}

/**
 * Ordena por cercanía **de barrio**, cuando no hay coordenadas.
 *
 * Es lo que se usa cuando la persona eligió un barrio a mano en vez de dar su
 * ubicación real. La diferencia con `sortByProximity` no es de precisión: es
 * que acá **no hay distancia que mostrar**. Los barrios de la taxonomía no
 * tienen coordenadas, y el centro de Palermo tampoco sería donde está la
 * persona. Ordenar sí se puede; decir "a 2 km" sería inventarlo.
 *
 * Estable: dentro del mismo nivel se conserva el orden en que vinieron, que es
 * la mezcla estable por usuario que hizo la base.
 */
export function sortByNeighborhood<T extends Placeable>(
  items: readonly T[],
  viewerSlug: string | null,
): readonly T[] {
  if (viewerSlug == null) return items

  return [...items].sort((a, b) => {
    const left =
      a.neighborhoodSlug == null
        ? RANK.unknown
        : RANK[proximity(viewerSlug, a.neighborhoodSlug)]
    const right =
      b.neighborhoodSlug == null
        ? RANK.unknown
        : RANK[proximity(viewerSlug, b.neighborhoodSlug)]
    return left - right
  })
}
