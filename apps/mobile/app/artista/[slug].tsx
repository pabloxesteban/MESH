import { router, useLocalSearchParams } from 'expo-router'

import { ErrorView } from '@/components/ErrorView.tsx'
import { ProfileScreen } from '@/features/profile/ProfileScreen.tsx'
import { asSlug } from '@/data/route-params.ts'
import { todayIso } from '@/data/today.ts'

export default function ProfileRoute() {
  const raw = useLocalSearchParams<{ slug: string }>()
  const slug = asSlug(raw.slug)

  // Un enlace malformado se ve como "no encontramos esto", que es la verdad, y
  // no como un error de servidor.
  if (slug == null) {
    return <ErrorView cause="notFound" onBack={() => router.back()} />
  }

  return (
    <ProfileScreen
      slug={slug}
      today={todayIso()}
      onBack={() => router.back()}
      onContact={(artistSlug) => router.push(`/contacto/${artistSlug}`)}
    />
  )
}
