/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El perfil vive en memoria: alcanza para recorrer el onboarding y cambiar el
 * radio, que es lo que el preview tiene que poder mostrar.
 */

import { locationLabel } from '@mesh/domain'

import {
  PREVIEW_ACCOUNT_CREATED_AT,
  previewAccount,
  previewLocation,
  updatePreviewAccount,
} from '../../../preview/store.ts'

export type OnboardingIntent = 'offering' | 'looking'

export interface Account {
  readonly displayName: string | null
  readonly onboardingIntent: OnboardingIntent | null
  readonly adultConfirmedAt: string | null
  readonly createdAt: string
  readonly avatarUrl: string | null
  readonly cityLocationId: string | null
  readonly citySlug: string | null
  readonly cityLabel: string | null
}

export interface AccountPatch {
  readonly displayName?: string | null
  readonly onboardingIntent?: OnboardingIntent
  readonly cityLocationId?: string | null
}

/** Fecha fija: en el preview importa que haya declaración, no cuándo. */
const DECLARADO = '2026-08-20T12:00:00.000Z'

let mayor = false

/** El slug detrás de un id sintético de `previewLocation`, o `null`. */
function slugOfLocationId(id: string | null): string | null {
  if (id == null) return null
  return id.startsWith('preview-loc-') ? id.slice('preview-loc-'.length) : null
}

export async function fetchAccount(): Promise<Account> {
  const stored = previewAccount()
  const citySlug = slugOfLocationId(stored.cityLocationId)
  return {
    displayName: stored.displayName,
    onboardingIntent: stored.onboardingIntent,
    adultConfirmedAt: mayor ? DECLARADO : null,
    createdAt: PREVIEW_ACCOUNT_CREATED_AT,
    avatarUrl: stored.avatarDataUri,
    cityLocationId: stored.cityLocationId,
    citySlug,
    cityLabel: citySlug != null ? locationLabel(citySlug) : null,
  }
}

export async function confirmAdult(): Promise<void> {
  mayor = true
}

export async function updateAccount(patch: AccountPatch): Promise<void> {
  updatePreviewAccount(patch)
}

export async function resolveLocationId(slug: string): Promise<string | null> {
  return previewLocation(slug)?.id ?? null
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
