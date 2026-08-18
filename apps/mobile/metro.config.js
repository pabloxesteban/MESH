/**
 * Metro para @mesh/mobile.
 *
 * Solo dos cosas, las dos necesarias:
 *
 * 1. `.wasm` como asset. `expo-sqlite` en web carga wa-sqlite desde un módulo
 *    WebAssembly, y sin esto el bundle web falla con "Unable to resolve module
 *    ./wa-sqlite/wa-sqlite.wasm". El bundle nativo no lo necesita, así que el
 *    error solo aparece al exportar para web — que es justo como se comparte un
 *    preview con alguien.
 * 2. La raíz del monorepo como `watchFolder`, para que Metro siga los cambios
 *    de `packages/domain` sin reiniciar.
 */
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.resolver.assetExts = [...config.resolver.assetExts, 'wasm']
config.watchFolders = [workspaceRoot]

module.exports = config
