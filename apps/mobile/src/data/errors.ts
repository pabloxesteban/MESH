/**
 * Mapeo de errores a un conjunto chico de causas visibles.
 *
 * Regla, de docs/architecture/system-architecture.md §7: **los mensajes crudos
 * de Postgres o de Supabase nunca se le muestran a nadie ni se escriben en
 * analytics.** Un `new row violates row-level security policy for table
 * "interactions"` le cuenta a cualquiera cómo está construida la base, y no le
 * dice a la persona qué hacer.
 *
 * Cuatro causas y nada más. Cada una tiene un título, un cuerpo y una acción en
 * el catálogo de i18n, así que agregar una quinta obliga a escribir qué debería
 * hacer alguien al verla — que es la pregunta correcta.
 */

import type { TranslationKey } from '../i18n/index.ts'

export type ErrorCause =
  | 'offline'
  | 'server'
  | 'notFound'
  /**
   * RLS rechazó la operación. Se le muestra a la persona el MISMO texto que
   * `notFound`: distinguirlas le confirmaría a alguien que el recurso existe
   * pero no es suyo, que es justo lo que RLS existe para no decir.
   */
  | 'permission'
  | 'unknown'

export interface VisibleError {
  readonly cause: ErrorCause
  readonly titleKey: TranslationKey
  readonly bodyKey: TranslationKey
}

const POSTGREST_CAUSES: Readonly<Record<string, ErrorCause>> = {
  // Postgres: insufficient_privilege. Es lo que devuelve una política de RLS.
  '42501': 'permission',
  PGRST301: 'permission',
  // PostgREST: 0 filas donde se esperaba 1.
  PGRST116: 'notFound',
}

/** Forma mínima de un error de supabase-js. No importa su tipo: no lo necesita. */
interface ErrorLike {
  readonly message?: unknown
  readonly code?: unknown
  readonly status?: unknown
}

export function toVisibleError(error: unknown): VisibleError {
  return describe(classify(error))
}

export function describe(cause: ErrorCause): VisibleError {
  return {
    cause,
    titleKey: `error.${cause}.title` as TranslationKey,
    bodyKey: `error.${cause}.body` as TranslationKey,
  }
}

export function classify(error: unknown): ErrorCause {
  if (error == null || typeof error !== 'object') return 'unknown'

  const { code, status, message } = error as ErrorLike

  if (typeof code === 'string' && code in POSTGREST_CAUSES) {
    return POSTGREST_CAUSES[code] as ErrorCause
  }

  if (typeof status === 'number') {
    if (status === 401 || status === 403) return 'permission'
    if (status === 404) return 'notFound'
    if (status >= 500) return 'server'
  }

  // `TypeError: Network request failed` es lo que tira fetch sin conexión, y no
  // trae código ni status. Es el único caso donde hay que mirar el texto.
  if (
    typeof message === 'string' &&
    /network request failed|fetch failed/i.test(message)
  ) {
    return 'offline'
  }

  return 'unknown'
}
