/**
 * Estado de la ubicación de quien busca.
 *
 * No decide nada del ranking por sí solo: da las coordenadas para mostrar
 * distancia y filtrar por radio, y el barrio para el componente de ubicación
 * del matching — el mismo dato que antes se elegía a mano de una grilla de 48
 * chips. Ver `packages/domain/src/geo/distance.ts`.
 */

import { useCallback, useEffect, useState } from 'react'

import {
  currentDeviceLocation,
  requestDeviceLocation,
  type DeviceLocation,
} from './device.ts'

export type DeviceLocationStatus =
  | 'checking'
  | 'unrequested'
  | 'granted'
  | 'denied'

export interface DeviceLocationState {
  readonly status: DeviceLocationStatus
  readonly location: DeviceLocation | null
  readonly request: () => void
}

export function useDeviceLocation(): DeviceLocationState {
  const [status, setStatus] = useState<DeviceLocationStatus>('checking')
  const [location, setLocation] = useState<DeviceLocation | null>(null)

  useEffect(() => {
    let cancelled = false
    void currentDeviceLocation().then((result) => {
      if (cancelled) return
      if (result != null) {
        setLocation(result)
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
        setLocation(result)
        setStatus('granted')
      } else {
        setStatus('denied')
      }
    })
  }, [])

  return { status, location, request }
}
