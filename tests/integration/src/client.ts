/**
 * Cliente de tests de integración.
 *
 * Estos tests corren contra una instancia local (`supabase start`) usando la
 * **anon key**, igual que la app. Esa es la diferencia con los tests de pgTAP:
 * aquellos verifican las políticas desde adentro de Postgres, y estos verifican
 * el camino completo —PostgREST, JWT, RLS, RPC— que es donde viven los errores
 * de configuración que el SQL solo no muestra.
 *
 * Nunca usan la service-role key salvo para limpiar lo que escribieron, y eso
 * está marcado explícitamente donde pasa.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@mesh/domain/db'

export const SUPABASE_URL =
  process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321'

const ANON_KEY = process.env['SUPABASE_ANON_KEY']
const SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']

export function anonClient(): SupabaseClient<Database> {
  if (ANON_KEY == null) {
    throw new Error('Falta SUPABASE_ANON_KEY para los tests de integración')
  }
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Solo para limpiar. Ningún test verifica nada con esto. */
export function serviceClient(): SupabaseClient<Database> {
  if (SERVICE_KEY == null) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY para limpiar los fixtures')
  }
  return createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Abre una sesión anónima, como hace la app en el arranque. */
export async function signedInAnon(): Promise<{
  client: SupabaseClient<Database>
  userId: string
}> {
  const client = anonClient()
  const { data, error } = await client.auth.signInAnonymously()
  if (error != null || data.user == null) {
    throw new Error(`no se pudo abrir sesión anónima: ${error?.message}`)
  }
  return { client, userId: data.user.id }
}
