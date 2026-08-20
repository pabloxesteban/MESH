/**
 * Subida de la foto de una reseña.
 *
 * Hermano de `features/projects/upload.ts` y con la misma disciplina, más una
 * diferencia que importa: **el bucket `reviews` es de lectura pública.** Una
 * referencia de proyecto es privada; esto se va a ver en el perfil de un
 * artista, y por eso la pantalla lo dice antes de subir nada.
 *
 * Que sea público hace la recodificación todavía más necesaria. La foto del
 * tatuaje recién hecho se saca en el estudio, y el EXIF de esa foto lleva las
 * coordenadas del estudio. `expo-image-manipulator` reescribe el archivo desde
 * los píxeles: lo que sale no tiene EXIF, ni GPS, ni marca de cámara.
 *
 * El orden es el mismo de siempre y por los mismos motivos:
 *
 *   elegir → recodificar → validar → subir el objeto → escribir la fila
 */

import * as ImageManipulator from 'expo-image-manipulator'
import { randomUUID } from 'expo-crypto'
import { reviewPath, validateUpload, type UploadMimeType } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'
import { UploadError } from '../projects/upload.ts'

/** Lado mayor. Una foto de reseña se muestra chica y en una lista. */
const MAX_DIMENSION = 1200

const OUTPUT_MIME: UploadMimeType = 'image/jpeg'

export interface ReviewPhotoResult {
  readonly mediaId: string
  readonly path: string
}

export async function uploadReviewPhoto(
  userId: string,
  localUri: string,
  deps: {
    manipulate?: typeof manipulateToJpeg
    readAsBlob?: (uri: string) => Promise<Blob>
  } = {},
): Promise<ReviewPhotoResult> {
  const manipulate = deps.manipulate ?? manipulateToJpeg
  const readAsBlob = deps.readAsBlob ?? defaultReadAsBlob

  const cleanUri = await manipulate(localUri)
  const blob = await readAsBlob(cleanUri)

  const problems = validateUpload({
    mimeType: OUTPUT_MIME,
    byteSize: blob.size,
  })
  if (problems.length > 0) throw new UploadError(problems.join(' '))

  // El id lo genera el cliente y la ruta se deriva de él. El nombre que traía
  // el archivo no participa: sin esto, un nombre con `../` sería una ruta.
  const mediaId = randomUUID()
  const path = reviewPath(userId, mediaId, OUTPUT_MIME)

  const { error: uploadError } = await supabase.storage
    .from('reviews')
    .upload(path, blob, { contentType: OUTPUT_MIME, upsert: false })

  if (uploadError != null) throw new UploadError(uploadError.message)

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      id: mediaId,
      bucket: 'reviews',
      path,
      mime_type: OUTPUT_MIME,
      byte_size: blob.size,
      owner_user_id: userId,
    })
    .select('id')
    .single()

  if (error != null || data == null) {
    // El objeto quedó huérfano: cuenta contra la cuota de la persona sin que
    // ella pueda verlo ni borrarlo.
    await supabase.storage.from('reviews').remove([path])
    throw new UploadError(error?.message ?? 'no se pudo registrar la imagen')
  }

  return { mediaId: data.id, path }
}

export async function manipulateToJpeg(uri: string): Promise<string> {
  const context = ImageManipulator.ImageManipulator.manipulate(uri)
  context.resize({ width: MAX_DIMENSION })
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
