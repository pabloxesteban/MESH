/**
 * Entrar con Google.
 *
 * La decisión que gobierna este archivo cabe en una línea y es la misma de
 * [ADR-002](../../../../docs/decisions/ADR-002-authentication.md):
 *
 * > **Con sesión anónima se VINCULA, no se entra.**
 *
 * `linkIdentity()` le agrega la identidad de Google al usuario que ya existe, y
 * el `auth.uid()` no cambia. `signInWithOAuth()` abre una sesión nueva, con un
 * usuario nuevo. La diferencia no se ve en la pantalla y decide si alguien que
 * cargó su perfil de artista desde la app lo conserva al registrarse o lo
 * pierde. Es exactamente la misma razón por la que crear una cuenta con correo
 * usa `updateUser()` y no `signUp()`.
 *
 * **No hay ninguna credencial de Google en la app.** El navegador va a
 * `<supabase>/auth/v1/authorize?provider=google`, y es Supabase quien habla con
 * Google con el `client_id` y el `secret` que viven de su lado. Google nunca ve
 * la URL de MESH: la única que tiene registrada es la de Supabase. Eso también
 * es lo que hace que esto funcione en Expo Go, donde la app vuelve a un
 * `exp://…` que Google jamás aceptaría como redirect.
 *
 * Ver ADR-015 y docs/launch/sso-setup.md.
 */

import * as WebBrowser from 'expo-web-browser'

import type { TranslationKey } from '../../i18n/index.ts'
import { supabase } from '../../data/supabase.ts'

import type { AuthResult } from './queries.ts'
import { redirectUri } from './redirect.ts'

/**
 * Qué hacer según la sesión que hay.
 *
 * Pura y con nombre propio porque es **la** decisión: elegir mal no falla, solo
 * deja los datos de la persona atrás en un usuario que ya nadie va a abrir.
 */
export function oauthAction(isAnonymous: boolean): 'link' | 'signIn' {
  return isAnonymous ? 'link' : 'signIn'
}

/**
 * Saca el `code` de la URL con la que volvió el navegador.
 *
 * Devuelve el error cuando el proveedor lo mandó, y `null` cuando no hay ni una
 * cosa ni la otra — que es lo que pasa si alguien cierra la pestaña a mano.
 */
export function parseCallback(
  url: string,
): { code: string } | { error: string } | null {
  let params: URLSearchParams
  try {
    const parsed = new URL(url)
    params = parsed.searchParams
    // Algunos proveedores devuelven todo en el fragmento en vez de la query.
    if (!params.has('code') && !params.has('error') && parsed.hash.length > 1) {
      params = new URLSearchParams(parsed.hash.slice(1))
    }
  } catch {
    return null
  }

  const error = params.get('error_description') ?? params.get('error')
  if (error != null && error !== '') return { error }

  const code = params.get('code')
  if (code != null && code !== '') return { code }

  return null
}

/**
 * Traduce lo que puede salir mal a una clave de i18n.
 *
 * El caso que importa es el primero: **esa cuenta de Google ya es de otro
 * usuario de MESH.** Pasa cuando alguien ya se registró en otro teléfono y
 * ahora está en uno nuevo donde estuvo mirando la app sin cuenta. No se puede
 * unir a los dos —fusionar cuentas es justo la rutina que ADR-002 evita— así
 * que se dice, en vez de cambiarle el usuario por debajo y dejarle atrás lo que
 * hizo en este teléfono.
 */
export function oauthMessageKey(raw: string): TranslationKey {
  const message = raw.toLowerCase()

  if (
    message.includes('already') ||
    message.includes('identity_already_exists') ||
    message.includes('manual_linking_disabled')
  ) {
    return 'auth.error.googleTaken'
  }
  if (message.includes('rate') || message.includes('limit')) {
    return 'auth.error.rateLimited'
  }
  return 'auth.error.google'
}

/** Cancelar no es un error: no se muestra nada y no pasa nada. */
export type OAuthResult =
  AuthResult | { readonly ok: false; readonly cancelled: true }

