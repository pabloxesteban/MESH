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

/**
 * Un cliente con PKCE y almacenamiento en memoria, igual que el de la app.
 *
 * El `flowType: 'pkce'` no es un detalle: el `code_verifier` que guarda acá es
 * lo que después permite canjear el código del enlace de recuperación. Un
 * cliente sin PKCE recibiría otra clase de enlace y el test estaría probando un
 * camino que la app no usa.
 *
 * En memoria y no compartido, porque cada instancia es **un teléfono**: dos
 * clientes distintos es exactamente el caso de abrir el correo en otro
 * dispositivo.
 */
export function pkceClient(): SupabaseClient<Database> {
  if (ANON_KEY == null) {
    throw new Error('Falta SUPABASE_ANON_KEY para los tests de integración')
  }
  const memoria = new Map<string, string>()
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: false,
      storage: {
        getItem: (key) => memoria.get(key) ?? null,
        setItem: (key, value) => {
          memoria.set(key, value)
        },
        removeItem: (key) => {
          memoria.delete(key)
        },
      },
    },
  })
}

const MAILPIT = process.env['MAILPIT_URL'] ?? 'http://127.0.0.1:54324'

/**
 * El último enlace que le llegó a una casilla.
 *
 * Se lee el correo de verdad y no se genera el enlace con `generateLink()`:
 * `generateLink` devuelve un enlace SIN PKCE, así que probaría un camino que la
 * app no recorre. Lo que decide si alguien recupera su cuenta es el enlace que
 * efectivamente llega al buzón.
 */
export async function lastLinkTo(email: string): Promise<string> {
  const search = `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`
  const found = (await (await fetch(search)).json()) as {
    messages?: Array<{ ID: string }>
  }
  const id = found.messages?.[0]?.ID
  if (id == null) throw new Error(`no llegó ningún correo a ${email}`)

  const message = (await (
    await fetch(`${MAILPIT}/api/v1/message/${id}`)
  ).json()) as {
    Text?: string
    HTML?: string
  }
  const link = (`${message.Text ?? ''} ${message.HTML ?? ''}`.match(
    /https?:\/\/[^\s"'<>]+/g,
  ) ?? [])[0]
  if (link == null)
    throw new Error(`el correo a ${email} no tiene ningún enlace`)
  return link
}

/** Sigue el `verify` de GoTrue y devuelve la URL con la que vuelve la app. */
export async function followVerify(link: string): Promise<string> {
  const response = await fetch(link, { redirect: 'manual' })
  const location = response.headers.get('location')
  if (location == null) {
    throw new Error(`verify no redirigió (${response.status})`)
  }
  return location
}
