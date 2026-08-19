/**
 * Coordenadas → barrio de la taxonomía, con el geocoder del sistema operativo.
 *
 * El geocoder es del SO y no nuestro a propósito: no tenemos coordenadas de
 * barrio verificadas (`locations.lat`/`lng` sigue vacía, ver ADR-010), así que
 * cualquier cálculo propio sería una estimación inventada. iOS y Android ponen
 * el barrio en campos distintos, por eso se prueban varios.
 *
 * Vive afuera de `device.ts` porque lo usan dos lados que el preview reemplaza
 * por separado: la ubicación de quien busca (`device.ts`) y la del estudio de
 * un artista (`features/artist/gps.ts`). Este módulo no se reemplaza —en el
 * preview simplemente no lo importa nadie.
 */

import { matchNeighborhood, type GeoCoordinates } from '@mesh/domain'
import * as Location from 'expo-location'

/** `null` cuando el geocoder no devolvió nada reconocible. Nunca adivina. */
export async function resolveNeighborhood(
  coordinates: GeoCoordinates,
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    })
    const first = results[0]
    if (first == null) return null

    return (
      matchNeighborhood(
        [first.district, first.subregion, first.city, first.name],
        'caba',
      )?.slug ?? null
    )
  } catch {
    // Un geocoder que falla no rompe nada: se sigue sin barrio, con el
    // componente de ubicación del matching omitido.
    return null
  }
}
