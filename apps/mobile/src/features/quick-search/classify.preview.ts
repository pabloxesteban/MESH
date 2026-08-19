/**
 * Versión de preview de `classify.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El export estático no tiene ni Edge Function ni clave de Anthropic. Para
 * poder recorrer el flujo igual, "clasificar" acá devuelve una posición fija
 * del catálogo curado — determinístico y honesto sobre ser una simulación,
 * no una respuesta real del modelo.
 */

const PREVIEW_STYLE_SLUG = 'fine-line'

export class ClassifyError extends Error {}

export async function classifyReferencePhoto(_input: {
  uri: string
  categorySlug: string
}): Promise<string | null> {
  return PREVIEW_STYLE_SLUG
}
