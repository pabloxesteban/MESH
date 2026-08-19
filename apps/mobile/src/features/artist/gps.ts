/**
 * El único lugar donde el estudio lee el GPS del teléfono.
 *
 * Separado de `StudioScreen.tsx` a propósito: es el mismo motivo que separa
 * `queries.ts` de la pantalla en cada feature — así el preview web puede
 * reemplazarlo por una posición fija sin tocar el componente. Ver
 * `apps/mobile/preview/store.ts`.
 */

import type { GeoCoordinates } from '@mesh/domain'
import * as Location from 'expo-location'

export interface GpsReading {
  readonly granted: boolean
  readonly coordinates: GeoCoordinates | null
}

export async function readDeviceGps(): Promise<GpsReading> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') return { granted: false, coordinates: null }

  const position = await Location.getCurrentPositionAsync({})
  return {
    granted: true,
    coordinates: {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    },
  }
}
