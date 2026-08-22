/**
 * Nada de la app se muestra hasta que sabemos a qué vino la persona.
 *
 * Es un gate y no una pantalla más en el stack a propósito: si fuera una ruta,
 * un deep link la saltearía y la app abriría sin saber qué mostrar primero.
 *
 * Mientras carga NO se muestra un spinner: se deja el fondo del tema, igual
 * que hace `SessionGate` con las tipografías. Un indicador que aparece y
 * desaparece en 200ms es más ruidoso que nada.
 *
 * La pregunta de edad **no** vive acá. ADR-033 la mudó a `cuenta/crear.tsx`,
 * disparada solo al crear cuenta — nunca en el arranque frío ni al iniciar
 * sesión con una cuenta existente. Ver `app/cuenta/edad.tsx`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { View } from 'react-native'

import { useTheme } from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'

import {
  fetchAccount,
  updateAccount,
  type OnboardingIntent,
} from '../account/queries.ts'
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

  const account = useQuery({
    queryKey: ['account'],
    queryFn: fetchAccount,
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