export function isCancelled(
  result: OAuthResult,
): result is { readonly ok: false; readonly cancelled: true } {
  return 'cancelled' in result && result.cancelled
}

/**
 * Las costuras, con la firma mínima que hace falta.
 *
 * A mano y no con `typeof supabase.auth.…`: esas funciones tienen sobrecargas
 * —`signInWithOAuth` acepta también un id token— y arrastrarlas hasta acá
 * obliga al llamador a satisfacer variantes que este archivo no usa. Lo que se
 * necesita de cada una es esto y nada más.
 */
export interface OAuthDependencies {
  readonly link: (params: OAuthStart) => Promise<OAuthStarted>
  readonly signIn: (params: OAuthStart) => Promise<OAuthStarted>
  readonly exchange: (code: string) => Promise<{ error: AuthLikeError | null }>
  readonly openAuth: (
    url: string,
    redirectTo: string,
  ) => Promise<{ type: string; url?: string }>
  readonly redirect: () => string
}

interface AuthLikeError {
  readonly message: string
}

interface OAuthStart {
  readonly provider: 'google'
  readonly options: {
    readonly redirectTo: string
    readonly skipBrowserRedirect: boolean
  }
}

interface OAuthStarted {
  readonly data: { readonly url?: string | null } | null
  readonly error: AuthLikeError | null
}

const REAL: OAuthDependencies = {
  link: (params) => supabase.auth.linkIdentity(params),
  signIn: (params) => supabase.auth.signInWithOAuth(params),
  exchange: (code) => supabase.auth.exchangeCodeForSession(code),
  openAuth: WebBrowser.openAuthSessionAsync,
  redirect: redirectUri,
}

/**
 * El camino completo, con el navegador en el medio.
 *
 * `dependencies` está para poder testear el orden sin abrir un navegador de
 * verdad: lo que importa verificar es **cuál de las dos operaciones se llamó**,
 * y eso se decide antes de que el navegador exista.
 */
export async function continueWithGoogle(
  isAnonymous: boolean,
  dependencies: OAuthDependencies = REAL,
): Promise<OAuthResult> {
  const redirectTo = dependencies.redirect()
  const options = { redirectTo, skipBrowserRedirect: true } as const

  const started =
    oauthAction(isAnonymous) === 'link'
      ? await dependencies.link({ provider: 'google', options })
      : await dependencies.signIn({ provider: 'google', options })

  if (started.error != null) {
    return { ok: false, messageKey: oauthMessageKey(started.error.message) }
  }

  const url = started.data?.url
  if (url == null || url === '') {
    return { ok: false, messageKey: 'auth.error.google' }
  }

  const browser = await dependencies.openAuth(url, redirectTo)
  // `success` sin URL no debería pasar, pero si pasa es indistinguible de que
  // la persona cerró la pestaña: sin URL no hay código que canjear.
  if (browser.type !== 'success' || browser.url == null) {
    return { ok: false, cancelled: true }
  }

  const callback = parseCallback(browser.url)
  if (callback == null) return { ok: false, cancelled: true }
  if ('error' in callback) {
    return { ok: false, messageKey: oauthMessageKey(callback.error) }
  }

  const { error } = await dependencies.exchange(callback.code)
  if (error != null) {
    return { ok: false, messageKey: oauthMessageKey(error.message) }
  }

  return { ok: true }
}

/**
 * Lo que la pantalla necesita saber, y nada más.
 *
 * Tres salidas y no cuatro: `'ok'` entró, una clave hay que mostrarla, y `null`
 * es **cancelar** — que no es un error. Colapsar cancelar dentro de "falló"
 * sería el defecto fácil acá: le pondría un cartel rojo a alguien que
 * simplemente cerró la pestaña.
 */
export function formOutcome(result: OAuthResult): TranslationKey | null | 'ok' {
  if (result.ok) return 'ok'
  if (isCancelled(result)) return null
  return result.messageKey
}
