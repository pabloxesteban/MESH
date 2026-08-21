/**
 * Nada de la app se muestra hasta que sabemos a qué vino la persona.
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
  confirmAdult,
  fetchAccount,
  updateAccount,
  type OnboardingIntent,
} from '../account/queries.ts'
import { AgeScreen } from './AgeScreen.tsx'
import { IntentScreen } from './IntentScreen.tsx'

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

  // Quien dijo que todavía no tiene 18 pasa igual, y no se guarda nada. Es
  // estado de la sesión y no una columna: una columna sería un registro de
  // menores de edad. Ver ADR-025.
  const [salteoEdad, setSalteoEdad] = useState(false)

  const account = useQuery({
    queryKey: ['account'],
    queryFn: fetchAccount,
  })

  const declarar = useMutation({
    mutationFn: confirmAdult,
    onSuccess: () => client.invalidateQueries({ queryKey: ['account'] }),
  })

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

  // La edad primero: es la única pregunta con una consecuencia física del otro
  // lado.
  if (account.data?.adultConfirmedAt == null && !salteoEdad) {
    return (
      <AgeScreen
        busy={declarar.isPending}
        onConfirm={() => declarar.mutate()}
        onSkip={() => setSalteoEdad(true)}
      />
    )
  }

  if (account.data?.onboardingIntent == null) {
    return (
      <IntentScreen
        busy={choose.isPending}
        onChoose={(intent) => choose.mutate(intent)}
      />
    )
  }

  return <>{children}</>
}
