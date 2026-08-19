/**
 * Versión de preview de `deviceLocation.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El export estático no tiene GPS: "otorgar el permiso" acá deja una posición
 * fija de ejemplo en vez de leer un sensor.
 */

import type { GeoCoordinates } from '@mesh/domain'

import {
  grantPreviewDeviceLocation,
  previewDeviceCoordinates,
} from '../../../preview/store.ts'

export async function hasDeviceLocationPermission(): Promise<boolean> {
  return previewDeviceCoordinates() != null
}

export async function currentDeviceLocation(): Promise<GeoCoordinates | null> {
  return previewDeviceCoordinates()
}

export async function requestDeviceLocation(): Promise<GeoCoordinates | null> {
  grantPreviewDeviceLocation()
  return previewDeviceCoordinates()
}
