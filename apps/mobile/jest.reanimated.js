/**
 * Mock de Reanimated para Jest.
 *
 * Reanimated 4 corre sobre `react-native-worklets`, que necesita módulos
 * nativos inexistentes en el entorno de test. El paquete provee un resolver
 * (`react-native-worklets/jest/resolver.js`, configurado en package.json) que
 * evita las variantes `.native`; con eso puesto, el mock oficial de Reanimated
 * ya carga.
 *
 * Los tokens de motion NO dependen de nada de esto: son datos puros a
 * propósito, así un test de contraste no arrastra el stack de animaciones. Acá
 * solo se cubren los componentes que efectivamente animan.
 *
 * El comportamiento real de los gestos no se testea acá — se mide en un
 * dispositivo. Ver docs/testing/test-strategy.md §7.
 */
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
)
