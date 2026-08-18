/**
 * Versión de preview de `upload.ts`. Ver apps/mobile/preview/store.ts y el
 * mismo archivo del lado del estudio (features/artist/upload.preview.ts) —
 * misma idea: sin storage real, data URI en memoria, se pierde al recargar.
 */

import { registerPreviewMedia } from '../../../preview/store.ts'

export interface UploadResult {
  readonly mediaId: string
  readonly path: string
}

export class UploadError extends Error {}

export async function uploadReference(
  _userId: string,
  localUri: string,
): Promise<UploadResult> {
  const response = await fetch(localUri)
  const blob = await response.blob()
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new UploadError('no se pudo leer la imagen'))
    reader.readAsDataURL(blob)
  })

  const mediaId = `preview-ref-${String(Date.now())}-${String(
    Math.floor(performance.now() * 1000),
  )}`
  registerPreviewMedia(mediaId, dataUri)
  return { mediaId, path: mediaId }
}
