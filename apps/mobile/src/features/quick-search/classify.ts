/**
 * Clasifica la foto de referencia contra la taxonomía de estilos.
 *
 * La ÚNICA llamada a un modelo de IA de toda la app, y angosta a propósito:
 * interpreta una foto, no decide a quién mostrar. `null` cuando el modelo no
 * reconoce ningún estilo de la lista — nunca se fuerza un resultado. Ver
 * `supabase/functions/classify-style/` y ADR-011.
 */

import { manipulateToJpeg } from '../projects/upload.ts'
import { supabase } from '../../data/supabase.ts'

export class ClassifyError extends Error {}

export async function classifyReferencePhoto(input: {
  uri: string
  categorySlug: string
}): Promise<string | null> {
  const cleanUri = await manipulateToJpeg(input.uri)
  const base64 = await toBase64(cleanUri)

  const { data, error } = await supabase.functions.invoke('classify-style', {
    body: {
      image: base64,
      mimeType: 'image/jpeg',
      categorySlug: input.categorySlug,
    },
  })

  if (error != null) {
    throw new ClassifyError(error.message)
  }

  const styleSlug = (data as { styleSlug: string | null } | null)?.styleSlug
  return styleSlug ?? null
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
    reader.onerror = () => reject(reader.error ?? new Error('no se pudo leer la imagen'))
    reader.onload = () => {
      const result = String(reader.result)
      const commaIndex = result.indexOf(',')
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1))
    }
    reader.readAsDataURL(blob)
  })
}
