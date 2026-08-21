/**
 * El export en el preview: un JSON chico y horneado.
 *
 * Sin red y sin sistema de archivos. Alcanza para mirar la pantalla, el
 * resumen y el botón de copiar. Que el export traiga lo tuyo y **no lo que
 * escribieron otros** se prueba en `supabase/tests/59_account_export.sql`.
 */

import type { ExportResult } from './exportAccount.ts'

export class ExportError extends Error {}

export async function exportAccount(): Promise<ExportResult> {
  const datos = {
    exportado_el: '2026-08-21T12:00:00.000Z',
    que_es:
      'Todo lo que MESH guarda de vos. Lo que escribieron otras personas no está: eso es de ellas, y lo podés seguir leyendo en la app.',
    cuenta: { nombre: 'Vos', correo: 'vos@ejemplo.test' },
    busquedas: [{ titulo: 'Algo de línea fina' }],
    conversaciones: [
      { con: 'Delfina Roig', tus_mensajes: [{ texto: 'hola, cuánto sale' }] },
    ],
    asistente: [],
    turnos: [],
    resenas_que_escribiste: [],
    obra_guardada: [],
    denuncias_que_hiciste: [],
    bloqueos: [],
    avisos: [],
    perfil_de_artista: null,
  }

  return { json: JSON.stringify(datos, null, 2), shared: false }
}
