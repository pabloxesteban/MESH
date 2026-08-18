/**
 * Locale de la app.
 *
 * Se resuelve una sola vez, del locale del sistema. No hay selector de idioma:
 * el mercado es CABA, y un selector le pide a la persona que tome una decisión
 * que el teléfono ya tomó.
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
 * Hermes trae Intl completo en RN 0.86, así que no hace falta un módulo nativo
 * para esto. Si por algún motivo no está, cae en el locale de origen — que es
 * el correcto para el 100% del mercado de V1.
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
