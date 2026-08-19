/**
 * Distancia real entre dos coordenadas GPS. Fórmula de haversine —
 * asume la Tierra como esfera, error < 0,5% a la escala de una ciudad.
 *
 * Deliberadamente separado de `taxonomy/locations.ts`: esa unidad (barrio /
 * comuna) sigue siendo la que alimenta el matching, porque es verificable
 * para las 8-15 ubicaciones curadas del catálogo. Esto es otra cosa —
 * coordenadas reales que dos personas dieron activamente, cada una con su
 * propio consentimiento— y es *display-only*: nunca entra al puntaje ni al
 * orden de resultados. Ver `docs/product/matching.md` §4.1 y la migración
 * `20260818000400_studio_location.sql`.
 */

export interface GeoCoordinates {
  readonly lat: number
  readonly lng: number
}

const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Distancia en línea recta entre dos puntos, en kilómetros. Siempre ≥ 0. */
export function haversineKm(a: GeoCoordinates, b: GeoCoordinates): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * Redondea una distancia para mostrar, sin fingir una precisión que el GPS de
 * un teléfono no tiene. Un decimal por debajo de 10 km, entero arriba —
 * mostrar "3,2 km" tiene sentido, "14,7 km" no aporta nada sobre "15 km" y
 * sugiere una exactitud que no existe.
 */
export function roundDistanceKm(km: number): number {
  return km < 10 ? Math.round(km * 10) / 10 : Math.round(km)
}
