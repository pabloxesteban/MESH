/**
 * Arranque y ciclo de vida de analytics.
 *
 * Tres cosas:
 *   - configura el tracker con la sesión de app, la plataforma y la versión;
 *   - lee el opt-in de `profiles.analytics_opt_in` en cuanto hay sesión, y
 *     **no encola nada hasta saberlo** — arrancar recolectando y apagar después
 *     sería recolectar sin permiso;
 *   - manda el buffer cuando la app pasa a segundo plano, que es el momento en
 *     que la persona dejó de estar esperando algo.
 */

import Constants from 'expo-constants'
import { randomUUID } from 'expo-crypto'
import { useEffect, useRef, type ReactNode } from 'react'
import { AppState, Platform } from 'react-native'

import { useSession } from '../features/auth/SessionProvider.tsx'
import { supabase } from '../data/supabase.ts'

import {
  configureAnalytics,
  flushAnalytics,
  setAnalyticsOptIn,
  setAnalyticsUser,
  track,
} from './track.ts'

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { userId } = useSession()
  const started = useRef(false)

  useEffect(() => {
    if (userId == null) return

    configureAnalytics({
      // Aleatorio por arranque de app. No identifica al dispositivo ni persiste
      // entre sesiones: solo permite agrupar los eventos de un mismo uso.
      sessionId: randomUUID(),
      platform:
        Platform.OS === 'ios'
          ? 'ios'
          : Platform.OS === 'android'
            ? 'android'
            : 'web',
      appVersion: Constants.expoConfig?.version ?? null,
      now: () => new Date().toISOString(),
    })
    setAnalyticsUser(userId)

    // Hasta que se sepa la preferencia, apagado. Recolectar mientras se
    // averigua y borrar después no es lo mismo que no recolectar.
    void setAnalyticsOptIn(false)
    void supabase
      .from('profiles')
      .select('analytics_opt_in')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        const enabled = data?.analytics_opt_in ?? true
        void setAnalyticsOptIn(enabled).then(() => {
          if (enabled && !started.current) {
            started.current = true
            track({ name: 'app_opened', props: { is_first_open: false } })
          }
        })
      })
  }, [userId])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // Al fondo, no cada N segundos: mandar mientras alguien está usando la
      // app gasta red que la app necesita para lo que la persona vino a hacer.
      if (state === 'background' || state === 'inactive') {
        void flushAnalytics()
      }
    })
    return () => subscription.remove()
  }, [])

  return <>{children}</>
}
