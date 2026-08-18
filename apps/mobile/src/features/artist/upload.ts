/**
 * Subida de una pieza de portafolio, del lado del artista.
 *
 * Hermano de `features/projects/upload.ts` y con la misma disciplina: **la
 * recodificación no es una optimización, es la limpieza de metadatos.** Una foto
 * sacada en el estudio lleva las coordenadas del estudio en el EXIF, y el bucket
 * `portfolio` es de lectura pública. `expo-image-manipulator` reescribe el
 * archivo desde los píxeles y lo que sale no tiene EXIF, ni GPS, ni marca de
 * cámara.
 *
 * Diferencia con las referencias de proyecto: acá se suben **tres derivados**
 * (sm/md/lg), porque el mazo pide `md` y el perfil pide `lg`, y la ruta guardada
 * es la de `lg` con el nombre de archivo intercambiable. Es exactamente lo que
 * hace `tools/seed`, movido al cliente.
 *
 * El orden importa:
 *
 *   elegir → recodificar los tres → validar → subir los tres → escribir la fila
 *
 * La fila de `media_assets` va al final: una fila que apunta a un objeto que no
 * existe deja un hueco permanente en el perfil.
 */

import * as ImageManipulator from 'expo-image-manipulator'
import { randomUUID } from 'expo-crypto'
import { portfolioPath, validateUpload, type PortfolioSize } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'
import { UploadError } from '../projects/upload.ts'

/**
 * Los mismos anchos que produce `tools/seed`.
 *
 * Están duplicados a propósito y no importados: `tools/seed` corre en Node con
 * sharp y no puede entrar al bundle. Si cambian allá, cambian acá — hay un test
 * que compara los dos.
 */
export const SIZE_WIDTHS: Readonly<Record<PortfolioSize, number>> = {
  sm: 400,
  md: 900,
  lg: 1600,
}

const SIZES: readonly PortfolioSize[] = ['sm', 'md', 'lg']

/**
 * JPEG, aunque el catálogo del seeder sea WebP.
 *
 * `expo-image-manipulator` lista WEBP como formato de salida pero no lo
 * garantiza en todas las plataformas, y un formato que falla en la mitad de los
 * teléfonos no es una optimización, es un bug. La ruta lleva la extensión, así
 * que los dos formatos conviven sin que la lectura se entere.
 */
const OUTPUT_MIME = 'image/jpeg' as const
const OUTPUT_FORMAT = 'jpg' as const

export interface PortfolioUploadResult {
  readonly mediaId: string
  /** La ruta del derivado `lg`. Es la que se guarda en `media_assets`. */
  readonly path: string
  readonly byteSize: number
}

export async function uploadPortfolioPiece(
  professionalSlug: string,
  userId: string,
  localUri: string,
  deps: {
    resize?: typeof resizeToJpeg
    readAsBlob?: (uri: string) => Promise<Blob>
  } = {},
): Promise<PortfolioUploadResult> {
  const resize = deps.resize ?? resizeToJpeg
  const readAsBlob = deps.readAsBlob ?? defaultReadAsBlob

  // El id lo genera el cliente y las rutas se derivan de él. El nombre que traía
  // el archivo no participa: sin esto, un nombre con `../` sería una ruta.
  const mediaId = randomUUID()

  const blobs = new Map<PortfolioSize, Blob>()
  for (const size of SIZES) {
    const uri = await resize(localUri, SIZE_WIDTHS[size])
    blobs.set(size, await readAsBlob(uri))
  }

  const largest = blobs.get('lg')
  if (largest == null) throw new UploadError('no se pudo procesar la imagen')

  // Se valida el derivado más grande, que es el único que puede pasarse de
  // tamaño. Validar después de recodificar y no antes: lo que cuenta es el peso
  // de lo que se va a subir.
  const problems = validateUpload({
    mimeType: OUTPUT_MIME,
    byteSize: largest.size,
  })
  if (problems.length > 0) throw new UploadError(problems.join(' '))

  const subidos: string[] = []
  try {
    for (const size of SIZES) {
      const path = portfolioPath(professionalSlug, mediaId, size, OUTPUT_FORMAT)
      const blob = blobs.get(size)
      if (blob == null) continue

      const { error } = await supabase.storage
        .from('portfolio')
        .upload(path, blob, { contentType: OUTPUT_MIME, upsert: false })

      if (error != null) throw new UploadError(error.message)
      subidos.push(path)
    }

    const path = portfolioPath(professionalSlug, mediaId, 'lg', OUTPUT_FORMAT)
    const { data, error } = await supabase
      .from('media_assets')
      .insert({
        id: mediaId,
        bucket: 'portfolio',
        path,
        mime_type: OUTPUT_MIME,
        byte_size: largest.size,
        owner_user_id: userId,
      })
      .select('id')
      .single()

    if (error != null || data == null) {
      throw new UploadError(error?.message ?? 'no se pudo registrar la imagen')
    }

    return { mediaId: data.id, path, byteSize: largest.size }
  } catch (error) {
    // Cualquier fallo después del primer PUT deja objetos huérfanos: ocupan
    // storage, no los ve nadie, y nadie los puede borrar desde la app. Se
    // limpian acá.
    if (subidos.length > 0) {
      await supabase.storage.from('portfolio').remove(subidos)
    }
    throw error
  }
}

/** Recodifica a JPEG al ancho pedido. El resultado no conserva EXIF. */
export async function resizeToJpeg(
  uri: string,
  width: number,
): Promise<string> {
  const context = ImageManipulator.ImageManipulator.manipulate(uri)
  context.resize({ width })
  const image = await context.renderAsync()
  const result = await image.saveAsync({
    compress: 0.82,
    format: ImageManipulator.SaveFormat.JPEG,
  })
  return result.uri
}

async function defaultReadAsBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri)
  return response.blob()
}

export { OUTPUT_MIME, OUTPUT_FORMAT }
