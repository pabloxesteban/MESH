/**
 * Locale de la app.
 *
 * Se resuelve una sola vez, y es siempre `es-AR` — no hay selector de idioma
 * ni detección del teléfono. El mercado de V1 es Buenos Aires, y un selector
 * le pide a la persona que tome una decisión que ya está tomada: nadie que
 * viva ahí debería abrir MESH en inglés porque el sistema operativo de su
 * teléfono vino así de fábrica. Ver `resolveLocale` en `./index.ts`.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import {
  resolveLocale,
  translate,
  type Locale,
  type TranslationKey,
} from './index.ts'

export interface I18n {
  readonly locale: Locale
  readonly t: (
    key: TranslationKey,
    params?: Readonly<Record<string, string | number>>,
  ) => string
}

const I18nContext = createContext<I18n | null>(null)

/**
 * Locale del sistema.
 *
 * `resolveLocale` no lo usa hoy — siempre devuelve `es-AR` — pero se sigue
 * leyendo y pasando para que el día que haga falta mirarlo de nuevo (un
 * segundo mercado) sea un cambio de una función, no de toda la cadena de
 * llamadas. Hermes trae Intl completo en RN 0.86, así que no hace falta un
 * módulo nativo para esto.
 */
function systemLocale(): string | undefined {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale
  } catch {
    return undefined
  }
}

export function I18nProvider({
  children,
  locale,
}: {
  children: ReactNode
  /** Solo para tests: fija el locale sin depender del entorno. */
  locale?: Locale
}) {
  const value = useMemo<I18n>(() => {
    const resolved = locale ?? resolveLocale(systemLocale())
    return {
      locale: resolved,
      t: (key, params) => translate(resolved, key, params),
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (value == null) {
    throw new Error('useI18n necesita estar dentro de <I18nProvider>')
  }
  return value
}

/** Atajo: `const t = useT()` y después `t('common.retry')`. */
export function useT(): I18n['t'] {
  return useI18n().t
}
