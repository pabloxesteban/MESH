import { router } from 'expo-router'

import { useSession } from '@/features/auth/SessionProvider.tsx'
import { TasteScreen } from '@/features/taste/TasteScreen.tsx'

export default function TasteRoute() {
  const { userId } = useSession()
  return <TasteScreen userId={userId} onExplore={() => router.replace('/')} />
}
