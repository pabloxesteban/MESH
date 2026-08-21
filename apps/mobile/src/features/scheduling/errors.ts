/**
 * Qué salió mal al agendar, traducido a una clave de i18n.
 *
 * Vive en su propio archivo y no en `queries.ts` por una razón mecánica: el
 * swap del preview reescribe `queries.ts` a `queries.preview.ts`, **también
 * cuando el import sale del propio archivo de preview**. Un
 * `export { scheduleErrorOf } from './queries.ts'` ahí adentro termina siendo
 * un getter que se llama a sí mismo, y el síntoma es un stack overflow que no
 * dice de dónde viene. Este módulo no está en `PREVIEW_TARGETS`, así que las
 * dos versiones lo importan sin dar la vuelta. Ver `preview-swap.test.ts`.
 */

/** Lo que puede salir mal al agendar, en claves de i18n. */
export type ScheduleError = 'taken' | 'past' | 'notYours' | 'minor' | 'unknown'

export function scheduleErrorOf(code: string | undefined): ScheduleError {
  if (code === '23P01') return 'taken'
  if (code === '22023') return 'past'
  if (code === '42501') return 'notYours'
  // SQLSTATE propio de MESH. `42501` ya significa "esta conversación no es
  // tuya", y el artista necesita leer dos cosas distintas: una la arregla él,
  // la otra la tiene que arreglar la persona. Ver ADR-025.
  if (code === 'M0018') return 'minor'
  return 'unknown'
}
