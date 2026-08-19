/**
 * Guard de la service-role key.
 *
 * Esta herramienta es el único lugar del repositorio donde existe la
 * service-role key. Esa clave saltea RLS por completo: si se filtra, el radio de
 * explosión es total. Ver docs/security/security-model.md §7 y
 * docs/security/threat-model.md §T5.
 */

/**
 * Se niega a seguir si detectamos que estamos corriendo dentro de un bundler de
 * la app. Es defensa en profundidad: el lint y la estructura de workspaces ya
 * deberían impedirlo, pero una clave que saltea RLS merece más de una barrera.
 */
export function assertNotBundled(): void {
  const bundlerMarkers = [
    'EXPO_OS',
    'EXPO_BASE_URL',
    'REACT_NATIVE_PATH',
    '__METRO_GLOBAL_PREFIX__',
  ]

  const found = bundlerMarkers.filter((marker) => marker in process.env)
  if (found.length > 0) {
    throw new Error(
      `@mesh/seed detectó un contexto de Metro/Expo (${found.join(', ')}). ` +
        `Esta herramienta usa la service-role key y nunca puede correr dentro ` +
        `de la app. Ver docs/security/security-model.md §7.`,
    )
  }
}

/**
 * Lee la service-role key del entorno. Nunca la loguea, nunca la devuelve en un
 * mensaje de error.
 */
export function readServiceRoleKey(): string {
  assertNotBundled()

  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (key == null || key.length === 0) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY. Copiá tools/seed/.env.example a ' +
        'tools/seed/.env.local y completala. Ese archivo está en .gitignore y ' +
        'nunca se commitea.',
    )
  }
  return key
}

/**
 * En producción no se carga ni una sola fila fixture.
 *
 * Los fixtures existen para poder construir la app antes de que llegue el
 * contenido real, pero una persona real nunca puede ver uno y confundirlo con un
 * artista. Ver docs/product/content-policy.md §4.
 *
 * **Se saltean, no abortan la corrida.** La primera versión tiraba un error
 * ante el primer fixture, y eso volvía el camino de producción inusable: el
 * repositorio tiene diez fixtures y van a seguir ahí —son con lo que se
 * construye la app—, así que cargar a la primera artista real habría exigido
 * borrarlos del repo. Lo comprobé corriéndolo.
 *
 * Saltear conserva exactamente la garantía que importa: **ninguna fila fixture
 * llega a producción.** Lo que se pierde es el aviso a gritos, y por eso el
 * llamador tiene que nombrar en pantalla a cada uno de los salteados — igual
 * que ya hace con los borradores. Un fixture salteado en silencio sería el
 * defecto que este cambio podría introducir.
 */
export function partitionFixtures<T extends { readonly slug: string }>(
  target: string,
  bundles: readonly T[],
  isFixture: (bundle: T) => boolean,
): { loadable: readonly T[]; skipped: readonly T[] } {
  if (target !== 'production') return { loadable: bundles, skipped: [] }

  return {
    loadable: bundles.filter((bundle) => !isFixture(bundle)),
    skipped: bundles.filter((bundle) => isFixture(bundle)),
  }
}

/**
 * Acota la corrida a los artistas que se nombraron.
 *
 * Existe por un defecto que solo aparece con contenido real: `--publish`
 * publicaba **todo lo de la corrida**, así que alguien despublicado a mano
 * —porque pidió salir unos días, o mientras se corrige algo— volvía a aparecer
 * en la siguiente carga. En un producto que se sostiene sobre consentimiento,
 * eso no es un detalle de ergonomía.
 *
 * Un slug que no existe **falla duro y no carga nada**. Un typo que carga en
 * silencio a nadie es peor que un error: parece que funcionó.
 */
export function selectSlugs<T extends { readonly slug: string }>(
  bundles: readonly T[],
  only: readonly string[],
  known: readonly string[],
): readonly T[] {
  if (only.length === 0) return bundles

  const desconocidos = only.filter((slug) => !known.includes(slug))
  if (desconocidos.length > 0) {
    throw new Error(
      `--only nombró ${desconocidos.length} artista(s) que no están en ` +
        `content/artists/: ${desconocidos.join(', ')}. No se cargó nada.`,
    )
  }

  return bundles.filter((bundle) => only.includes(bundle.slug))
}
