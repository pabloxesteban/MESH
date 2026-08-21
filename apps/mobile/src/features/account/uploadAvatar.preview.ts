/**
 * Versión de preview de `uploadAvatar.ts`. Ver apps/mobile/preview/store.ts.
 *
 * Mismo criterio que `artist/upload.preview.ts`: sin storage, la imagen elegida
 * se guarda como data URI en memoria. **No recorta** — el recorte lo hace
 * `expo-image-manipulator`, que es nativo, y el preview corre en el navegador.
 * Alcanza para ver la foto cambiar en el header de Perfil, que es lo que este
 * flujo tiene que dejar mirar.
 */

import {
  previewOwnedProfessional,
  setPreviewAccountAvatar,
  setPreviewProfessionalAvatar,
} from '../../../preview/store.ts'

export interface AvatarCrop {
  readonly originX: number
  readonly originY: number
  readonly side: number
}

export interface AvatarUploadResult {
  readonly mediaId: string
  readonly path: string
}

async function toDataUri(localUri: string): Promise<string> {
  const response = await fetch(localUri)
  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('no se pudo leer la imagen'))
    reader.readAsDataURL(blob)
  })
}

export async function uploadAvatar(
  _userId: string,
  localUri: string,
  _crop: AvatarCrop,
  options: { readonly professionalId: string | null },
): Promise<AvatarUploadResult> {
  const dataUri = await toDataUri(localUri)

  setPreviewAccountAvatar(dataUri)
  if (options.professionalId != null || previewOwnedProfessional() != null) {
    setPreviewProfessionalAvatar(dataUri)
  }

  const mediaId = `preview-avatar-${String(Date.now())}`
  return { mediaId, path: mediaId }
}
