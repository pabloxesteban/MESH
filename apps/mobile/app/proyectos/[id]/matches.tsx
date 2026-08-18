import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'

import { useSession } from '@/features/auth/SessionProvider.tsx'
import { MatchesScreen } from '@/features/matches/MatchesScreen.tsx'
import { fetchProject } from '@/features/projects/queries.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { asUuid } from '@/data/route-params.ts'
import { todayIso } from '@/data/today.ts'

/**
 * Matches de un proyecto.
 *
 * Reutiliza la misma pantalla que los matches por gusto: la diferencia está en
 * la entrada del motor, no en cómo se presenta el resultado. Dos pantallas
 * distintas para el mismo objeto se separarían.
 */
export default function ProjectMatchesRoute() {
  const raw = useLocalSearchParams<{ id: string }>()
  const id = asUuid(raw.id)
  const { userId } = useSession()

  const project = useQuery({
    queryKey: ['project', id],
    // Un id que no es un UUID no llega a Postgres: ahí explotaría con 22P02 y
    // se vería como un error de servidor en vez de como lo que es.
    enabled: id != null,
    queryFn: () => fetchProject(id as string),
  })

  if (id == null) {
    return <ErrorView cause="notFound" onBack={() => router.back()} />
  }

  return (
    <MatchesScreen
      userId={userId}
      today={todayIso()}
      onExplore={() => router.replace('/')}
      onOpenProfile={(slug) => router.push(`/artista/${slug}`)}
      {...(project.data != null
        ? {
            project: {
              id: project.data.id,
              styles: project.data.styles,
              ...(project.data.budget != null
                ? { budget: project.data.budget }
                : {}),
              ...(project.data.locationSlug != null
                ? { locationSlug: project.data.locationSlug }
                : {}),
            },
          }
        : {})}
    />
  )
}
