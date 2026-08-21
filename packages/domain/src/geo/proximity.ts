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
 *
 * **Y no ordena por distancia exacta, sino por anillo.** Es la decisión del
 * 2026-08-21. Ordenar por el kilómetro exacto le da a un artista el primer
 * puesto para siempre por estar cien metros más cerca que el segundo —una
 * diferencia que nadie vive— y en un catálogo chico eso es la diferencia entre
 * conseguir trabajo y no conseguirlo. Con anillos, quienes están igual de
 * lejos en la práctica quedan empatados, y adentro del empate manda la mezcla
 * que trajo la base, que ahora se rehace en cada sesión.
 *
 * Los anillos son los que usa cualquiera para pensar una ciudad: acá nomás,
 * cerca, un viaje, lejos. No son puntajes: son un orden, igual que `RANK` de
 * más abajo.
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
 * Los cortes de los anillos, en kilómetros.
 *
 * Cuatro cortes, cinco anillos. En CABA: 2 km es el barrio y el de al lado,
 * 5 km es media ciudad en subte, 10 km cubre la ciudad entera, 20 km alcanza
 * al conurbano cercano, y de ahí para arriba es un viaje que se planea.
 *
 * No se ordena por el número que muestra la tarjeta —`roundDistanceKm` redondea
 * a 100 metros abajo de 10 km— porque a esa resolución no empata casi nadie y
 * el orden vuelve a quedar clavado.
 */
export const DISTANCE_BANDS_KM: readonly number[] = [2, 5, 10, 20]

/** En qué anillo cae una distancia. Más chico es más cerca. */
export function distanceBand(km: number): number {
  const corte = DISTANCE_BANDS_KM.findIndex((limite) => km <= limite)
  return corte === -1 ? DISTANCE_BANDS_KM.length : corte
}

/**
 * Ordena por cercanía y anota la distancia.
 *
 * Sin la ubicación de quien mira, devuelve todo en el orden en que llegó y con
 * `distanceKm` en `null`: sin las dos puntas no hay distancia, y mostrar una
 * inventada sería peor que no mostrar ninguna.
 *
 * El orden es estable: dos artistas del mismo anillo —o los dos sin
 * coordenadas— quedan en el orden en que venían, que es la mezcla que hizo la
 * base para esta sesión. Ahí es donde vive el azar.
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
  // índice original para desempatar: el empate conserva la mezcla de la base.
  return [...conDistancia].sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0
    // Sin coordenadas se va al final, no se esconde.
    if (a.distanceKm == null) return 1
    if (b.distanceKm == null) return -1
    return distanceBand(a.distanceKm) - distanceBand(b.distanceKm)
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
