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
  /** Radio de búsqueda en km. `null` = sin límite. */
}

export async function fetchAccount(): Promise<Account> {
  // Sin filtro por id: la política de `profiles` ya restringe a la fila propia,
  // y repetir el filtro acá invitaría a creer que la seguridad vive en el
  // cliente.
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, onboarding_intent')
    .maybeSingle()

  if (error != null) throw error

  return {
    displayName: data?.display_name ?? null,
    onboardingIntent: data?.onboarding_intent ?? null,
  }
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
