/**
 * Validación de parámetros de deep link.
 *
 * Todo lo que entra por una URL viene de afuera: `mesh://artista/{slug}` lo
 * puede escribir cualquiera, y llega directo a una consulta.
 *
 * RLS ya impide que se lea algo ajeno, así que esto no es la defensa —
 * **la defensa es RLS**. Lo que esto arregla es otra cosa: un id malformado
 * llega a Postgres, explota con `22P02 invalid input syntax for type uuid`, y la
 * persona ve "algo se rompió de nuestro lado" cuando lo que pasó es que el
 * enlace estaba mal. Un parámetro inválido tiene que verse como "no
 * encontramos esto", que es la verdad.
 *
 * Y de paso: un valor que nunca llega a la base es un valor que no puede
 * participar de nada raro más adelante.
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** El slug si es válido, `null` si no. Nunca lanza. */
export function asSlug(value: string | string[] | undefined): string | null {
  const single = typeof value === 'string' ? value : null
  if (single == null || single.length > 80) return null
  return SLUG.test(single) ? single : null
}

/** El UUID si es válido, `null` si no. Nunca lanza. */
export function asUuid(value: string | string[] | undefined): string | null {
  const single = typeof value === 'string' ? value : null
  if (single == null) return null
  return UUID.test(single) ? single : null
}
