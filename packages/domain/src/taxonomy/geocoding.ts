/**
 * Traduce el nombre que devuelve un geocoder a un barrio de la taxonomía.
 *
 * El problema que resuelve: la app ya no le pide el barrio a nadie — lo saca
 * del GPS. Pero el motor de matching puntúa por barrio, no por coordenadas
 * (ver `docs/product/matching.md` §4.1), así que hace falta el paso de
 * coordenadas → nombre → slug.
 *
 * El primer tramo lo hace el sistema operativo (`expo-location`), que tiene un
 * geocoder de verdad. Este archivo hace el segundo: machear ese nombre contra
 * los barrios que efectivamente existen en MESH.
 *
 * **Nunca adivina.** Si el nombre no coincide con ninguno conocido, devuelve
 * `null` y el componente de ubicación se omite — que es exactamente lo que ya
 * pasaba cuando alguien no elegía barrio. Un barrio equivocado sería peor que
 * ninguno: haría subir en el ranking a artistas que quedan lejos.
 */

import { LOCATIONS, type LocationDefinition } from './locations.ts'

/**
 * Minúsculas, sin acentos, sin puntuación, con espacios colapsados.
 *
 * `Villa Devoto` y `villa devoto` son el mismo barrio; `Nuñez` y `Núñez`
 * también — el geocoder de iOS y el de Android no coinciden en los acentos.
 */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Resuelve un barrio conocido a partir de los nombres que dio el geocoder.
 *
 * Se le pasan varios candidatos porque cada plataforma pone el barrio en un
 * campo distinto: en iOS suele venir en `subLocality`, en Android en
 * `subAdminArea` o `district`. Se prueban en orden y gana el primero que
 * coincida — probar todos y elegir "el mejor" sería inventar un criterio.
 *
 * Solo busca dentro de `citySlug`: si el geocoder devuelve "Belgrano" y
 * estamos resolviendo barrios de CABA, tiene que ser el de CABA.
 */
export function matchNeighborhood(
  candidates: readonly (string | null | undefined)[],
  citySlug: string,
): LocationDefinition | null {
  const neighborhoods = LOCATIONS.filter(
    (location) => location.parentSlug === citySlug,
  )

  for (const candidate of candidates) {
    if (candidate == null || candidate.trim() === '') continue
    const needle = normalize(candidate)

    const found = neighborhoods.find(
      (location) =>
        normalize(location.neighborhood ?? '') === needle ||
        normalize(location.slug) === needle,
    )
    if (found != null) return found
  }

  return null
}
