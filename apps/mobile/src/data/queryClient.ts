/**
 * Cliente de TanStack Query.
 *
 * Configuración deliberadamente conservadora: MESH lee un catálogo curado de
 * una docena de artistas que cambia cuando alguien carga contenido, no cada
 * minuto.
 */

import { QueryClient } from '@tanstack/react-query'

import { classify } from './errors.ts'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cinco minutos: el catálogo no cambia solo. Un `staleTime` de cero
        // vuelve a pedir el feed cada vez que la app vuelve del fondo, y eso
        // reordena el mazo debajo de la persona.
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: (failureCount, error) => {
          // Reintentar un rechazo de RLS o un 404 no lo va a arreglar, y
          // convierte un error instantáneo en tres segundos de espera.
          const cause = classify(error)
          if (cause === 'permission' || cause === 'notFound') return false
          return failureCount < 2
        },
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  })
}
