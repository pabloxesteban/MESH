/**
 * Versión de preview de `gps.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El export estático no tiene GPS real (y el visor sandboxeado del preview
 * tampoco deja pedirle permiso al navegador): "tocar el botón" siempre
 * concede y devuelve una posición fija de ejemplo.
 */

import type { GeoCoordinates } from '@mesh/domain'

import { previewStudioGpsReading } from '../../../preview/store.ts'

export interface GpsReading {
  readonly granted: boolean
  readonly coordinates: GeoCoordinates | null
}

export async function readDeviceGps(): Promise<GpsReading> {
  return { granted: true, coordinates: previewStudioGpsReading() }
}
