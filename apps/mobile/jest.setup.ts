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
