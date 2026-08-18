import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'

import { useSession } from '@/features/auth/SessionProvider.tsx'
import { MatchesScreen } from '@/features/matches/MatchesScreen.tsx'
import { fetchProject } from '@/features/projects/queries.ts'
import { todayIso } from '@/data/today.ts'

/**
 * Matches de un proyecto.
 *
 * Reutiliza la misma pantalla que los matches por gusto: la diferencia está en
 * la entrada del motor, no en cómo se presenta el resultado. Dos pantallas
 * distintas para el mismo objeto se separarían.
 */
export default function ProjectMatchesRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { userId } = useSession()
  const project = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
  })

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
