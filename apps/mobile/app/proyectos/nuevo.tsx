import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'

import { useSession } from '@/features/auth/SessionProvider.tsx'
import { ProjectFormScreen } from '@/features/projects/ProjectFormScreen.tsx'
import { createProject } from '@/features/projects/queries.ts'

export default function NewProjectRoute() {
  const { userId } = useSession()
  const queryClient = useQueryClient()

  return (
    <ProjectFormScreen
      onCancel={() => router.back()}
      onSubmit={async (draft) => {
        if (userId == null) return
        await createProject(userId, draft)
        await queryClient.invalidateQueries({ queryKey: ['projects'] })
        router.replace('/proyectos')
      }}
    />
  )
}
