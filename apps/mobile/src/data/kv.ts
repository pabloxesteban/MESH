/**
 * Almacenamiento clave-valor persistente.
 *
 * **Por qué no MMKV**, que es lo que dice `system-architecture.md` §5: MMKV
 * necesita un dev build, y eso saca a MESH de Expo Go. Mientras la app se pueda
 * abrir escaneando un QR, la iteración con una persona que no es desarrolladora
 * cuesta segundos en vez de una hora de build. `expo-sqlite/kv-store` viene en
 * Expo Go, es asíncrono y alcanza de sobra para lo que guardamos: una cola de
 * interacciones, un vector de gusto y un buffer de analytics.
 *
 * La contrapartida real es que es asíncrono, así que no se puede leer durante el
 * primer render. Eso ya era cierto para todo lo que guardamos: nada de esto
 * bloquea el arranque.
 *
 * Todo pasa por esta interfaz justamente para que cambiar de motor sea este
 * archivo y ninguno más. Ver docs/decisions/ADR-009-almacenamiento-local.md.
 */

import Storage from 'expo-sqlite/kv-store'

export interface KeyValueStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  /** Borra todo lo del namespace. Se usa al cerrar sesión. */
  clearPrefix(prefix: string): Promise<void>
}

export const kv: KeyValueStore = {
  async get(key) {
    return Storage.getItem(key)
  },
  async set(key, value) {
    await Storage.setItem(key, value)
  },
  async remove(key) {
    await Storage.removeItem(key)
  },
  async clearPrefix(prefix) {
    const keys = await Storage.getAllKeys()
    await Promise.all(
      keys
        .filter((key) => key.startsWith(prefix))
        .map((key) => Storage.removeItem(key)),
    )
  },
}

/**
 * Lee y parsea JSON, devolviendo `fallback` ante cualquier problema.
 *
 * "Cualquier problema" incluye JSON corrupto por una escritura cortada. Un caché
 * local ilegible no es un error que valga la pena mostrarle a nadie: se
 * reconstruye. Lo que no puede pasar es que tire y rompa el arranque.
 */
export async function readJson<T>(
  store: KeyValueStore,
  key: string,
  fallback: T,
): Promise<T> {
  try {
    const raw = await store.get(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function writeJson(
  store: KeyValueStore,
  key: string,
  value: unknown,
): Promise<void> {
  await store.set(key, JSON.stringify(value))
}
