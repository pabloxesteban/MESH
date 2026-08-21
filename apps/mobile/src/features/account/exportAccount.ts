/**
 * Llevarte lo tuyo.
 *
 * Ver ADR-028. Tres cosas que pasan acá y no en la base:
 *
 * 1. **Las fotos se cambian por enlaces.** La función de Postgres devuelve
 *    rutas de storage; un JSON con imágenes adentro sería un archivo imposible
 *    de abrir. Los enlaces son **firmados y vencen**, y el archivo lo dice: un
 *    export que promete fotos para siempre miente.
 * 2. **El archivo se escribe y se comparte**, en vez de mostrarse. Un JSON de
 *    varios kilobytes en pantalla no es "acceso a tus datos", es una pared de
 *    texto.
 * 3. **Si firmar las fotos falla, el export sale igual.** Perder los enlaces no
 *    puede costar el archivo entero: las rutas quedan, y todo lo demás también.
 */

import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import { supabase } from '../../data/supabase.ts'

export class ExportError extends Error {}

/** Cuánto viven los enlaces a las fotos. Una semana alcanza para guardarlas. */
const LINK_TTL_SECONDS = 7 * 24 * 60 * 60

interface MediaRef {
  bucket: string
  ruta: string
  enlace?: string
  vence_en_dias?: number
}

/** Todas las referencias a archivos que hay adentro del export, en su lugar. */
function collectMedia(node: unknown, found: MediaRef[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectMedia(item, found)
    return
  }
  if (typeof node !== 'object' || node === null) return

  const candidate = node as Partial<MediaRef>
  if (
    typeof candidate.bucket === 'string' &&
    typeof candidate.ruta === 'string'
  ) {
    found.push(node as MediaRef)
  }

  for (const value of Object.values(node)) collectMedia(value, found)
}

/**
 * Le pone un enlace firmado a cada foto, agrupando por bucket.
 *
 * Nunca lanza: si un bucket falla, esas rutas se quedan sin enlace y el resto
 * del export sigue entero.
 */
async function signMedia(media: readonly MediaRef[]): Promise<void> {
  const porBucket = new Map<string, MediaRef[]>()
  for (const ref of media) {
    const lista = porBucket.get(ref.bucket) ?? []
    lista.push(ref)
    porBucket.set(ref.bucket, lista)
  }

  for (const [bucket, refs] of porBucket) {
    try {
      const { data } = await supabase.storage.from(bucket).createSignedUrls(
        refs.map((ref) => ref.ruta),
        LINK_TTL_SECONDS,
      )
      for (const firmada of data ?? []) {
        const ref = refs.find((item) => item.ruta === firmada.path)
        if (ref != null && firmada.signedUrl != null) {
          ref.enlace = firmada.signedUrl
          ref.vence_en_dias = LINK_TTL_SECONDS / 86400
        }
      }
    } catch {
      // Sin enlaces para ese bucket. Las rutas quedan.
    }
  }
}

export interface ExportResult {
  /** El JSON, por si hace falta mostrarlo o copiarlo. */
  readonly json: string
  /** Si se pudo abrir la hoja para compartir el archivo. */
  readonly shared: boolean
}

export async function exportAccount(): Promise<ExportResult> {
  const { data, error } = await supabase.rpc('export_own_account')
  if (error != null) throw new ExportError(error.message)
  if (data == null) throw new ExportError('sin datos')

  const media: MediaRef[] = []
  collectMedia(data, media)
  if (media.length > 0) await signMedia(media)

  const json = JSON.stringify(data, null, 2)

  // El nombre lleva la fecha para que dos exports no se pisen en Descargas.
  const stamp = new Date().toISOString().slice(0, 10)

  try {
    // En la caché y no en documentos: es un archivo para llevarse ahora, no
    // para que MESH lo guarde. El sistema lo limpia cuando le hace falta
    // espacio, que es exactamente lo que corresponde.
    const file = new File(Paths.cache, `mesh-${stamp}.json`)
    file.create({ overwrite: true })
    file.write(json)

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'MESH',
        UTI: 'public.json',
      })
      return { json, shared: true }
    }
  } catch {
    // En web y en cualquier lado donde no haya hoja para compartir, queda el
    // texto: la pantalla ofrece copiarlo. Perder el archivo no puede costar el
    // acceso a los datos.
  }

  return { json, shared: false }
}
