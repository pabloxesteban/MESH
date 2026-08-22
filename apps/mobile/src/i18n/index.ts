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
 * V1 lanza solo en Buenos Aires, y siempre en `es-AR` — nunca en inglés, sea
 * cual sea el idioma del teléfono. No es un fallback ni una preferencia:
 * `en.ts` sigue existiendo como destino de traducción para cuando haya un
 * mercado que lo necesite (ver `es-AR.ts`, "este archivo es el origen"), pero
 * mientras el único mercado sea CABA, mostrarle inglés a alguien de Buenos
 * Aires porque su teléfono vino de fábrica en inglés es exactamente el error
 * contrario al que el comentario viejo de esta función quería evitar.
 *
 * El parámetro se conserva sin usar: el día que haya un segundo mercado, esta
 * función vuelve a mirarlo — no hace falta rediseñar la firma para eso.
 */
export function resolveLocale(
  _systemLocale: string | undefined | null,
): Locale {
  return SOURCE_LOCALE
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
