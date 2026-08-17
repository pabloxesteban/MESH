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
 */
export function assertNoFixturesInProduction(
  target: string,
  fixtureSlugs: readonly string[],
): void {
  if (target !== 'production') return
  if (fixtureSlugs.length === 0) return

  throw new Error(
    `La carga a producción encontró ${fixtureSlugs.length} artista(s) fixture: ` +
      `${fixtureSlugs.join(', ')}. Los fixtures nunca llegan a producción. ` +
      `Ver docs/product/content-policy.md §4.`,
  )
}
