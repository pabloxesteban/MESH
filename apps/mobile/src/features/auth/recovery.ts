/**
 * La vuelta del enlace de recuperación.
 *
 * Sin esto, "olvidé mi contraseña" terminaba en la nada: `resetPasswordForEmail`
 * mandaba a la persona a `mesh://auth/callback`, esa ruta no existía, y quien
 * se había registrado con correo quedaba afuera de su cuenta **para siempre**,
 * con su perfil de artista adentro.
 *
 * ## Lo que trae la URL, medido y no supuesto
 *
 * El enlace del correo va a `<supabase>/auth/v1/verify?token=pkce_…&type=recovery`,
 * y GoTrue responde un 303 a:
 *
 *     mesh://auth/callback?code=<uuid>
 *
 * **Nada más.** No viene `type=recovery`, no viene `token_hash`: la URL con la
 * que vuelve la app no dice de qué era el enlace. La única señal de que esto es
 * una recuperación y no un ingreso cualquiera es el evento `PASSWORD_RECOVERY`,
 * que `exchangeCodeForSession()` emite **antes** de resolver — también medido,
 * porque si lo emitiera después habría que esperarlo y esta función sería una
 * carrera.
 *
 * De ahí la forma rara pero necesaria de `completeCallback`: se escucha
 * alrededor del canje.
 *
 * ## Y una restricción que hay que decirle a la persona
 *
 * El `code_verifier` de PKCE queda guardado en el teléfono que **pidió** la
 * recuperación. Abrir el correo en otro dispositivo falla con "PKCE code
 * verifier not found in storage" — un mensaje en inglés que no le sirve a
 * nadie. Por eso tiene clave propia: `auth.error.otherDevice`.
 */

import type { TranslationKey } from '../../i18n/index.ts'
import { supabase } from '../../data/supabase.ts'

import { parseCallback } from './oauth.ts'

/** Qué era el enlace, una vez canjeado. */
export type CallbackOutcome =
  | { readonly kind: 'recovery' }
  | { readonly kind: 'signedIn' }
  | { readonly kind: 'error'; readonly messageKey: TranslationKey }

/**
 * Traduce lo que puede salir mal a una clave de i18n.
 *
 * Los tres casos son distintos para quien los vive: *lo abriste en otro
 * teléfono*, *el enlace venció*, y *algo se rompió*. Colapsarlos en uno solo
 * dejaría a alguien probando el mismo enlace una y otra vez sin entender por
 * qué no anda.
 */
export function callbackMessageKey(raw: string): TranslationKey {
  const message = raw.toLowerCase()

  if (message.includes('verifier') || message.includes('challenge')) {
    return 'auth.error.otherDevice'
  }
  if (message.includes('expired') || message.includes('otp_expired')) {
    return 'auth.error.linkExpired'
  }
  if (message.includes('rate') || message.includes('limit')) {
    return 'auth.error.rateLimited'
  }
  return 'auth.error.link'
}

interface AuthLikeError {
  readonly message: string
}

export interface CallbackDependencies {
  readonly exchange: (code: string) => Promise<{ error: AuthLikeError | null }>
  /** Devuelve cómo dejar de escuchar. */
  readonly onAuthEvent: (listener: (event: string) => void) => () => void
}

const REAL: CallbackDependencies = {
  exchange: (code) => supabase.auth.exchangeCodeForSession(code),
  onAuthEvent: (listener) => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      listener(event)
    })
    return () => data.subscription.unsubscribe()
  },
}

/**
 * Canjea el código y dice qué era el enlace.
 *
 * Se escucha **alrededor** del canje y no después: el evento llega adentro del
 * `await`, así que un listener registrado más tarde no lo vería nunca y toda
 * recuperación se leería como un ingreso común — la persona entraría a la app
 * sin que nadie le pida la contraseña nueva, que es justo lo que vino a hacer.
 */
export async function completeCallback(
  url: string,
  dependencies: CallbackDependencies = REAL,
): Promise<CallbackOutcome> {
  const parsed = parseCallback(url)
  if (parsed == null) return { kind: 'error', messageKey: 'auth.error.link' }
  if ('error' in parsed) {
    return { kind: 'error', messageKey: callbackMessageKey(parsed.error) }
  }

  let isRecovery = false
  const stop = dependencies.onAuthEvent((event) => {
    if (event === 'PASSWORD_RECOVERY') isRecovery = true
  })

  try {
    const { error } = await dependencies.exchange(parsed.code)
    if (error != null) {
      return { kind: 'error', messageKey: callbackMessageKey(error.message) }
    }
  } finally {
    // En `finally` para no dejar el listener colgado si el canje explota.
    stop()
  }

  return isRecovery ? { kind: 'recovery' } : { kind: 'signedIn' }
}
