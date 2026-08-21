/**
 * El perfil propio: lo único que la persona escribe sobre sí misma.
 *
 * No incluye el email — vive en `auth.users` y nunca se copia a una tabla que
 * el cliente lee (ver la migración de `profiles`).
 */

import { locationLabel } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'
import { avatarUrl } from '../artists/queries.ts'

/**
 * Qué eligió hacer primero al registrarse.
 *
 * NO es un rol excluyente: quien eligió `offering` sigue pudiendo buscar, y al
 * revés. Es la preferencia que decide qué pantalla se abre primero y si
 * mostramos el acceso al estudio. `null` = todavía no contestó.
 */
export type OnboardingIntent = 'offering' | 'looking'

export interface Account {
  readonly displayName: string | null
  readonly onboardingIntent: OnboardingIntent | null
  /**
   * Cuándo declaró ser mayor de 18, o `null` si no lo hizo.
   *
   * No hay fecha de nacimiento en ningún lado: lo que se guarda es la
   * declaración con su hora, y nada más. Ver ADR-025.
   */
  readonly adultConfirmedAt: string | null
  /** Para "Miembro desde {mes año}" en el header de Perfil. */
  readonly createdAt: string
  /** URL ya resuelta del avatar personal, o `null` sin foto. */
  readonly avatarUrl: string | null
  readonly cityLocationId: string | null
  /** El slug de la taxonomía (`palermo`), para preseleccionar el selector. */
  readonly citySlug: string | null
  /** El nombre para mostrar ("Palermo"), o `null` sin ubicación cargada. */
  readonly cityLabel: string | null
}

export async function fetchAccount(): Promise<Account> {
  // Sin filtro por id: la política de `profiles` ya restringe a la fila propia,
  // y repetir el filtro acá invitaría a creer que la seguridad vive en el
  // cliente.
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `display_name, onboarding_intent, adult_confirmed_at, created_at,
       city_location_id,
       media_assets ( path ),
       locations ( slug )`,
    )
    .maybeSingle()

  if (error != null) throw error

  const avatarPath = (
    data?.media_assets as { path: string } | null | undefined
  )?.path
  const citySlug = (data?.locations as { slug: string } | null | undefined)
    ?.slug

  return {
    displayName: data?.display_name ?? null,
    onboardingIntent: data?.onboarding_intent ?? null,
    adultConfirmedAt: data?.adult_confirmed_at ?? null,
    // `created_at` siempre está: la fila nace con el usuario (ver
    // `handle_new_user`), así que el único caso sin ella es sin sesión, y esa
    // pantalla ni llega a pedir esto.
    createdAt: data?.created_at ?? new Date().toISOString(),
    avatarUrl: avatarPath != null ? avatarUrl(avatarPath) : null,
    cityLocationId: data?.city_location_id ?? null,
    citySlug: citySlug ?? null,
    cityLabel: citySlug != null ? locationLabel(citySlug) : null,
  }
}

/**
 * Declara que es mayor de edad.
 *
 * Por RPC y no por un update: la columna no está en `AccountPatch` a propósito.
 * Si el cliente pudiera escribirla, podría también antedatarla — y lo que este
 * registro tiene que conservar es exactamente cuándo se dijo. Ver ADR-025.
 */
export async function confirmAdult(): Promise<void> {
  const { error } = await supabase.rpc('confirm_adult')
  if (error != null) throw error
}

export interface AccountPatch {
  readonly displayName?: string | null
  readonly onboardingIntent?: OnboardingIntent
  readonly cityLocationId?: string | null
}

export async function updateAccount(patch: AccountPatch): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id
  if (userId == null) throw new Error('sin sesión')

  const { error } = await supabase
    .from('profiles')
    .update({
      ...(patch.displayName !== undefined
        ? { display_name: patch.displayName }
        : {}),
      ...(patch.onboardingIntent !== undefined
        ? { onboarding_intent: patch.onboardingIntent }
        : {}),
      ...(patch.cityLocationId !== undefined
        ? { city_location_id: patch.cityLocationId }
        : {}),
    })
    .eq('id', userId)

  if (error != null) throw error
}

/**
 * El id de `locations` para un slug de la taxonomía, o `null` si no existe.
 *
 * `SearchLocationScreen` trabaja con slugs (`palermo`); `profiles.city_location_id`
 * guarda el id de la fila. Este es el único lugar que cruza uno al otro.
 */
export async function resolveLocationId(slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('locations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (error != null) throw error
  return data?.id ?? null
}

/** Si esta persona quiere recibir avisos. Ver ADR-027. */
export async function fetchNotificationsOptIn(
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notifications_opt_in')
    .eq('id', userId)
    .maybeSingle()
  if (error != null) throw error
  return data?.notifications_opt_in ?? true
}

/**
 * Enciende o apaga los avisos.
 *
 * Apagado, los triggers **no escriben**: no es que se escriban y no se muestren.
 * Eso vive del lado de la base, en `push_notification()`.
 */
export async function updateNotificationsOptIn(
  userId: string,
  value: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ notifications_opt_in: value })
    .eq('id', userId)
  if (error != null) throw error
}
