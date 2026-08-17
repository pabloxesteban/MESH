/**
 * Babel para @mesh/mobile.
 *
 * `react-native-worklets/plugin` es lo que convierte las funciones marcadas
 * como worklet en código que corre en el hilo de UI. Sin esto, los gestos del
 * mazo pasarían por el hilo de JS y perderíamos los 60fps sostenidos que pide
 * el presupuesto de performance.
 *
 * Tiene que ser el último plugin de la lista.
 */
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    plugins: ['react-native-worklets/plugin'],
  }
}
