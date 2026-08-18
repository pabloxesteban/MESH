import { router, useLocalSearchParams } from 'expo-router'

import { ProfileScreen } from '@/features/profile/ProfileScreen.tsx'
import { todayIso } from '@/data/today.ts'

export default function ProfileRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>()

  return (
    <ProfileScreen
      slug={slug}
      today={todayIso()}
      onBack={() => router.back()}
      onContact={(artistSlug) => router.push(`/contacto/${artistSlug}`)}
    />
  )
}
