/**
 * Adaptador de almacenamiento de supabase-js sobre `expo-secure-store`.
 *
 * Por qué SecureStore y no AsyncStorage ni MMKV: lo que se guarda acá es un
 * refresh token. En AsyncStorage vive en texto plano en el sandbox de la app;
 * en SecureStore vive en el Keychain de iOS o el Keystore de Android. En un
 * teléfono con root o jailbreak, la diferencia es entre "leíble" y "no".
 *
 * **El detalle que hace falta:** SecureStore rechaza valores de más de 2048
 * bytes en Android, y una sesión de Supabase con un JWT largo los pasa. La
 * solución no es volver a AsyncStorage —eso es cambiar seguridad por
 * comodidad—, sino partir el valor en pedazos. Este adaptador guarda
 * `{key}` con la cantidad de pedazos y `{key}.0`, `{key}.1`, … con el
 * contenido.
 *
 * ## Web
 *
 * En el navegador **no existe SecureStore**, porque no existe el Keychain. El
 * módulo tira `getValueWithKeyAsync is not a function` y la sesión nunca
 * arranca: la app queda en la pantalla de carga para siempre. Ahí se usa
 * `localStorage`, que es lo mismo que usa supabase-js por defecto en web.
 *
 * Eso NO es una degradación de seguridad que estemos aceptando en producción:
 * el build web de MESH es una herramienta de preview y de captura, no una
 * superficie que se publique. Si algún día se publicara, esta decisión hay que
 * revisarla — un token en `localStorage` es legible por cualquier script que
 * corra en la página. Ver docs/security/security-model.md §2.
 */

import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/** Margen sobre el límite real de 2048 para que la clave y el encoding entren. */
const CHUNK_SIZE = 1800

function chunkKey(key: string, index: number): string {
  return `${key}.${index}`
}

/**
 * El almacén subyacente.
 *
 * En web es `localStorage`; en nativo, el Keychain / Keystore. La partición en
 * pedazos se aplica igual en los dos: `localStorage` no la necesita, pero
 * mantener un solo camino evita que el formato guardado dependa de la
 * plataforma —y con eso, que una sesión escrita en una no se pueda leer en la
 * otra al depurar.
 */
const store =
  Platform.OS === 'web'
    ? {
        async getItemAsync(key: string): Promise<string | null> {
          return globalThis.localStorage?.getItem(key) ?? null
        },
        async setItemAsync(key: string, value: string): Promise<void> {
          globalThis.localStorage?.setItem(key, value)
        },
        async deleteItemAsync(key: string): Promise<void> {
          globalThis.localStorage?.removeItem(key)
        },
      }
    : SecureStore

async function clearChunks(key: string, count: number): Promise<void> {
  const deletions: Promise<void>[] = []
  for (let index = 0; index < count; index += 1) {
    deletions.push(store.deleteItemAsync(chunkKey(key, index)))
  }
  await Promise.all(deletions)
}

/**
 * Cuántos pedazos hay guardados bajo `key`, o 0.
 *
 * El manifiesto se guarda como un entero en texto. Si está corrupto —lo que
 * pasa si una escritura anterior se cortó a la mitad— se trata como ausente:
 * una sesión ilegible es una sesión que no hay, y forzar a entrar de nuevo es
 * mejor que arrastrar un estado a medias.
 */
async function readChunkCount(key: string): Promise<number> {
  const manifest = await store.getItemAsync(key)
  if (manifest == null) return 0
  const count = Number.parseInt(manifest, 10)
  return Number.isInteger(count) && count > 0 ? count : 0
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await readChunkCount(key)
    if (count === 0) return null

    const parts = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        store.getItemAsync(chunkKey(key, index)),
      ),
    )

    // Un pedazo faltante hace ilegible al conjunto. Se limpia y se devuelve
    // null en vez de entregar una sesión truncada, que supabase-js aceptaría
    // como JSON inválido y convertiría en un crash en el arranque.
    if (parts.some((part) => part == null)) {
      await this.removeItem(key)
      return null
    }

    return parts.join('')
  },

  async setItem(key: string, value: string): Promise<void> {
    const previous = await readChunkCount(key)

    const parts: string[] = []
    for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
      parts.push(value.slice(offset, offset + CHUNK_SIZE))
    }

    await Promise.all(
      parts.map((part, index) =>
        store.setItemAsync(chunkKey(key, index), part),
      ),
    )
    await store.setItemAsync(key, String(parts.length))

    // Si la sesión nueva ocupa menos pedazos que la anterior, los sobrantes
    // quedarían en el Keychain para siempre.
    if (previous > parts.length) {
      const stale: Promise<void>[] = []
      for (let index = parts.length; index < previous; index += 1) {
        stale.push(store.deleteItemAsync(chunkKey(key, index)))
      }
      await Promise.all(stale)
    }
  },

  async removeItem(key: string): Promise<void> {
    const count = await readChunkCount(key)
    await clearChunks(key, Math.max(count, 1))
    await store.deleteItemAsync(key)
  },
}
