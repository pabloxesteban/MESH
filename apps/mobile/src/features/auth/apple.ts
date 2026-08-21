/**
 * Entrar con Apple.
 *
 * Rige la misma línea que gobierna a Google, de
 * [ADR-002](../../../../docs/decisions/ADR-002-authentication.md):
 *
 * > **Con sesión anónima se VINCULA, no se entra.**
 *
 * ## Por qué acá sí hay módulo nativo, y en Google no
 *
 * Google va por el navegador contra el OAuth hospedado de Supabase, y está
 * bien: en Android y en la web es lo único que hay. Apple es distinto por dos
 * razones que se suman:
 *
 * 1. **Solo se muestra en iOS.** Es donde Apple lo exige y donde la gente lo
 *    espera; en Android un botón de Apple es ruido.
 * 2. **En iOS, una pestaña de navegador para entrar con Apple se lee como una
 *    estafa.** El sistema tiene su propia hoja, con Face ID, y es la que
 *    cualquiera reconoce. Pedir eso por navegador es lo contrario de "como
 *    cualquier otra aplicación".
 *
 * `expo-apple-authentication` **viene incluido en Expo Go** en iOS, así que
 * esto no rompe [ADR-009](../../../../docs/decisions/ADR-009-almacenamiento-local.md):
 * no hace falta un development build para probarlo.
 *
 * ## Lo que hizo que el camino nativo fuera posible
 *
 * `linkIdentity()` tiene una sobrecarga que acepta un **id token**, no solo el
 * arranque de OAuth por navegador. Sin eso, lo nativo habría tenido que usar
 * `signInWithIdToken()`, que abre un usuario nuevo — y ahí alguien que cargó su
 * perfil de artista sin cuenta lo perdería al registrarse. Se verificó contra
 * los tipos de `@supabase/auth-js` antes de escribir esto, porque la primera
 * suposición fue la contraria.
 *
 * ## Lo que Apple hace distinto y conviene saber
 *
 * - **El nombre viene una sola vez**, en la primera autorización, y nunca más.
 *   MESH no lo usa —el nombre para mostrar se elige en Perfil— así que no se
 *   pide ni se guarda. Es la trampa clásica de esta integración, y acá no
 *   aplica por cómo está armado el perfil.
 * - **El correo puede ser un relé** (`…@privaterelay.appleid.com`) si la
 *   persona elige esconderlo. Es una dirección real que reenvía, así que no hay
 *   nada especial que hacer; lo que no hay que hacer es tratarla como inválida.
 *
 * Ver `docs/launch/sso-setup.md` para las credenciales que hacen falta.
 */

import * as AppleAuthentication from 'expo-apple-authentication'

import type { TranslationKey } from '../../i18n/index.ts'
import { supabase } from '../../data/supabase.ts'

import { oauthAction, type OAuthResult } from './oauth.ts'

/**
 * Traduce lo que puede salir mal a una clave de i18n.
 *
 * El caso que importa es el mismo que en Google: **esa cuenta de Apple ya es de
 * otro usuario de MESH.** Pasa cuando alguien ya se registró en otro teléfono.
 * No se puede unir a los dos —fusionar cuentas es justo la rutina que ADR-002
 * evita— así que se dice.
 */
export function appleMessageKey(raw: string): TranslationKey {
  const message = raw.toLowerCase()

  if (
    message.includes('already') ||
    message.includes('identity_already_exists') ||
    message.includes('manual_linking_disabled')
  ) {
    return 'auth.error.appleTaken'
  }
  if (message.includes('rate') || message.includes('limit')) {
    return 'auth.error.rateLimited'
  }
  return 'auth.error.apple'
}

/**
 * Cancelar tiene un código propio en iOS.
 *
 * `ERR_REQUEST_CANCELED` es lo que tira la hoja del sistema cuando alguien la
 * cierra. No es un error: no se muestra nada. Sin esto, arrepentirse le
 * dibujaría un cartel rojo a alguien que no hizo nada mal — el mismo defecto
 * que `isCancelled` evita del lado de Google.
 */
export function isAppleCancel(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED'
}

/** Las costuras, con la firma mínima que hace falta. Ver `oauth.ts`. */
export interface AppleDependencies {
  readonly available: () => Promise<boolean>
  readonly authorize: () => Promise<{ identityToken: string | null }>
  readonly link: (
    token: string,
  ) => Promise<{ error: { message: string } | null }>
  readonly signIn: (
    token: string,
  ) => Promise<{ error: { message: string } | null }>
}

const REAL: AppleDependencies = {
  available: () => AppleAuthentication.isAvailableAsync(),
  authorize: () =>
    AppleAuthentication.signInAsync({
      // Solo el correo. El nombre viene una sola vez y MESH no lo usa: el
      // nombre para mostrar se elige en Perfil. Pedir un dato que no se va a
      // guardar es pedirlo de más.
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    }),
  link: async (token) => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'apple',
      token,
    })
    return { error }
  },
  signIn: async (token) => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token,
    })
    return { error }
  },
}

/**
 * El camino completo.
 *
 * `dependencies` está para poder testear el orden sin una hoja del sistema de
 * por medio: lo que importa verificar es **cuál de las dos operaciones se
 * llamó**, igual que en Google, y eso se decide antes de que la hoja exista.
 */
export async function continueWithApple(
  isAnonymous: boolean,
  dependencies: AppleDependencies = REAL,
): Promise<OAuthResult> {
  if (!(await dependencies.available())) {
    return { ok: false, messageKey: 'auth.error.appleUnavailable' }
  }

  let token: string | null
  try {
    token = (await dependencies.authorize()).identityToken
  } catch (error) {
    if (isAppleCancel(error)) return { ok: false, cancelled: true }
    return { ok: false, messageKey: 'auth.error.apple' }
  }

  // Sin token no hay nada que canjear. No debería pasar, y si pasa es
  // indistinguible de haber cerrado la hoja.
  if (token == null || token === '') return { ok: false, cancelled: true }

  const { error } =
    oauthAction(isAnonymous) === 'link'
      ? await dependencies.link(token)
      : await dependencies.signIn(token)

  if (error != null) {
    return { ok: false, messageKey: appleMessageKey(error.message) }
  }

  return { ok: true }
}
