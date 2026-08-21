/**
 * Cliente de TanStack Query.
 *
 * Configuración deliberadamente conservadora: MESH lee un catálogo curado de
 * una docena de artistas que cambia cuando alguien carga contenido, no cada
 * minuto.
 */

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { reportError } from '../observability/report.ts'

import { classify } from './errors.ts'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    /**
     * Toda consulta y toda mutación que falla se reporta, desde un solo lugar.
     *
     * La alternativa era un `onError` en cada `useQuery` de la app: media docena
     * se olvidarían el primer día, y los que faltaran serían justo los que
     * nadie mira. Ver ADR-026.
     *
     * `surface` sale de la **primera parte de la queryKey**, que es siempre un
     * nombre nuestro y constante — `'chat'`, `'reviews'`, `'artists'`. Las
     * partes siguientes se descartan a propósito: ahí viven el id de la
     * conversación y el slug del artista.
     */
    queryCache: new QueryCache({
      onError: (error, query) => {
        reportError(error, { surface: `query:${surfaceOf(query.queryKey)}` })
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        reportError(error, {
          surface: `mutation:${surfaceOf(mutation.options.mutationKey)}`,
        })
      },
    }),
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

/**
 * El primer tramo de una clave, si es un texto seguro.
 *
 * Se filtra por forma y no por lista: cualquier cosa que no sea letras, números
 * o guiones queda afuera. Un uuid tiene guiones y números, pero nunca es el
 * primer tramo de una clave nuestra — y aun si alguien lo pusiera ahí por
 * error, el largo lo descarta.
 */
function surfaceOf(key: unknown): string {
  const first = Array.isArray(key) ? key[0] : key
  if (typeof first !== 'string') return 'desconocida'
  return /^[a-z][a-z0-9-]{0,31}$/i.test(first) ? first : 'desconocida'
}
