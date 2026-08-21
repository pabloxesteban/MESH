/**
 * Declarar mayoría de edad, desde donde sea.
 *
 * Un hook y no una llamada suelta porque hay **dos** lugares que la declaran y
 * los dos tienen que invalidar la cuenta en caché después: crear cuenta
 * (ADR-030) y la puerta del turno, que es donde la regla se impone de verdad
 * (ADR-025). Sin invalidar, la app sigue creyendo que no está declarada y
 * vuelve a pedirla.
 *
 * Nunca tira: si la escritura falla, la base va a rechazar el turno igual y ahí
 * se vuelve a pedir. Cortar el alta de una cuenta por esto sería peor.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { confirmAdult } from '@/features/account/queries.ts'

export function useConfirmAdult(): () => void {
  const client = useQueryClient()

  const declarar = useMutation({
    mutationFn: confirmAdult,
    onSuccess: () => client.invalidateQueries({ queryKey: ['account'] }),
  })

  return useCallback(() => {
    declarar.mutate(undefined, { onError: () => undefined })
  }, [declarar])
}
