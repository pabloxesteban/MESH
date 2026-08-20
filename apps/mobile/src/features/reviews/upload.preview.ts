/**
 * Versión de preview de `upload.ts`. Ver apps/mobile/preview/store.ts.
 *
 * No hay storage: la foto elegida se guarda como data URI en memoria y se
 * pierde al recargar. Alcanza para recorrer el flujo y ver la reseña con su
 * foto en el perfil, que es lo que hay que poder mirar.
 *
 * **Lo que esta versión NO hace, y la de verdad sí: limpiar el EXIF.** Acá el
 * archivo se lee tal cual viene. En la app la foto se recodifica desde los
 * píxeles antes de subirla, y eso importa más en reseñas que en cualquier otro
 * lado: es una foto sacada en el estudio, con las coordenadas del estudio
 * adentro, y el bucket es de lectura pública.
 */

import { registerPreviewMedia } from '../../../preview/store.ts'

export interface ReviewPhotoResult {
  readonly mediaId: string
  readonly path: string
}

export async function uploadReviewPhoto(
  _userId: string,
  localUri: string,
): Promise<ReviewPhotoResult> {
  const response = await fetch(localUri)
  const blob = await response.blob()
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('no se pudo leer la imagen'))
    reader.readAsDataURL(blob)
  })

  const mediaId = `resena-${String(Date.now())}-${String(
    Math.floor(performance.now() * 1000),
  )}`
  registerPreviewMedia(mediaId, dataUri)

  return { mediaId, path: mediaId }
}
