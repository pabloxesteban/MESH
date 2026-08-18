/**
 * Genera el código de reclamo de un artista.
 *
 * Es lo que MESH le entrega a la persona para que pase a manejar su portafolio
 * desde la app. Corre con la service role, como todo en este workspace: la tabla
 * `professional_claims` es inaccesible para el cliente a propósito.
 *
 * Se imprime UNA vez. No se guarda en el repo, no se manda por mail junto con
 * nada más, y si se pierde se genera otro — regenerar invalida el anterior.
 *
 * Uso: npm run content:claim -- --slug briza-maldonado
 */

import { createServiceClient } from './upsert.ts'
import { assertNotBundled } from './guard.ts'

function arg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? null : (process.argv[index + 1] ?? null)
}

/**
 * Ocho caracteres de un alfabeto sin ambigüedades visuales.
 *
 * Sin I, O, 0 ni 1: el código se dicta por teléfono o se copia de una captura,
 * y "¿es o o cero?" es una llamada más. 32 símbolos elevado a 8 son 10^12
 * combinaciones, que para diez artistas sobra.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generarCodigo(): string {
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(
    bytes,
    (byte) => ALFABETO[byte % ALFABETO.length] as string,
  ).join('')
}

async function main(): Promise<void> {
  assertNotBundled()

  const slug = arg('slug')
  const url = process.env['SUPABASE_URL']

  if (slug == null || url == null) {
    console.error(
      'Uso: npm run content:claim -- --slug <slug-del-artista>\n' +
        'Necesita SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
    )
    process.exit(1)
  }

  const client = createServiceClient(url)

  const { data: professional, error } = await client
    .from('professionals')
    .select('id, display_name, owner_user_id')
    .eq('slug', slug)
    .maybeSingle()

  if (error != null) throw error
  if (professional == null) {
    console.error(`✗ No existe ningún profesional con slug "${slug}".`)
    process.exit(1)
  }

  if (professional.owner_user_id != null) {
    console.error(
      `✗ "${slug}" ya está reclamado. Para pasárselo a otra persona hay que\n` +
        '  liberarlo primero, y eso es una decisión, no un comando.',
    )
    process.exit(1)
  }

  const code = generarCodigo()

  // upsert y no insert: regenerar el código de alguien que lo perdió tiene que
  // funcionar, y tiene que invalidar el anterior.
  const { error: upsertError } = await client
    .from('professional_claims')
    .upsert(
      {
        professional_id: professional.id,
        code,
        claimed_at: null,
        claimed_by: null,
      },
      { onConflict: 'professional_id' },
    )

  if (upsertError != null) throw upsertError

  console.log('')
  console.log(`  ${professional.display_name}`)
  console.log(`  Código: ${code}`)
  console.log('')
  console.log('  Se muestra una sola vez. Pasáselo por un canal directo, y si')
  console.log('  se pierde volvé a correr esto — el anterior deja de servir.')
  console.log('')
}

await main()
