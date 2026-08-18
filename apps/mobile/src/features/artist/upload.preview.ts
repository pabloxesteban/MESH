/**
 * Versión de preview de `upload.ts`. Ver apps/mobile/preview/store.ts.
 *
 * No hay storage: la imagen elegida se guarda como data URI en memoria y se
 * pierde al recargar. Alcanza para recorrer el flujo y ver la pieza aparecer en
 * el mazo, que es lo que un preview tiene que dejar hacer.
 *
 * **Lo que esta versión NO hace, y la de verdad sí: limpiar el EXIF.** En el
 * navegador el archivo se lee tal cual viene. Está anotado acá y en
 * docs/design/preview.md porque es justo el tipo de diferencia que se olvida:
 * el preview no publica nada en ningún lado, así que no hay foto de nadie
 * viajando con las coordenadas de su casa.
 */

import { registerPreviewMedia } from '../../../preview/store.ts'

export interface PortfolioUploadResult {
  readonly mediaId: string
  readonly path: string
  readonly byteSize: number
}

export async function uploadPortfolioPiece(
  _professionalSlug: string,
  _userId: string,
  localUri: string,
): Promise<PortfolioUploadResult> {
  const response = await fetch(localUri)
  const blob = await response.blob()
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('no se pudo leer la imagen'))
    reader.readAsDataURL(blob)
  })

  const mediaId = `subida-${String(Date.now())}-${String(
    Math.floor(performance.now() * 1000),
  )}`
  registerPreviewMedia(mediaId, dataUri)

  return { mediaId, path: mediaId, byteSize: blob.size }
}
