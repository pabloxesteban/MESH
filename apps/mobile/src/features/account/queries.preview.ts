/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El perfil vive en memoria: alcanza para recorrer el onboarding y cambiar el
 * radio, que es lo que el preview tiene que poder mostrar.
 */

import {
  previewAccount,
  updatePreviewAccount,
} from '../../../preview/store.ts'

export type OnboardingIntent = 'offering' | 'looking'

export interface Account {
  readonly displayName: string | null
  readonly onboardingIntent: OnboardingIntent | null
  readonly searchRadiusKm: number | null
}

export interface AccountPatch {
  readonly displayName?: string | null
  readonly onboardingIntent?: OnboardingIntent
  readonly searchRadiusKm?: number | null
}

export async function fetchAccount(): Promise<Account> {
  return previewAccount()
}

export async function updateAccount(patch: AccountPatch): Promise<void> {
  updatePreviewAccount(patch)
}
