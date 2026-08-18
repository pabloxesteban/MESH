import { router, useLocalSearchParams } from 'expo-router'

import { ContactScreen } from '@/features/contact/ContactScreen.tsx'

export default function ContactRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  return <ContactScreen slug={slug} onBack={() => router.back()} />
}
