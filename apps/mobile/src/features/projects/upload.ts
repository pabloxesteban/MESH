/**
 * Subida de imágenes de referencia.
 *
 * **La recodificación no es una optimización, es la limpieza de metadatos.**
 * Una foto de referencia sacada en casa lleva las coordenadas de esa casa en el
 * EXIF. `expo-image-manipulator` reescribe el archivo desde los píxeles, y lo
 * que sale no tiene EXIF, ni GPS, ni marca de cámara.
 *
 * El orden de los pasos importa y está pensado:
 *
 *   elegir → recodificar → validar → subir el objeto → escribir la fila
 *
 * Validar DESPUÉS de recodificar, porque el tamaño que cuenta es el del archivo
 * que se va a subir. Y escribir la fila AL FINAL, porque una fila de
 * `media_assets` que apunta a un objeto que no existe es peor que no tener nada:
 * la pantalla mostraría un hueco permanente.
 */

import * as ImageManipulator from 'expo-image-manipulator'
import { randomUUID } from 'expo-crypto'
import {
  MAX_UPLOAD_BYTES,
  referencePath,
  validateUpload,
  type UploadMimeType,
} from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'

/** Lado mayor al que se reduce antes de subir. Una referencia no necesita más. */
const MAX_DIMENSION = 1600

/**
 * Todo sale como JPEG.
 *
 * Un solo formato de salida significa un solo content-type y una sola
 * extensión, así que la ruta no depende de qué trajo el archivo. Un HEIC de
 * iPhone entra y sale JPEG.
 */
const OUTPUT_MIME: UploadMimeType = 'image/jpeg'

export interface UploadResult {
  readonly mediaId: string
  readonly path: string
}

export class UploadError extends Error {}

/**
 * Recodifica, valida y sube. Devuelve el id de la fila de `media_assets`.
 *
 * `readAsBlob` se inyecta para poder testear la cadena sin sistema de archivos.
 */
export async function uploadReference(
  userId: string,
  localUri: string,
  deps: {
    manipulate?: typeof manipulateToJpeg
    readAsBlob?: (uri: string) => Promise<Blob>
  } = {},
): Promise<UploadResult> {
  const manipulate = deps.manipulate ?? manipulateToJpeg
  const readAsBlob = deps.readAsBlob ?? defaultReadAsBlob

  const cleanUri = await manipulate(localUri)
  const blob = await readAsBlob(cleanUri)

  const problems = validateUpload({
    mimeType: OUTPUT_MIME,
    byteSize: blob.size,
  })
  if (problems.length > 0) {
    throw new UploadError(problems.join(' '))
  }

  // El id lo genera el cliente y la ruta se deriva de él. El nombre que traía el
  // archivo no participa: sin esto, un nombre con `../` sería una ruta.
  const mediaId = randomUUID()
  const path = referencePath(userId, mediaId, OUTPUT_MIME)

  const { error: uploadError } = await supabase.storage
    .from('references')
    .upload(path, blob, {
      // Explícito, nunca inferido de la extensión.
      contentType: OUTPUT_MIME,
      upsert: false,
    })

  if (uploadError != null) {
    throw new UploadError(uploadError.message)
  }

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      id: mediaId,
      bucket: 'references',
      path,
      mime_type: OUTPUT_MIME,
      byte_size: blob.size,
      owner_user_id: userId,
    })
    .select('id')
    .single()

  if (error != null || data == null) {
    // La fila no se escribió, así que el objeto quedó huérfano. Se borra: un
    // objeto sin fila cuenta contra la cuota de la persona sin que ella pueda
    // verlo ni borrarlo.
    await supabase.storage.from('references').remove([path])
    throw new UploadError(error?.message ?? 'no se pudo registrar la imagen')
  }

  return { mediaId: data.id, path }
}

/**
 * Recodifica a JPEG y reduce el lado mayor.
 *
 * El resultado no conserva EXIF: `expo-image-manipulator` escribe un archivo
 * nuevo desde los píxeles y no copia los metadatos del original.
 */
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

export { MAX_UPLOAD_BYTES, OUTPUT_MIME }
