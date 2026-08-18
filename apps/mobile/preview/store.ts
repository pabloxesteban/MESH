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

/** Registra una imagen subida desde el estudio. Vive solo en esta sesión. */
export function registerPreviewMedia(id: string, dataUri: string): void {
  MEDIA.set(id, dataUri)
}

// --- estudio -----------------------------------------------------------------
//
// El preview deja recorrer el modo artista: reclamar un perfil con un código,
// subir una foto, y verla aparecer en el mazo. Lo que NO prueba es lo único que
// importa de seguridad —que un artista no pueda escribir en el perfil de otro—,
// porque eso lo decide RLS y acá no hay base.
//
// Los códigos están a la vista, en el código fuente de un archivo que se
// publica. Es correcto: en el preview no hay nada que proteger. En la app de
// verdad viven en `professional_claims`, una tabla que el cliente no puede leer.

/** Código de preview → slug. En la app real esto es una tabla inaccesible. */
const PREVIEW_CODES: Readonly<Record<string, string>> = {
  BRIZA123: 'fixture-vieja-escuela',
  AGUJA456: 'fixture-aguja-fina',
}

let ownedSlug: string | null = null

export interface PreviewOwnPiece {
  readonly id: string
  readonly featured: boolean
  readonly styles: readonly { readonly slug: string; readonly weight: number }[]
}

const ownPieces: PreviewOwnPiece[] = []

export function claimPreviewProfessional(code: string): string | null {
  const slug = PREVIEW_CODES[code.toUpperCase().trim()]
  if (slug == null) return null
  ownedSlug = slug
  return slug
}

export function previewOwnedProfessional(): string | null {
  return ownedSlug
}

export function previewPiecesOf(): readonly PreviewOwnPiece[] {
  return ownPieces
}

export function addPreviewPiece(piece: PreviewOwnPiece): void {
  ownPieces.unshift(piece)
}

export function removePreviewPiece(id: string): void {
  const index = ownPieces.findIndex((piece) => piece.id === id)
  if (index !== -1) ownPieces.splice(index, 1)
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

// --- proyectos / búsqueda por fotos -------------------------------------------
//
// Un proyecto en memoria, con lo mínimo que necesita el matching por brief:
// estilos y barrio. Nada de presupuesto/timing/descripción porque el flujo de
// preview que los usa es "buscar por fotos", que nunca los pide.

export interface PreviewProject {
  readonly id: string
  readonly title: string
  readonly styleSlugs: readonly string[]
  readonly locationSlug: string | null
}

const previewProjects = new Map<string, PreviewProject>()
let previewProjectCounter = 0

export function createPreviewProject(input: {
  title: string
  styleSlugs: readonly string[]
  locationSlug?: string | undefined
}): string {
  previewProjectCounter += 1
  const id = `preview-project-${String(previewProjectCounter)}`
  previewProjects.set(id, {
    id,
    title: input.title,
    styleSlugs: input.styleSlugs,
    locationSlug: input.locationSlug ?? null,
  })
  return id
}

export function previewProject(id: string): PreviewProject | undefined {
  return previewProjects.get(id)
}
