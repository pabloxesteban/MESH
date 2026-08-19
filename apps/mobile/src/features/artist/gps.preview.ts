/**
 * Versión de preview de `gps.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El export estático no tiene GPS real (y el visor sandboxeado del preview
 * tampoco deja pedirle permiso al navegador): "tocar el botón" siempre
 * concede y devuelve una posición fija de ejemplo, con su barrio ya resuelto.
 */

import type { GeoCoordinates } from '@mesh/domain'

import { previewStudioGpsReading } from '../../../preview/store.ts'

export interface GpsReading {
  readonly granted: boolean
  readonly coordinates: GeoCoordinates | null
  readonly neighborhoodSlug: string | null
}

/** El barrio del punto fijo de `previewStudioGpsReading`. */
const PREVIEW_NEIGHBORHOOD = 'san-telmo'

export async function readDeviceGps(): Promise<GpsReading> {
  return {
    granted: true,
    coordinates: previewStudioGpsReading(),
    neighborhoodSlug: PREVIEW_NEIGHBORHOOD,
  }
}
