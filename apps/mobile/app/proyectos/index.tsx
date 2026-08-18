import { router } from 'expo-router'

import { ProjectsScreen } from '@/features/projects/ProjectsScreen.tsx'

export default function ProjectsRoute() {
  return (
    <ProjectsScreen
      onNew={() => router.push('/proyectos/nuevo')}
      onMatches={(projectId) => router.push(`/proyectos/${projectId}/matches`)}
    />
  )
}
