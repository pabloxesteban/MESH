import * as SecureStore from 'expo-secure-store'

import { secureStorage } from './secure-storage.ts'

const store = (SecureStore as unknown as { __store: Map<string, string> })
  .__store

beforeEach(() => {
  store.clear()
  jest.clearAllMocks()
})

/** Una sesión de Supabase real ronda los 3–5 KB. Este es el caso que importa. */
const LARGA = 'x'.repeat(5000)

describe('secureStorage', () => {
  it('guarda y devuelve un valor corto', async () => {
    await secureStorage.setItem('sesion', 'hola')
    expect(await secureStorage.getItem('sesion')).toBe('hola')
  })

  it('parte un valor que supera el límite de SecureStore', async () => {
    // Sin partirlo, `setItemAsync` tira en Android y la sesión no se persiste:
    // la persona vuelve a entrar en cada arranque sin ninguna explicación.
    await secureStorage.setItem('sesion', LARGA)
    expect(await secureStorage.getItem('sesion')).toBe(LARGA)
  })

  it('nunca escribe un pedazo por encima del límite real', async () => {
    await secureStorage.setItem('sesion', LARGA)
    for (const value of store.values()) {
      expect(value.length).toBeLessThanOrEqual(2048)
    }
  })

  it('devuelve null cuando no hay nada', async () => {
    expect(await secureStorage.getItem('sesion')).toBeNull()
  })

  it('borra todos los pedazos, no solo el manifiesto', async () => {
    await secureStorage.setItem('sesion', LARGA)
    await secureStorage.removeItem('sesion')
    expect(store.size).toBe(0)
    expect(await secureStorage.getItem('sesion')).toBeNull()
  })

  it('limpia los pedazos sobrantes cuando la sesión nueva es más corta', async () => {
    await secureStorage.setItem('sesion', LARGA)
    await secureStorage.setItem('sesion', 'corta')
    expect(await secureStorage.getItem('sesion')).toBe('corta')
    // Manifiesto + un solo pedazo. Sin la limpieza quedarían tres huérfanos en
    // el Keychain para siempre.
    expect(store.size).toBe(2)
  })

  it('trata una sesión truncada como ausente', async () => {
    // Pasa si una escritura se corta a la mitad. Devolver el pedazo que sí está
    // le daría a supabase-js un JSON inválido, y eso es un crash en el arranque.
    await secureStorage.setItem('sesion', LARGA)
    store.delete('sesion.1')
    expect(await secureStorage.getItem('sesion')).toBeNull()
    expect(store.size).toBe(0)
  })

  it('trata un manifiesto corrupto como ausente', async () => {
    store.set('sesion', 'no-es-un-numero')
    expect(await secureStorage.getItem('sesion')).toBeNull()
  })
})
