/**
 * El único lugar donde el estudio lee el GPS del teléfono.
 *
 * Separado de `StudioScreen.tsx` a propósito: es el mismo motivo que separa
 * `queries.ts` de la pantalla en cada feature — así el preview web puede
 * reemplazarlo por una posición fija sin tocar el componente. Ver
 * `apps/mobile/preview/store.ts`.
 *
 * Separado de `features/location/device.ts` porque no es la misma pregunta: ahí
 * se lee dónde está quien busca, acá dónde está el estudio de quien ofrece. El
 * geocoder sí es el mismo y vive en `location/geocode.ts`.
 */

import type { GeoCoordinates } from '@mesh/domain'
import * as Location from 'expo-location'

import { resolveNeighborhood } from '../location/geocode.ts'

export interface GpsReading {
  readonly granted: boolean
  readonly coordinates: GeoCoordinates | null
  /**
   * Barrio de la taxonomía, o `null` si el geocoder no devolvió nada
   * reconocible. Sin barrio el estudio igual se publica: se guardan las
   * coordenadas —que son las que muestran distancia— y el componente de
   * Ubicación del matching se omite, como para cualquier perfil sin barrio.
   */
  readonly neighborhoodSlug: string | null
}

export async function readDeviceGps(): Promise<GpsReading> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    return { granted: false, coordinates: null, neighborhoodSlug: null }
  }

  const position = await Location.getCurrentPositionAsync({})
  const coordinates = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  }
  return {
    granted: true,
    coordinates,
    neighborhoodSlug: await resolveNeighborhood(coordinates),
  }
}
