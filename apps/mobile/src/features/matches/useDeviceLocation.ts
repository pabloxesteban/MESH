/**
 * Estado de la ubicación de quien busca, para esta pantalla.
 *
 * No decide nada del matching: es puramente para mostrar una distancia
 * encima de un resultado que el motor de match ya ordenó por barrio. Ver
 * `packages/domain/src/geo/distance.ts`.
 */

import { useCallback, useEffect, useState } from 'react'
import type { GeoCoordinates } from '@mesh/domain'

import {
  currentDeviceLocation,
  requestDeviceLocation,
} from './deviceLocation.ts'

export type DeviceLocationStatus = 'checking' | 'unrequested' | 'granted' | 'denied'

export interface DeviceLocationState {
  readonly status: DeviceLocationStatus
  readonly coordinates: GeoCoordinates | null
  readonly request: () => void
}

export function useDeviceLocation(): DeviceLocationState {
  const [status, setStatus] = useState<DeviceLocationStatus>('checking')
  const [coordinates, setCoordinates] = useState<GeoCoordinates | null>(null)

  useEffect(() => {
    let cancelled = false
    void currentDeviceLocation().then((result) => {
      if (cancelled) return
      if (result != null) {
        setCoordinates(result)
        setStatus('granted')
      } else {
        setStatus('unrequested')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const request = useCallback(() => {
    void requestDeviceLocation().then((result) => {
      if (result != null) {
        setCoordinates(result)
        setStatus('granted')
      } else {
        setStatus('denied')
      }
    })
  }, [])

  return { status, coordinates, request }
}
