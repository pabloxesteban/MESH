/**
 * Versión de preview de `device.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El export estático no tiene GPS ni geocoder: "otorgar el permiso" deja una
 * posición fija de ejemplo (Palermo) con su barrio ya resuelto.
 */

import {
  grantPreviewDeviceLocation,
  previewDeviceCoordinates,
} from '../../../preview/store.ts'
import type { DeviceLocation } from './device.ts'

const PREVIEW_NEIGHBORHOOD = 'palermo'

function current(): DeviceLocation | null {
  const coordinates = previewDeviceCoordinates()
  if (coordinates == null) return null
  return { coordinates, neighborhoodSlug: PREVIEW_NEIGHBORHOOD }
}

export async function hasDeviceLocationPermission(): Promise<boolean> {
  return previewDeviceCoordinates() != null
}

export async function currentDeviceLocation(): Promise<DeviceLocation | null> {
  return current()
}

export async function requestDeviceLocation(): Promise<DeviceLocation | null> {
  grantPreviewDeviceLocation()
  return current()
}
