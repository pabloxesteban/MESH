/**
 * Si ya se preguntó por la ubicación.
 *
 * Existe por una decisión del 2026-08-21: **la ubicación se pregunta una sola
 * vez, al arrancar**, como en cualquier app que usa GPS. Hasta acá MESH no
 * preguntaba nunca de frente: dejaba la preferencia en "mi ubicación" sin
 * permiso, y en Inicio aparecía un cartel pidiéndolo. El cartel volvía en cada
 * sesión hasta que alguien lo concedía, que es exactamente el goteo que la
 * gente aprende a ignorar.
 *
 * Ahora se pregunta una vez, con el contexto delante, y **la respuesta se
 * respeta**: dijiste que no, no se vuelve a preguntar nunca. Cambiar de idea
 * sigue siendo posible desde el encabezado de Inicio, que es donde ya se decía
 * desde dónde se está midiendo.
 *
 * Se guarda local y no en la cuenta, por lo mismo que la preferencia de
 * ubicación: el permiso del sistema es de este teléfono. Ver D-012 y ADR-030.
 */

import { useCallback, useSyncExternalStore } from 'react'

import { kv, readJson, writeJson } from '@/data/kv.ts'

export const LOCATION_ASKED_KEY = 'mesh.location-asked'

let asked = false
let loading = true
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of [...listeners]) listener()
}

let hydration: Promise<void> | null = null

function hydrate(): Promise<void> {
  hydration ??= readJson<unknown>(kv, LOCATION_ASKED_KEY, null)
    .then((stored) => {
      asked = stored === true
    })
    .catch(() => {
      // Si no se pudo leer, se asume que ya se preguntó. Preferir el falso
      // positivo es deliberado: equivocarse hacia "ya preguntamos" cuesta que
      // alguien tenga que ir al encabezado a prenderlo; equivocarse hacia el
      // otro lado es volver a interrumpir a alguien que ya dijo que no.
      asked = true
    })
    .finally(() => {
      loading = false
      emit()
    })
  return hydration
}

export function markLocationAsked(): void {
  asked = true
  emit()
  void writeJson(kv, LOCATION_ASKED_KEY, true).catch(() => undefined)
}

/**
 * Solo para tests: deja el módulo **y lo guardado** como recién instalado.
 *
 * Borra la clave además de la memoria. Sin eso, un test que responde la
 * pregunta se la deja contestada al siguiente: el reset limpia el módulo pero
 * la próxima hidratación vuelve a leer de disco lo que escribió el anterior.
 */
export function __resetLocationAsked(): void {
  asked = false
  loading = true
  hydration = null
  listeners.clear()
  void kv.remove(LOCATION_ASKED_KEY).catch(() => undefined)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  void hydrate()
  return () => {
    listeners.delete(listener)
  }
}

export interface LocationAskedState {
  readonly asked: boolean
  readonly isLoading: boolean
  readonly markAsked: () => void
}

export function useLocationAsked(): LocationAskedState {
  const value = useSyncExternalStore(
    subscribe,
    () => asked,
    () => asked,
  )
  const isLoading = useSyncExternalStore(
    subscribe,
    () => loading,
    () => loading,
  )
  const markAsked = useCallback(() => {
    markLocationAsked()
  }, [])

  return { asked: value, isLoading, markAsked }
}
