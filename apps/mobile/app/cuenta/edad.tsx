import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'

import { confirmAdult } from '@/features/account/queries.ts'
import { AgeScreen } from '@/features/onboarding/AgeScreen.tsx'

/**
 * La pregunta de edad, mudada de arranque a crear cuenta. Ver ADR-033.
 *
 * Solo se llega acá desde el `onDone` de `cuenta/crear.tsx`, y con `replace`
 * — así que `router.back()` desde acá (con o sin declarar) vuelve a lo que
 * había antes de crear cuenta, nunca a la propia pantalla de creación.
 *
 * Decir que no **no dispara ninguna mutación**: es la misma regla que regía
 * en `OnboardingGate` antes de mudarse, sin cambios. Ver `AgeScreen.tsx`.
 */
export default function AgeGateScreen() {
  const client = useQueryClient()

  const declarar = useMutation({
    mutationFn: confirmAdult,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['account'] })
      router.back()
    },
  })

  return (
    <AgeScreen
      busy={declarar.isPending}
      onConfirm={() => declarar.mutate()}
      onSkip={() => router.back()}
    />
  )
}
