/**
 * Borrar la cuenta, desde la app.
 *
 * Una sola llamada, a una Edge Function que hace las dos mitades en el orden
 * correcto: primero los archivos de storage, después la base. Ver ADR-024 y
 * `supabase/functions/delete-account/`.
 *
 * No hay período de gracia ni "cuenta desactivada". Alguien que pide que lo
 * borren pidió eso, no que lo guardemos treinta días por si cambia de idea.
 */

import { supabase } from '../../data/supabase.ts'

export class DeleteAccountError extends Error {}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: {},
  })
  if (error != null) throw new DeleteAccountError(error.message)

  // La sesión quedó apuntando a un usuario que ya no existe. Sin esto, la
  // próxima consulta vuelve con un 401 sin explicación y la app se ve rota en
  // vez de vacía.
  await supabase.auth.signOut()
}
