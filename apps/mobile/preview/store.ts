/**
 * El "backend" del preview web: memoria y nada más.
 *
 * El preview se publica como un archivo suelto y no puede hablar con ningún
 * servidor. Los módulos `*.preview.ts` de cada feature leen de acá, así que el
 * mazo, el gusto y los encajes son **la misma app** —las mismas pantallas, los
 * mismos componentes, el mismo motor de gusto y de matching— corriendo sobre un
 * catálogo horneado en vez de sobre Postgres.
 *
 * Lo que el preview NO prueba: RLS, paginación real, latencia, offline, y todo
 * lo que sea nativo (hápticos, gestos del sistema, performance). Para eso hace
 * falta un dispositivo con Expo Go. Ver docs/design/preview.md.
 */

import { findLocation, type Interaction, type Location } from '@mesh/domain'

import { PREVIEW_ARTISTS, type PreviewArtist } from './data.generated.ts'

/** Las decisiones que la persona tomó en esta sesión de preview. */
const interactions = new Map<string, Interaction>()

export function recordPreviewInteraction(item: Interaction): void {
  interactions.set(item.portfolioItemId, item)
}

export function forgetPreviewInteraction(portfolioItemId: string): void {
  interactions.delete(portfolioItemId)
}

export function previewInteractions(): readonly Interaction[] {
  return [...interactions.values()]
}

export function resetPreviewInteractions(): void {
  interactions.clear()
}

export function artistBySlug(slug: string): PreviewArtist | undefined {
  return PREVIEW_ARTISTS.find((artist) => artist.slug === slug)
}

export function artistOfPiece(pieceId: string): PreviewArtist | undefined {
  return PREVIEW_ARTISTS.find((artist) =>
    artist.pieces.some((piece) => piece.id === pieceId),
  )
}

/**
 * La imagen, ya adentro del bundle.
 *
 * `mediaPath` en la app real es una ruta en Storage. Acá se usa el id de la
 * pieza como ruta, y este mapa lo resuelve al data URI. Las pantallas no se
 * enteran: siguen llamando a `mediaUrl()`.
 */
const MEDIA = new Map<string, string>(
  PREVIEW_ARTISTS.flatMap((artist) =>
    artist.pieces.map((piece) => [piece.id, piece.dataUri] as const),
  ),
)

export function previewMediaUrl(path: string): string {
  return MEDIA.get(path) ?? ''
}

/** El id sintético de un profesional. Estable, porque sale del slug. */
export function previewProfessionalId(slug: string): string {
  return `preview-${slug}`
}

export function previewLocation(slug: string | null): Location | null {
  if (slug == null) return null
  const found = findLocation(slug)
  if (found == null) return null
  return {
    id: `preview-loc-${found.slug}`,
    slug: found.slug,
    city: found.city,
    adminArea: found.adminArea,
    countryCode: found.countryCode,
    metroKey: found.metroKey,
  }
}

export { PREVIEW_ARTISTS }
export type { PreviewArtist }
