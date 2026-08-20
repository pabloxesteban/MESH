/**
 * Lee la foto de referencia contra la taxonomía y devuelve un brief.
 *
 * La ÚNICA llamada a un modelo de IA de toda la app, y angosta a propósito:
 * interpreta una foto, no decide a quién mostrar. Ver
 * `supabase/functions/read-reference/` y ADR-011 · ADR-020.
 *
 * **Todo campo puede volver `null`**, y eso es una garantía, no una limitación:
 * una foto de un diseño en papel no tiene zona del cuerpo y ninguna foto tiene
 * escala. Un tamaño adivinado le cambia el precio a alguien.
 */

import { manipulateToJpeg } from '../projects/upload.ts'
import { supabase } from '../../data/supabase.ts'

export class ClassifyError extends Error {}

/** Un rasgo leído: la dimensión y el slug, los dos del vocabulario cerrado. */
export interface ReadTrait {
  readonly dimension: string
  readonly slug: string
}

export interface ReferenceReading {
  readonly styleSlug: string | null
  readonly traits: readonly ReadTrait[]
}

export async function readReferencePhoto(input: {
  uri: string
  categorySlug: string
}): Promise<ReferenceReading> {
  const cleanUri = await manipulateToJpeg(input.uri)
  const base64 = await toBase64(cleanUri)

  const { data, error } = await supabase.functions.invoke('read-reference', {
    body: {
      image: base64,
      mimeType: 'image/jpeg',
      categorySlug: input.categorySlug,
    },
  })

  if (error != null) {
    throw new ClassifyError(error.message)
  }

  const payload = data as {
    styleSlug?: string | null
    traits?: readonly ReadTrait[]
  } | null

  return {
    styleSlug: payload?.styleSlug ?? null,
    // Una función vieja desplegada devuelve solo `styleSlug`. Sin este `?? []`
    // la pantalla se rompería contra un despliegue a medio actualizar, que es
    // exactamente cuando menos hay que romperse.
    traits: payload?.traits ?? [],
  }
}

/**
 * URI local → base64 puro, sin el prefijo `data:...;base64,`.
 *
 * `FileReader` y no `expo-file-system`: ya alcanza con lo que React Native
 * trae adentro, y no suma una dependencia nueva para una conversión chica.
 */
async function toBase64(uri: string): Promise<string> {
  const response = await fetch(uri)
  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () =>
      reject(reader.error ?? new Error('no se pudo leer la imagen'))
    reader.onload = () => {
      const result = String(reader.result)
      const commaIndex = result.indexOf(',')
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1))
    }
    reader.readAsDataURL(blob)
  })
}
