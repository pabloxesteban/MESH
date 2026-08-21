/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El perfil vive en memoria: alcanza para recorrer el onboarding y cambiar el
 * radio, que es lo que el preview tiene que poder mostrar.
 */

import { previewAccount, updatePreviewAccount } from '../../../preview/store.ts'

export type OnboardingIntent = 'offering' | 'looking'

export interface Account {
  readonly displayName: string | null
  readonly onboardingIntent: OnboardingIntent | null
  readonly adultConfirmedAt: string | null
}

export interface AccountPatch {
  readonly displayName?: string | null
  readonly onboardingIntent?: OnboardingIntent
}

/** Fecha fija: en el preview importa que haya declaración, no cuándo. */
const DECLARADO = '2026-08-20T12:00:00.000Z'

let mayor = false

export async function fetchAccount(): Promise<Account> {
  return { ...previewAccount(), adultConfirmedAt: mayor ? DECLARADO : null }
}

export async function confirmAdult(): Promise<void> {
  mayor = true
}

export async function updateAccount(patch: AccountPatch): Promise<void> {
  updatePreviewAccount(patch)
}

let avisos = true

export async function fetchNotificationsOptIn(
  _userId: string,
): Promise<boolean> {
  return avisos
}

export async function updateNotificationsOptIn(
  _userId: string,
  value: boolean,
): Promise<void> {
  avisos = value
}
