/**
 * Desde dónde se está mirando.
 *
 * Hasta acá MESH ordenaba por cercanía en silencio: tomaba el GPS y no lo
 * decía ni lo dejaba corregir. Eso falla de dos maneras concretas y ninguna se
 * nota — alguien que abre la app en el subte queda con la ubicación de la
 * estación, y alguien que vive en Palermo pero se tatúa cerca del trabajo en
 * Microcentro no tiene forma de decirlo.
 *
 * Ahora hay tres modos, y **la app dice en cuál está**:
 *
 * · **`device`** — el GPS. Ordena por distancia real y muestra los kilómetros.
 * · **`neighborhood`** — un barrio elegido a mano. Ordena por la taxonomía
 *   (mismo barrio, misma comuna, misma ciudad, misma área) y **no muestra
 *   ninguna distancia**: los barrios no tienen coordenadas, y el centro de
 *   Palermo tampoco sería donde está la persona.
 * · **`none`** — sin ubicación. No se ordena por cercanía y se dice.
 *
 * `none` es una opción de primera clase y no un castigo por negar el permiso.
 * Alguien que no quiere compartir dónde está tiene que poder usar la app sin
 * que se lo vuelvan a pedir en cada pantalla.
 *
 * **Es un store de módulo y no estado de un componente.** La primera versión
 * usaba `useState`, y el resultado fue que el encabezado de Inicio y el
 * selector tenían cada uno su copia: elegir un barrio lo guardaba en disco y no
 * llegaba a la lista hasta reiniciar la app. Lo encontró el preview. Con las
 * pestañas montadas todas a la vez, una preferencia que se lee en dos pantallas
 * tiene que ser una sola.
 *
 * **Se guarda local y no en la cuenta.** Es una preferencia del dispositivo:
 * el GPS lo es por definición, y el barrio desde el que mirás depende de dónde
 * estés, no de quién sos. Ver ADR-009 y D-012.
 */

import { useCallback, useSyncExternalStore } from 'react'

import { isKnownLocation } from '@mesh/domain'

import { kv, readJson, writeJson } from '@/data/kv.ts'

export type SearchLocationMode = 'device' | 'neighborhood' | 'none'

export interface SearchLocation {
  readonly mode: SearchLocationMode
  /** El barrio elegido. Solo tiene sentido con `mode: 'neighborhood'`. */
  readonly neighborhoodSlug: string | null
}

/**
 * El default es el GPS.
 *
 * No porque sea lo mejor para todo el mundo, sino porque es lo que la app hacía
 * antes de que esto existiera: estrenar la preferencia no puede cambiarle el
 * orden a nadie sin avisar. Y el GPS sin permiso no hace nada — se comporta
 * como "sin ubicación" hasta que alguien lo conceda, y el encabezado lo dice.
 */
export const DEFAULT_SEARCH_LOCATION: SearchLocation = {
  mode: 'device',
  neighborhoodSlug: null,
}

export const SEARCH_LOCATION_KEY = 'mesh.search-location'

/**
 * Normaliza lo que salga del almacenamiento.
 *
 * Lo guardado puede ser de una versión anterior de la app, o de una taxonomía
 * en la que ese barrio todavía existía. Un slug que ya no está no puede quedar
 * elegido: ordenaría por un lugar que la app no sabe ubicar y nadie entendería
 * por qué.
 */
export function normalizeSearchLocation(value: unknown): SearchLocation {
  if (value == null || typeof value !== 'object') {
    return DEFAULT_SEARCH_LOCATION
  }

  const raw = value as Partial<SearchLocation>

  if (raw.mode === 'none') return { mode: 'none', neighborhoodSlug: null }

  if (raw.mode === 'neighborhood') {
    const slug = raw.neighborhoodSlug
    if (typeof slug === 'string' && isKnownLocation(slug)) {
      return { mode: 'neighborhood', neighborhoodSlug: slug }
    }
    // Barrio desconocido: se cae al default en vez de quedar en un modo que no
    // puede ordenar nada.
    return DEFAULT_SEARCH_LOCATION
  }

  return DEFAULT_SEARCH_LOCATION
}

// --- el store ---------------------------------------------------------------

let current: SearchLocation = DEFAULT_SEARCH_LOCATION
let loading = true
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of [...listeners]) listener()
}

let hydration: Promise<void> | null = null

/**
 * Lee lo guardado, una sola vez para toda la app.
 *
 * Si falla —almacenamiento no disponible, JSON corrupto— se queda con el
 * default y no se reintenta. Una preferencia de orden que no se pudo leer no es
 * un error que valga la pena mostrarle a nadie.
 */
function hydrate(): Promise<void> {
  hydration ??= readJson<unknown>(kv, SEARCH_LOCATION_KEY, null)
    .then((stored) => {
      current = normalizeSearchLocation(stored)
    })
    .catch(() => {
      current = DEFAULT_SEARCH_LOCATION
    })
    .finally(() => {
      loading = false
      emit()
    })
  return hydration
}

export function setSearchLocation(next: SearchLocation): void {
  // Se aplica primero y se guarda después: el orden de la lista no puede
  // esperar a una escritura en disco. Y si la escritura falla, la sesión sigue
  // andando con lo elegido — lo único que se pierde es que sobreviva al cierre.
  current = next
  emit()
  void writeJson(kv, SEARCH_LOCATION_KEY, next).catch(() => undefined)
}

/** Solo para tests: deja el módulo como recién importado. */
export function __resetSearchLocation(): void {
  current = DEFAULT_SEARCH_LOCATION
  loading = true
  hydration = null
  listeners.clear()
}

export interface SearchLocationState {
  readonly value: SearchLocation
  /**
   * `true` hasta que se leyó lo guardado.
   *
   * Importa: mientras se lee no se sabe cómo ordenar, y ordenar con el default
   * para después reordenar haría saltar la lista entera delante de los ojos.
   */
  readonly isLoading: boolean
  readonly set: (next: SearchLocation) => void
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  void hydrate()
  return () => {
    listeners.delete(listener)
  }
}

export function useSearchLocation(): SearchLocationState {
  const value = useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  )
  const isLoading = useSyncExternalStore(
    subscribe,
    () => loading,
    () => loading,
  )

  const set = useCallback((next: SearchLocation) => {
    setSearchLocation(next)
  }, [])

  return { value, isLoading, set }
}
