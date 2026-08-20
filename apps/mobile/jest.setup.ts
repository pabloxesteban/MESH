/**
 * Setup de Jest para @mesh/mobile.
 *
 * Mockea los módulos nativos que los componentes del design system tocan y que
 * no existen en el entorno de test. Cada mock es deliberado: si un componente
 * necesita un mock nuevo, eso vale la pena mirarlo — puede significar que el
 * componente está haciendo más de lo que debería.
 */

// Hápticos: son confirmación de una decisión de la persona, así que los tests
// verifican QUE se disparan, no cómo. Se mockea con jest.fn() para poder
// afirmarlo.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}))

// SecureStore: se mockea con un Map en memoria para poder verificar que el
// adaptador de sesión parte y recompone valores largos correctamente. El
// mock respeta el límite real de 2048 bytes por valor, que es exactamente el
// comportamiento que el adaptador existe para sortear.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>()
  return {
    __store: store,
    SECURE_STORE_VALUE_LIMIT: 2048,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      if (value.length > 2048) {
        throw new Error('SecureStore: value too large')
      }
      store.set(key, value)
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key)
    }),
  }
})

// Las dos variables son publicables por diseño; acá solo hacen falta para que
// `data/supabase.ts` no falle al importarse. No apuntan a nada real.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321'
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-de-test'

// Safe area: en el simulador de test no hay pantalla, así que no hay muescas.
// Se devuelven ceros para que las pantallas puedan usar `useSafeAreaInsets()`
// sin que cada test tenga que envolverse en un provider.
jest.mock('react-native-safe-area-context', () => {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    SafeAreaView: ({ children }: { children: unknown }) => children,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  }
})

// El almacenamiento clave-valor está respaldado por SQLite, que es nativo. Se
// mockea con un Map: lo que los tests verifican es el comportamiento de la cola
// —no perder eventos, no duplicar filas, tolerar JSON corrupto—, no que SQLite
// funcione. Ver ADR-009.
jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>()
  return {
    __esModule: true,
    default: {
      getItem: async (key: string) => store.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: async (key: string) => {
        store.delete(key)
      },
      getAllKeys: async () => [...store.keys()],
    },
  }
})

// `makeRedirectUri()` necesita el manifiesto de expo-constants para saber el
// esquema, y en jest no hay app.json montado. Devuelve la forma REAL de Expo Go
// —`exp://` con la IP de LAN del bundler— y no `mesh://`, para que ningún test
// se apoye sin querer en el esquema del build propio: el enlace de
// recuperación tiene que andar en los dos.
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'exp://192.168.0.10:8081/--/auth/callback'),
}))

// Portapapeles: se verifica QUE se copie el mensaje, no que el sistema lo
// guarde. Mock explícito para poder afirmar el contenido.
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
}))
