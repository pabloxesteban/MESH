/**
 * Borrar la cuenta en el preview: no borra nada.
 *
 * El preview no tiene backend, así que esto solo deja mirar la pantalla y su
 * confirmación escrita. Que no borre está bien: la garantía de que el borrado
 * es real vive en `supabase/tests/56_account_deletion.sql`.
 */

export class DeleteAccountError extends Error {}

export async function deleteAccount(): Promise<void> {
  // Sin efecto a propósito.
}
