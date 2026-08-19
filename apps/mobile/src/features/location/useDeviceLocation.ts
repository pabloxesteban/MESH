/**
 * El permiso de ubicación del sistema y lo que devuelve.
 *
 * No decide nada por sí solo: da coordenadas y, cuando el sistema lo resuelve,
 * un barrio. Qué se hace con eso lo decide `useSearchLocation`, que es donde
 * vive la preferencia de **desde dónde** se mira — el GPS es uno de los tres
 * modos, no el único. Ver D-012.
 *
 * Tener el permiso no significa estar en modo GPS, y estar en modo GPS no
 * significa tener el permiso. Son dos cosas y la pantalla las distingue.
 */

import { useCallback, useEffect, useState } from 'react'

import {
  currentDeviceLocation,
  requestDeviceLocation,
  type DeviceLocation,
} from './device.ts'

export type DeviceLocationStatus =
  'checking' | 'unrequested' | 'granted' | 'denied'

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
