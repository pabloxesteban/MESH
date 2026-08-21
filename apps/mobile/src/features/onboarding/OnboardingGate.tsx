/**
 * Nada de la app se muestra hasta que sabemos a qué vino la persona.
 *
 * **Dos preguntas, y ninguna es la edad.** Hasta el 2026-08-21 la primera
 * pantalla de MESH preguntaba si tenías 18 años, antes de que nadie supiera
 * qué era esto. Ninguna app le pregunta la edad a alguien que todavía no vio
 * nada, y no hacía falta: lo que impone la regla es
 * `schedule_appointment()` del lado de la base, no una pantalla. La pregunta se
 * mudó a crear cuenta y a la puerta del turno, que es donde importa. Ver
 * [ADR-030](../../../../docs/decisions/ADR-030-first-run.md).
 *
 * Es un gate y no una pantalla más en el stack a propósito: si fuera una ruta,
 * un deep link la saltearía y la app abriría sin saber qué mostrar primero.
 *
 * Mientras carga NO se muestra un spinner: se deja el fondo del tema, igual
 * que hace `SessionGate` con las tipografías. Un indicador que aparece y
 * desaparece en 200ms es más ruidoso que nada.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { View } from 'react-native'

import { useTheme } from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'

import {
  fetchAccount,
  updateAccount,
  type OnboardingIntent,
} from '../account/queries.ts'
import { useDeviceLocation } from '../location/useDeviceLocation.ts'
import { useLocationAsked } from '../location/useLocationAsked.ts'
import {
  useSearchLocation,
  type SearchLocation,
} from '../location/useSearchLocation.ts'
import { IntentScreen } from './IntentScreen.tsx'
import { LocationScreen } from './LocationScreen.tsx'

export function OnboardingGate({
  children,
  onOffering,
}: {
  children: ReactNode
  /** Se llama al elegir "ofrezco": lleva al canje del código de artista. */
  onOffering: () => void
}) {
  const theme = useTheme()
  const client = useQueryClient()

  const ubicacion = useLocationAsked()
  const device = useDeviceLocation()
  const searchLocation = useSearchLocation()
  const [pidiendoUbicacion, setPidiendoUbicacion] = useState(false)

  const account = useQuery({
    queryKey: ['account'],
    queryFn: fetchAccount,
  })

  const responderUbicacion = (modo: SearchLocation['mode']) => {
    searchLocation.set({ mode: modo, neighborhoodSlug: null })
    ubicacion.markAsked()
    setPidiendoUbicacion(false)
  }

  const choose = useMutation({
    mutationFn: (intent: OnboardingIntent) =>
      updateAccount({ onboardingIntent: intent }),
    onSuccess: async (_data, intent) => {
      await client.invalidateQueries({ queryKey: ['account'] })
      if (intent === 'offering') onOffering()
    },
  })

  if (account.error != null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface }}>
        <ErrorView
          error={account.error}
          onRetry={() => void account.refetch()}
          testID="onboarding-error"
        />
      </View>
    )
  }

  if (account.isPending) {
    return <View style={{ flex: 1, backgroundColor: theme.surface }} />
  }

  if (account.data?.onboardingIntent == null) {
    return (
      <IntentScreen
        busy={choose.isPending}
        onChoose={(intent) => choose.mutate(intent)}
      />
    )
  }

  // La ubicación, una sola vez y después de saber a qué vino: preguntarla
  // antes sería pedir un permiso para algo que todavía no se entiende.
  //
  // `isLoading` importa: mientras se lee lo guardado no se sabe si ya se
  // preguntó, y mostrar la pantalla para sacarla 200ms después es peor que
  // esperar. Se deja el fondo del tema, igual que arriba.
  if (ubicacion.isLoading) {
    return <View style={{ flex: 1, backgroundColor: theme.surface }} />
  }

  if (!ubicacion.asked) {
    return (
      <LocationScreen
        busy={pidiendoUbicacion}
        onAllow={() => {
          setPidiendoUbicacion(true)
          device.request()
          // No se espera la respuesta del sistema para seguir: el permiso lo
          // resuelve el sistema operativo con su propio diálogo, y quedarse
          // mirando un botón cargando mientras aparece ese diálogo encima es
          // una pantalla trabada. La preferencia queda en `device`, que es lo
          // que la persona pidió; si al final lo niega, el encabezado de Inicio
          // lo dice y ofrece cambiarlo.
          responderUbicacion('device')
        }}
        onSkip={() => responderUbicacion('none')}
      />
    )
  }

  return <>{children}</>
}
