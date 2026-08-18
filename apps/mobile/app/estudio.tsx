import { router } from 'expo-router'

import { StudioScreen } from '@/features/artist/StudioScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

export default function StudioRoute() {
  const { userId } = useSession()
  return <StudioScreen userId={userId} onBack={() => router.back()} />
}
