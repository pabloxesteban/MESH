/**
 * Versión de preview de `classify.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El export estático no tiene ni Edge Function ni clave de Anthropic. Para
 * poder recorrer el flujo igual, "leer" acá devuelve una lectura fija —
 * determinística y honesta sobre ser una simulación, no una respuesta real del
 * modelo.
 *
 * Devuelve **dos rasgos de tres a propósito**: el tamaño queda en null, que es
 * lo que la función de verdad hace cuando la foto no da escala. Así el preview
 * muestra el caso que importa mirar —un campo vacío con su explicación— y no
 * solo el camino feliz.
 */

import type { ReferenceReading } from './classify.ts'

export class ClassifyError extends Error {}

export async function readReferencePhoto(_input: {
  uri: string
  categorySlug: string
}): Promise<ReferenceReading> {
  return {
    styleSlug: 'fine-line',
    traits: [
      { dimension: 'body_area', slug: 'antebrazo' },
      { dimension: 'palette', slug: 'negro' },
    ],
  }
}
