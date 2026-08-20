/**
 * El cliente de Supabase. Uno solo, para toda la app.
 *
 * Las dos variables de entorno son publicables por diseño: la URL del proyecto
 * y la anon key. La anon key no otorga nada — la autorización la hace RLS con
 * `auth.uid()`, no la clave. La que sí otorga todo es la service role, y esa no
 * existe en este workspace: vive en `tools/seed`, y un test verifica que el
 * string `service_role` no aparezca en el bundle.
 *
 * `app/` tiene prohibido importar este archivo (regla de lint, ADR-008). Las
 * consultas viven en `features/<x>/queries.ts`.
 */

import { createClient } from '@supabase/supabase-js'

import type { Database } from '@mesh/domain/db'

import { secureStorage } from './secure-storage.ts'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (url == null || anonKey == null) {
  // Falla en el arranque y no en la primera consulta. Un cliente construido con
  // `undefined` produce un 404 sin explicación seis pantallas después.
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env.local.',
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    // En un cliente nativo no hay una URL de la que sacar la sesión: el enlace
    // vuelve por deep link y lo maneja `features/auth`.
    detectSessionInUrl: false,
    // PKCE y no el flujo implícito: entrar con Google abre el navegador y
    // vuelve con un `code` que hay que canjear. Sin PKCE volvería con el token
    // en el fragmento de la URL, que en un teléfono queda en el historial del
    // navegador y en los logs del sistema. Ver ADR-015.
    flowType: 'pkce',
  },
})
