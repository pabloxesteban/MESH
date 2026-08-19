/**
 * El único lugar donde MESH habla con el GPS del teléfono.
 *
 * Nunca se pide en el arranque de la app ni en silencio: el permiso lo activa
 * la persona con un botón explícito, con el mismo criterio que Tinder —
 * mostrás la razón, tocás para activar. `hasDeviceLocationPermission` solo lee
 * el estado ya otorgado, para no re-mostrar el prompt en cada visita.
 *
 * Lo usan tres features: Matches (distancia real), Búsqueda (barrio
 * automático) y Perfil (radio de alcance). Vive acá y no adentro de ninguna
 * de las tres porque ninguna es más dueña que las otras.
 */

import { matchNeighborhood, type GeoCoordinates } from '@mesh/domain'
import * as Location from 'expo-location'

export interface DeviceLocation {
  readonly coordinates: GeoCoordinates
  /**
   * Barrio de la taxonomía, resuelto por el geocoder del sistema.
   *
   * `null` cuando el geocoder no devolvió nada reconocible — la persona está
   * fuera de CABA, o el nombre no coincide con ningún barrio nuestro. Nunca
   * se adivina: sin barrio, el componente de ubicación del matching se omite,
   * que es lo mismo que pasaba cuando había que elegirlo a mano y no se
   * elegía.
   */
  readonly neighborhoodSlug: string | null
}

export async function hasDeviceLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync()
  return status === 'granted'
}

/**
 * Coordenadas → barrio, con el geocoder del sistema operativo.
 *
 * El geocoder es del SO y no nuestro a propósito: no tenemos coordenadas de
 * barrio verificadas (`locations.lat`/`lng` sigue vacía, ver ADR-010), así que
 * cualquier cálculo propio sería una estimación inventada. iOS y Android
 * ponen el barrio en campos distintos, por eso se prueban varios.
 */
async function resolveNeighborhood(
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
    // Un geocoder que falla no rompe la búsqueda: se sigue sin barrio, con el
    // componente de ubicación omitido.
    return null
  }
}

async function read(): Promise<DeviceLocation> {
  const position = await Location.getCurrentPositionAsync({})
  const coordinates = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  }
  return {
    coordinates,
    neighborhoodSlug: await resolveNeighborhood(coordinates),
  }
}

/** `null` si ya no hay permiso otorgado — no vuelve a pedirlo. */
export async function currentDeviceLocation(): Promise<DeviceLocation | null> {
  const granted = await hasDeviceLocationPermission()
  if (!granted) return null
  return read()
}

/** `null` si la persona no otorgó el permiso. */
export async function requestDeviceLocation(): Promise<DeviceLocation | null> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') return null
  return read()
}
