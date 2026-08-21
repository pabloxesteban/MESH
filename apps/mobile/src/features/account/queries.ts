/**
 * El perfil propio: lo único que la persona escribe sobre sí misma.
 *
 * No incluye el email — vive en `auth.users` y nunca se copia a una tabla que
 * el cliente lee (ver la migración de `profiles`).
 */

import { supabase } from '../../data/supabase.ts'

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
}

export async function fetchAccount(): Promise<Account> {
  // Sin filtro por id: la política de `profiles` ya restringe a la fila propia,
  // y repetir el filtro acá invitaría a creer que la seguridad vive en el
  // cliente.
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, onboarding_intent, adult_confirmed_at')
    .maybeSingle()

  if (error != null) throw error

  return {
    displayName: data?.display_name ?? null,
    onboardingIntent: data?.onboarding_intent ?? null,
    adultConfirmedAt: data?.adult_confirmed_at ?? null,
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
    })
    .eq('id', userId)

  if (error != null) throw error
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
