import { router, useLocalSearchParams } from 'expo-router'

import { ContactScreen } from '@/features/contact/ContactScreen.tsx'
import { ErrorView } from '@/components/ErrorView.tsx'
import { asSlug } from '@/data/route-params.ts'

export default function ContactRoute() {
  const raw = useLocalSearchParams<{ slug: string }>()
  const slug = asSlug(raw.slug)

  if (slug == null) {
    return <ErrorView cause="notFound" onBack={() => router.back()} />
  }

  return <ContactScreen slug={slug} onBack={() => router.back()} />
}
