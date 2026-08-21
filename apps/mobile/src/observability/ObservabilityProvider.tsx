/**
 * Arranque del reportador de errores.
 *
 * **Va por encima de `SessionProvider`, y eso es deliberado.** Los errores que
 * más importan son los del arranque: si algo se rompe antes de que haya sesión,
 * un reportador que espera a la sesión no se entera nunca. Por el mismo motivo
 * la preferencia se lee del almacenamiento local y no de `profiles`: una
 * preferencia que vive en la base no se puede consultar antes de la primera
 * consulta.
 *
 * Que sea local además tiene sentido por lo que es: no es una preferencia sobre
 * los datos de la persona —un reporte no lleva su id— sino sobre este teléfono.
 *
 * Ver ADR-026.
 */

import Constants from 'expo-constants'
import { randomUUID } from 'expo-crypto'
import { useEffect, type ReactNode } from 'react'
import { AppState, Platform } from 'react-native'

import { kv, readJson } from '../data/kv.ts'

import {
  configureReporter,
  flushReports,
  setReporterEnabled,
} from './report.ts'
import { httpSink } from './sink.ts'

export const REPORTER_PREF_KEY = 'mesh.errors.enabled'

function platformName(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios'
  if (Platform.OS === 'android') return 'android'
  return 'web'
}

export function ObservabilityProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    configureReporter({
      // Aleatorio por arranque. No identifica al dispositivo ni persiste entre
      // sesiones: solo permite agrupar los errores de un mismo uso, que es lo
      // que convierte tres reportes sueltos en una historia.
      sessionId: randomUUID(),
      platform: platformName(),
      appVersion: Constants.expoConfig?.version ?? null,
      now: () => new Date().toISOString(),
      // `null` mientras no haya un destino configurado. Con `null`, el
      // reportador ni siquiera encola.
      sink: httpSink(),
    })

    // Encendido por default, y se apaga si la persona lo apagó en este
    // teléfono. Al revés que analytics: acá lo que se mide es si la app
    // funciona, no qué hace la persona.
    void readJson<boolean>(kv, REPORTER_PREF_KEY, true).then((value) =>
      setReporterEnabled(value),
    )
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void flushReports()
      }
    })
    return () => subscription.remove()
  }, [])

  return <>{children}</>
}
