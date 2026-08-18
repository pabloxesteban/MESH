import { router } from 'expo-router'

import { useSession } from '@/features/auth/SessionProvider.tsx'
import { MatchesScreen } from '@/features/matches/MatchesScreen.tsx'
import { todayIso } from '@/data/today.ts'

export default function MatchesRoute() {
  const { userId } = useSession()
  return (
    <MatchesScreen
      userId={userId}
      today={todayIso()}
      onExplore={() => router.replace('/')}
      onOpenProfile={(slug) => router.push(`/artista/${slug}`)}
    />
  )
}
