/**
 * Subida de la foto de perfil personal.
 *
 * Hermano de `features/reviews/upload.ts` y con la misma disciplina: recorte y
 * recodificación primero, para que lo que sale no tenga EXIF, y validar recién
 * sobre el resultado final.
 *
 * **Una imagen, dos lugares.** `profiles.avatar_media_id` es la foto personal
 * de Perfil; `professionals.avatar_media_id` es la de la tarjeta en Inicio.
 * Son columnas distintas a propósito (ADR-030 no las confunde), pero cuando
 * quien sube la foto también tiene un perfil de artista propio, es la misma
 * cara — así que esta subida escribe las dos. Es también lo que hace que el
 * aviso "Todavía no subiste una foto de perfil" (sobre la tarjeta) desaparezca
 * solo al tocar "Cambiar foto" desde el header de Perfil, sin un flujo aparte.
 *
 * El orden:
 *
 *   recortar (según lo que decidió el gesto o los botones) → recodificar a
 *   cuadrado → validar → subir el objeto → escribir `media_assets` → apuntar
 *   `profiles` y, si corresponde, `professionals`
 */

import * as ImageManipulator from 'expo-image-manipulator'
import { randomUUID } from 'expo-crypto'
import { avatarPath, validateUpload, type UploadMimeType } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'
import { UploadError } from '../projects/upload.ts'

/** Lado del cuadrado final. Es un avatar: no hace falta más resolución que la del `lg` de `Avatar`. */
const OUTPUT_DIMENSION = 640

const OUTPUT_MIME: UploadMimeType = 'image/jpeg'

/** El recorte cuadrado, en píxeles de la imagen ORIGINAL (no de la pantalla). */
export interface AvatarCrop {
  readonly originX: number
  readonly originY: number
  readonly side: number
}

export interface AvatarUploadResult {
  readonly mediaId: string
  readonly path: string
}

export async function uploadAvatar(
  userId: string,
  localUri: string,
  crop: AvatarCrop,
  options: { readonly professionalId: string | null },
  deps: {
    manipulate?: typeof manipulateAvatar
    readAsBlob?: (uri: string) => Promise<Blob>
  } = {},
): Promise<AvatarUploadResult> {
  const manipulate = deps.manipulate ?? manipulateAvatar
  const readAsBlob = deps.readAsBlob ?? defaultReadAsBlob

  const croppedUri = await manipulate(localUri, crop)
  const blob = await readAsBlob(croppedUri)

  const problems = validateUpload({
    mimeType: OUTPUT_MIME,
    byteSize: blob.size,
  })
  if (problems.length > 0) throw new UploadError(problems.join(' '))

  const mediaId = randomUUID()
  const path = avatarPath(userId, mediaId, OUTPUT_MIME)

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: OUTPUT_MIME, upsert: false })
  if (uploadError != null) throw new UploadError(uploadError.message)

  const { error: mediaError } = await supabase.from('media_assets').insert({
    id: mediaId,
    bucket: 'avatars',
    path,
    mime_type: OUTPUT_MIME,
    byte_size: blob.size,
    owner_user_id: userId,
  })
  if (mediaError != null) {
    await supabase.storage.from('avatars').remove([path])
    throw new UploadError(mediaError.message)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_media_id: mediaId })
    .eq('id', userId)
  if (profileError != null) throw new UploadError(profileError.message)

  if (options.professionalId != null) {
    const { error: professionalError } = await supabase
      .from('professionals')
      .update({ avatar_media_id: mediaId })
      .eq('id', options.professionalId)
    // No revierte lo de arriba: la foto personal ya quedó bien, y esta parte
    // se puede reintentar sola desde el Estudio si hiciera falta. Peor sería
    // perder el trabajo del recorte por un fallo en el segundo `update`.
    if (professionalError != null) throw new UploadError(professionalError.message)
  }

  return { mediaId, path }
}

/** Recorta al cuadrado pedido y recodifica a JPEG. El resultado no conserva EXIF. */
export async function manipulateAvatar(
  uri: string,
  crop: AvatarCrop,
): Promise<string> {
  const context = ImageManipulator.ImageManipulator.manipulate(uri)
  context.crop({
    originX: Math.round(crop.originX),
    originY: Math.round(crop.originY),
    width: Math.round(crop.side),
    height: Math.round(crop.side),
  })
  context.resize({ width: OUTPUT_DIMENSION, height: OUTPUT_DIMENSION })
  const image = await context.renderAsync()
  const result = await image.saveAsync({
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  })
  return result.uri
}

async function defaultReadAsBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri)
  return response.blob()
}
