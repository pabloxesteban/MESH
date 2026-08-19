/**
 * Abrir el chat con un artista desde cualquier pantalla.
 *
 * Encapsula los dos pasos —crear el hilo si no existía, después navegar—
 * para que ninguna ruta tenga que saber que son dos. Si el hilo ya existía,
 * `openConversation` devuelve el mismo id: tocar "abrir chat" dos veces no
 * crea dos conversaciones.
 */

import { useMutation } from '@tanstack/react-query'

import { openConversation } from './queries.ts'

export function useOpenChat(
  userId: string | null,
  onOpened: (conversationId: string, title: string) => void,
) {
  const mutation = useMutation({
    mutationFn: async (input: { professionalId: string; name: string }) => ({
      id: await openConversation(userId as string, input.professionalId),
      name: input.name,
    }),
    onSuccess: (result) => onOpened(result.id, result.name),
  })

  return {
    isOpening: mutation.isPending,
    open: (professionalId: string, name: string) => {
      if (userId == null) return
      mutation.mutate({ professionalId, name })
    },
  }
}
