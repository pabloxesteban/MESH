/**
 * i18n.
 *
 * Deliberadamente chico: un diccionario, una función y una elección de locale.
 * No hay librería porque no hay pluralización compleja, ni fechas relativas, ni
 * carga perezosa de bundles — y una dependencia que no usás igual te obliga a
 * aprender su forma de hacer las cosas.
 *
 * Lo que sí hay es tipado: `t()` solo acepta claves que existen, así que un
 * string huérfano no compila. Eso es lo que la mayoría de las librerías no da.
 */

import { esAR, type TranslationKey } from './es-AR.ts'
import { en } from './en.ts'

export type Locale = 'es-AR' | 'en'

export const SOURCE_LOCALE: Locale = 'es-AR'

const CATALOGS: Readonly<
  Record<Locale, Readonly<Record<TranslationKey, string>>>
> = { 'es-AR': esAR, en }

/**
 * Elige el catálogo para un locale del sistema.
 *
 * Cualquier variante de español cae en `es-AR`: alguien con el teléfono en
 * `es-MX` entiende el voseo mucho mejor que el inglés. Todo lo demás cae en
 * inglés.
 */
export function resolveLocale(systemLocale: string | undefined | null): Locale {
  if (systemLocale == null) return SOURCE_LOCALE
  return systemLocale.toLowerCase().startsWith('es') ? 'es-AR' : 'en'
}

/**
 * Interpolación: `{nombre}` en el string se reemplaza por `params.nombre`.
 *
 * Un parámetro que falta deja el marcador visible en vez de imprimir
 * "undefined". Un hueco a la vista se reporta; un "undefined" se confunde con
 * un dato real.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Readonly<Record<string, string | number>>,
): string {
  const template = CATALOGS[locale][key]
  if (params == null) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

export { esAR, en }
export type { TranslationKey }
