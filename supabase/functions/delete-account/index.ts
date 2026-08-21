// Borrar la cuenta, incluidos los archivos.
//
// Ver ADR-024.
//
// ## Por qué hace falta una función y no alcanza con una RPC
//
// El borrado de la base entero lo hace `delete_own_account()`, que es
// `security definer` y saca el id de `auth.uid()`. Lo que esa función **no**
// puede hacer es borrar archivos: en Supabase, borrar la fila de
// `storage.objects` deja el archivo huérfano en el bucket. Los archivos se
// borran con la API de storage, y para el bucket `portfolio` hace falta la
// service key.
//
// Así que el orden es: **primero los archivos, después la base.** Al revés, si
// el borrado de la base sale bien y el de archivos falla, quedan fotos de
// alguien que ya no existe y nadie con sesión para pedir que se vayan. En este
// orden, un fallo a mitad de camino deja la cuenta viva y se puede reintentar.
//
// ## Qué NO se borra, dicho sin vueltas
//
// - **El registro de que la cuenta se borró.** Es un uuid y una fecha en
//   `audit_events`, sin mail, sin nombre y sin nada de lo que había adentro. Es
//   la prueba de que se cumplió, no un archivo de lo cumplido.
// - **Los mensajes que la persona mandó, del lado del otro.** No aplica: la
//   conversación cuelga de su `user_id` y se va entera por cascade. El artista
//   pierde el hilo completo, que es lo correcto.

import { createClient } from 'jsr:@supabase/supabase-js@2'

import { logLine, withLogging } from '../_shared/log.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

/** Los buckets donde una persona sube con su propio id como carpeta. */
const OWN_BUCKETS = ['references', 'avatars', 'reviews'] as const

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Borra todo lo que hay bajo un prefijo.
 *
 * `list` devuelve como máximo 100 por página, así que hay que paginar. Sin el
 * bucle, una cuenta con más de 100 archivos se borraría a medias y en silencio
 * — que es la peor forma de fallar en un borrado.
 */
async function removePrefix(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<number> {
  let borrados = 0

  for (;;) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: 100 })

    if (error != null || data == null || data.length === 0) break

    const rutas = data.map((file) => `${prefix}/${file.name}`)
    const { error: removeError } = await admin.storage
      .from(bucket)
      .remove(rutas)
    if (removeError != null) throw removeError

    borrados += rutas.length
    if (data.length < 100) break
  }

  return borrados
}

Deno.serve(
  withLogging('delete-account', async (req, requestId) => {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method not allowed' }, 405)
    }

    const authHeader = req.headers.get('Authorization')
    if (authHeader == null) {
      return jsonResponse({ error: 'hace falta una sesión' }, 401)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user == null) {
      return jsonResponse({ error: 'sesión inválida' }, 401)
    }

    // El slug del perfil propio, para saber qué carpeta de `portfolio` limpiar.
    // Con el JWT de quien llama y filtrando por dueño: la tabla tiene una
    // política de lectura pública para lo publicado, así que sin el `.eq` esto
    // podría traer el perfil de cualquiera.
    const { data: propio } = await supabase
      .from('professionals')
      .select('slug')
      .eq('owner_user_id', user.id)
      .limit(1)
      .maybeSingle()

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    let archivos = 0
    try {
      for (const bucket of OWN_BUCKETS) {
        archivos += await removePrefix(admin, bucket, user.id)
      }
      if (propio?.slug != null) {
        archivos += await removePrefix(admin, 'portfolio', String(propio.slug))
      }
    } catch {
      // Se corta acá a propósito: la cuenta sigue viva y se puede reintentar. Si
      // siguiéramos, quedarían fotos de alguien que ya no existe y nadie con
      // sesión para pedir que se vayan.
      logLine({
        fn: 'delete-account',
        event: 'storage_failed',
        request_id: requestId,
      })
      return jsonResponse({ error: 'no se pudieron borrar los archivos' }, 502)
    }

    // La base, con el JWT de la persona: la función saca el id de `auth.uid()`,
    // así que corre sobre su cuenta y sobre ninguna otra. Deliberadamente NO se
    // usa la service key acá — con ella, un error de programación borraría a
    // cualquiera.
    const { error } = await supabase.rpc('delete_own_account')
    if (error != null) {
      // Un borrado que falla tiene que dejar rastro: es un derecho que no se
      // cumplió, y la persona se va creyendo que sí. El código de Postgres sí,
      // el mensaje no — lleva valores de la fila.
      logLine({
        fn: 'delete-account',
        event: 'delete_failed',
        request_id: requestId,
        code: error.code ?? 'unknown',
      })
      return jsonResponse({ error: 'no se pudo borrar la cuenta' }, 500)
    }

    // Cuántos archivos, sin decir de quién eran ni cómo se llamaban.
    logLine({
      fn: 'delete-account',
      event: 'deleted',
      request_id: requestId,
    })

    return jsonResponse({ deleted: true, files: archivos }, 200)
  }),
)
