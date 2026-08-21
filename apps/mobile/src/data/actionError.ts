/**
 * La frase de un error de acción, en una línea.
 *
 * `ErrorView` ya traduce bien los errores de **carga**: usa `classify()` y
 * muestra la causa correcta con su acción. Pero los errores de **acción** —
 * mandar un mensaje, dejar una reseña, subir una obra— se venían resolviendo
 * cada uno con una sola frase fija:
 *
 * ```ts
 * onError: () => setError(t('chat.error'))
 * ```
 *
 * Eso dice lo mismo estés sin señal, esté caído el servidor, o te haya
 * rechazado una política. Y **sin señal es el caso más común de un teléfono**
 * y el único donde la frase específica de la acción es peor que una genérica:
 * "no se pudo enviar el mensaje" suena a que la app se rompió, cuando lo que
 * pasa es que estás en el subte. Además es el único donde hay algo concreto
 * que hacer.
 *
 * Por eso este helper **solo se mete con `offline`**:
 *
 * - **`offline`** → se dice que no hay conexión, y qué revisar.
 * - **`permission`** → se deja la frase de la acción a propósito. Decir "no
 *   tenés permiso" cuando alguien te bloqueó le confirma que lo bloquearon, y
 *   [ADR-023](../../../../docs/decisions/ADR-023-moderation.md) dice que eso no
 *   se sabe. Es el mismo motivo por el que `permission` comparte texto con
 *   `notFound` en `errors.ts`.
 * - **`server` / `notFound` / `unknown`** → la frase de la acción es más útil
 *   que cualquier genérica: sabe de qué acción se trata.
 */

import { classify } from './errors.ts'
import type { TranslationKey } from '../i18n/index.ts'

/** La clave de i18n que le corresponde a un error de acción. */
export function actionErrorKey(
  error: unknown,
  fallback: TranslationKey,
): TranslationKey {
  return classify(error) === 'offline' ? 'error.offline.action' : fallback
}
