/**
 * El único lugar donde Matches habla con el GPS del teléfono.
 *
 * Nunca se pide en el arranque de la app ni en silencio: el permiso lo activa
 * la persona con un botón explícito acá, con el mismo criterio que Tinder —
 * mostrás la razón, tocás para activar. `checkPermission` solo lee el estado
 * ya otorgado, para no re-mostrar el prompt en cada visita a la pantalla.
 */

import type { GeoCoordinates } from '@mesh/domain'
import * as Location from 'expo-location'

export async function hasDeviceLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync()
  return status === 'granted'
}

async function readPosition(): Promise<GeoCoordinates> {
  const position = await Location.getCurrentPositionAsync({})
  return { lat: position.coords.latitude, lng: position.coords.longitude }
}

/** `null` si ya no hay permiso otorgado — no vuelve a pedirlo. */
export async function currentDeviceLocation(): Promise<GeoCoordinates | null> {
  const granted = await hasDeviceLocationPermission()
  if (!granted) return null
  return readPosition()
}

/** `null` si la persona no otorgó el permiso. */
export async function requestDeviceLocation(): Promise<GeoCoordinates | null> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') return null
  return readPosition()
}
