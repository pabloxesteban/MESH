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
