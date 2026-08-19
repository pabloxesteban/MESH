import { router } from 'expo-router'

import { AccountScreen } from '@/features/account/AccountScreen.tsx'
import { useSession } from '@/features/auth/SessionProvider.tsx'

export default function PerfilRoute() {
  const { userId } = useSession()
  return (
    <AccountScreen
      userId={userId}
      onOpenStudio={() => router.push('/estudio')}
    />
  )
}
