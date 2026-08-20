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
 * 3. Con MESH_PREVIEW=1, cada `queries.ts` de feature se resuelve a su
 *    `queries.preview.ts`. Es el único cambio que necesita el preview web para
 *    correr sin backend: las pantallas, los componentes y los motores de gusto
 *    y matching son exactamente los mismos. Ver apps/mobile/preview/store.ts.
 */
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.resolver.assetExts = [...config.resolver.assetExts, 'wasm']
config.watchFolders = [workspaceRoot]

if (process.env.MESH_PREVIEW === '1') {
  /**
   * Los módulos que hablan con Supabase, y que en el preview se reemplazan por
   * su hermano `.preview.ts`.
   *
   * Se listan por RUTA RESUELTA y no por el texto del import: media docena de
   * features importan `'./queries.ts'`, así que reescribir por el especificador
   * arrastraría también a proyectos y a auth, que no tienen versión de preview.
   * El swap se hace después de resolver, cuando ya se sabe qué archivo es.
   */
  const PREVIEW_TARGETS = new Set(
    [
      'src/features/account/queries.ts',
      'src/features/chat/queries.ts',
      'src/features/demand/queries.ts',
      'src/features/demand/interests.ts',
      'src/features/discovery/queries.ts',
      'src/features/discovery/interactions.ts',
      'src/features/location/device.ts',
      'src/features/profile/queries.ts',
      'src/features/settings/queries.ts',
      'src/features/artist/queries.ts',
      'src/features/artists/queries.ts',
      'src/features/artist/upload.ts',
      'src/features/artist/gps.ts',
      'src/features/projects/queries.ts',
      'src/features/projects/upload.ts',
      'src/features/quick-search/classify.ts',
      'src/features/saved/queries.ts',
      'src/features/saved/ranking.ts',
      'src/features/scheduling/queries.ts',
      'src/features/reviews/queries.ts',
      'src/features/reviews/upload.ts',
    ].map((relative) => path.join(projectRoot, relative)),
  )

  const defaultResolver = config.resolver.resolveRequest

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolve = defaultResolver ?? context.resolveRequest
    const resolved = resolve(context, moduleName, platform)

    if (resolved?.type !== 'sourceFile') return resolved
    if (!PREVIEW_TARGETS.has(resolved.filePath)) return resolved

    return {
      ...resolved,
      filePath: resolved.filePath.replace(/\.ts$/, '.preview.ts'),
    }
  }
}

module.exports = config
