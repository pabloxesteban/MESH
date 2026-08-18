/**
 * Sesión: el estado del que dependen todas las pantallas.
 *
 * MESH es **anónimo primero** (ADR-002). En el arranque se abre una sesión
 * anónima si no hay ninguna, así que `auth.uid()` existe desde el primer frame
 * y no hay ningún camino de lectura sin sesión que defender en el esquema.
 *
 * Consecuencia de diseño: "sin cuenta" y "sin sesión" son cosas distintas.
 * Siempre hay sesión. Lo que puede faltar es la CUENTA, y eso se lee de
 * `isAnonymous`.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '../../data/supabase.ts'
import { ensureSession } from './queries.ts'

export interface SessionState {
  /** `null` mientras arranca. Nunca vuelve a null salvo error. */
  readonly session: Session | null
  readonly userId: string | null
  /** Hay sesión pero no cuenta: nada de esto viaja a otro teléfono. */
  readonly isAnonymous: boolean
  readonly email: string | null
  /** Todavía no sabemos si hay sesión. La app muestra un skeleton. */
  readonly isLoading: boolean
  /** El arranque falló. La app muestra un error con reintentar. */
  readonly hasError: boolean
  readonly retry: () => void
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    // El listener se registra ANTES de arrancar la sesión: si se registrara
    // después, el evento del propio ingreso anónimo se perdería y el primer
    // render quedaría sin sesión hasta el siguiente refresh.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        if (!cancelled) setSession(next)
      },
    )

    setIsLoading(true)
    setHasError(false)

    void ensureSession().then(async (result) => {
      if (cancelled) return
      if (!result.ok) {
        setHasError(true)
        setIsLoading(false)
        return
      }
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(data.session)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [attempt])

  const value = useMemo<SessionState>(
    () => ({
      session,
      userId: session?.user.id ?? null,
      // `is_anonymous` viene del JWT. No se infiere de "no hay email": una
      // cuenta creada con proveedor social podría no tenerlo.
      isAnonymous: session?.user.is_anonymous ?? true,
      email: session?.user.email ?? null,
      isLoading,
      hasError,
      retry: () => setAttempt((n) => n + 1),
    }),
    [session, isLoading, hasError],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionState {
  const value = useContext(SessionContext)
  if (value == null) {
    throw new Error('useSession necesita estar dentro de <SessionProvider>')
  }
  return value
}
