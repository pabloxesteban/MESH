/**
 * El único lugar donde `features/auth` habla con Supabase.
 *
 * Todas las funciones devuelven `{ ok }` o `{ ok: false, messageKey }` en vez de
 * lanzar: un error de auth es un estado de la pantalla, no una excepción. Y
 * `messageKey` es una clave de i18n, nunca el texto que devolvió el servidor —
 * los mensajes de GoTrue están en inglés y filtran detalles de implementación.
 */

import type { AuthError } from '@supabase/supabase-js'

import type { TranslationKey } from '../../i18n/index.ts'
import { supabase } from '../../data/supabase.ts'

import { redirectUri } from './redirect.ts'

export type AuthResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly messageKey: TranslationKey }

/** Mínimo de contraseña. Tiene que coincidir con supabase/config.toml. */
export const MIN_PASSWORD_LENGTH = 10

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Traduce un error de GoTrue a una clave de i18n.
 *
 * **Credenciales inválidas y correo inexistente colapsan en el mismo mensaje.**
 * Distinguirlos le confirmaría a cualquiera si una persona tiene cuenta en MESH,
 * y "tengo tatuajes" no es información de nadie más.
 */
function messageKeyFor(error: AuthError): TranslationKey {
  const code = error.code ?? ''
  if (code === 'over_request_rate_limit' || error.status === 429) {
    return 'auth.error.rateLimited'
  }
  if (code === 'user_already_exists' || code === 'email_exists') {
    return 'auth.error.emailTaken'
  }
  if (code === 'weak_password') return 'auth.error.passwordShort'
  if (code === 'validation_failed') return 'auth.error.emailInvalid'
  return 'auth.error.credentials'
}

function validate(email: string, password?: string): TranslationKey | null {
  if (!EMAIL.test(email.trim())) return 'auth.error.emailInvalid'
  if (password != null && password.length < MIN_PASSWORD_LENGTH) {
    return 'auth.error.passwordShort'
  }
  return null
}

/**
 * Arranca una sesión anónima si todavía no hay ninguna.
 *
 * Idempotente a propósito: se llama en cada arranque, y una segunda llamada con
 * sesión viva no crea un usuario nuevo. Sin esto, cada arranque en frío dejaría
 * un usuario huérfano en `auth.users`.
 */
export async function ensureSession(): Promise<AuthResult> {
  const { data } = await supabase.auth.getSession()
  if (data.session != null) return { ok: true }

  const { error } = await supabase.auth.signInAnonymously()
  if (error != null) return { ok: false, messageKey: messageKeyFor(error) }
  return { ok: true }
}

/**
 * Convierte la sesión anónima en una cuenta, conservando el mismo `auth.uid()`.
 *
 * Esto es la razón por la que MESH es anónimo primero (ADR-002): al no cambiar
 * el id, no hay ninguna rutina de fusión que migre interacciones, gusto y
 * matches de un usuario a otro. Esa rutina es donde viven los bugs de
 * privacidad, y acá directamente no existe.
 */
export async function upgradeToAccount(
  email: string,
  password: string,
): Promise<AuthResult> {
  const invalid = validate(email, password)
  if (invalid != null) return { ok: false, messageKey: invalid }

  const { error } = await supabase.auth.updateUser({
    email: email.trim(),
    password,
  })
  if (error != null) return { ok: false, messageKey: messageKeyFor(error) }
  return { ok: true }
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  const invalid = validate(email)
  if (invalid != null) return { ok: false, messageKey: invalid }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error != null) return { ok: false, messageKey: messageKeyFor(error) }
  return { ok: true }
}

/**
 * Cierra sesión y arranca una anónima nueva.
 *
 * Quedarse sin sesión no es un estado que la app sepa mostrar: no hay camino de
 * lectura sin `auth.uid()`. Cerrar sesión te devuelve a "sin cuenta", no a una
 * pantalla de bienvenida.
 */
export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut()
  if (error != null) return { ok: false, messageKey: messageKeyFor(error) }
  return ensureSession()
}

/**
 * Pide el enlace de recuperación.
 *
 * Devuelve `ok` incluso si el correo no tiene cuenta —y el texto que se muestra
 * es condicional ("si ese correo tiene una cuenta…")— para no convertir esta
 * pantalla en un verificador de quién está registrado.
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const invalid = validate(email)
  if (invalid != null) return { ok: false, messageKey: invalid }

  // `redirectUri()` y no `'mesh://auth/callback'` escrito a mano: en Expo Go la
  // app vive en `exp://…` y el esquema `mesh://` no existe todavía, así que el
  // enlace del correo no llevaba a ningún lado — justo cuando la persona ya no
  // puede entrar de otra forma.
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectUri(),
  })
  // Un error de tasa sí se muestra: es una instrucción accionable.
  if (error != null && error.status === 429) {
    return { ok: false, messageKey: 'auth.error.rateLimited' }
  }
  return { ok: true }
}

/**
 * La contraseña nueva, ya con la sesión que dejó el enlace.
 *
 * `updateUser` y no `signUp`: acá ya hay sesión —la abrió el canje del código—
 * y el `auth.uid()` es el de siempre. Ver ADR-002.
 */
export async function setNewPassword(password: string): Promise<AuthResult> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, messageKey: 'auth.error.passwordShort' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error != null) return { ok: false, messageKey: messageKeyFor(error) }
  return { ok: true }
}

export { messageKeyFor as __messageKeyFor, validate as __validate }
