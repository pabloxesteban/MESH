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
 */

import * as SecureStore from 'expo-secure-store'

/** Margen sobre el límite real de 2048 para que la clave y el encoding entren. */
const CHUNK_SIZE = 1800

function chunkKey(key: string, index: number): string {
  return `${key}.${index}`
}

async function clearChunks(key: string, count: number): Promise<void> {
  const deletions: Promise<void>[] = []
  for (let index = 0; index < count; index += 1) {
    deletions.push(SecureStore.deleteItemAsync(chunkKey(key, index)))
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
  const manifest = await SecureStore.getItemAsync(key)
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
        SecureStore.getItemAsync(chunkKey(key, index)),
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
        SecureStore.setItemAsync(chunkKey(key, index), part),
      ),
    )
    await SecureStore.setItemAsync(key, String(parts.length))

    // Si la sesión nueva ocupa menos pedazos que la anterior, los sobrantes
    // quedarían en el Keychain para siempre.
    if (previous > parts.length) {
      const stale: Promise<void>[] = []
      for (let index = parts.length; index < previous; index += 1) {
        stale.push(SecureStore.deleteItemAsync(chunkKey(key, index)))
      }
      await Promise.all(stale)
    }
  },

  async removeItem(key: string): Promise<void> {
    const count = await readChunkCount(key)
    await clearChunks(key, Math.max(count, 1))
    await SecureStore.deleteItemAsync(key)
  },
}
