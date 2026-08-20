/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El estudio anda de verdad en el preview: se crea el perfil o se reclama uno
 * con código, se declaran estilos, se publica la ubicación y se sube una foto
 * que aparece en el mazo. Lo que NO se prueba acá es lo único que importa de
 * seguridad —que un artista no pueda escribir en el perfil de otro—, porque eso
 * lo decide RLS y acá no hay base. Está en
 * supabase/tests/25_artist_ownership.sql, supabase/tests/26_artist_self_signup.sql
 * y en tests/integration.
 */

import type { GeoCoordinates } from '@mesh/domain'

import {
  addPreviewPiece,
  claimPreviewProfessional,
  createPreviewProfessional,
  previewOwnProfile,
  previewOwnStyleSlugs,
  previewPiecesOf,
  previewStudioCoordinatesOf,
  removePreviewPiece,
  setPreviewOwnStyles,
  setPreviewStudioLocation,
} from '../../../preview/store.ts'
import { weightsFor } from './weights.ts'

export interface OwnedProfessional {
  readonly id: string
  readonly slug: string
  readonly displayName: string
  readonly isPublished: boolean
  readonly studioCoordinates: GeoCoordinates | null
  readonly styleSlugs: readonly string[]
}

export interface OwnedPiece {
  readonly id: string
  readonly mediaPath: string
  readonly isFeatured: boolean
  readonly styleSlugs: readonly string[]
}

export async function fetchOwnedProfessional(
  _userId: string,
): Promise<OwnedProfessional | null> {
  const own = previewOwnProfile()
  if (own == null) return null
  return {
    id: `preview-${own.slug}`,
    slug: own.slug,
    displayName: own.displayName,
    isPublished: true,
    studioCoordinates: previewStudioCoordinatesOf(own.slug),
    styleSlugs: previewOwnStyleSlugs(),
  }
}

export async function createOwnProfessional(input: {
  displayName: string
  instagram?: string | undefined
  whatsapp?: string | undefined
}): Promise<string> {
  return createPreviewProfessional(input)
}

export async function setOwnStyles(
  styleSlugs: readonly string[],
): Promise<void> {
  setPreviewOwnStyles(styleSlugs)
}

export async function setStudioLocation(
  coordinates: GeoCoordinates,
  neighborhoodSlug?: string | null,
): Promise<void> {
  setPreviewStudioLocation(coordinates, neighborhoodSlug)
}

export async function fetchOwnedPieces(
  _professionalId: string,
): Promise<readonly OwnedPiece[]> {
  return previewPiecesOf().map((piece) => ({
    id: piece.id,
    mediaPath: piece.id,
    isFeatured: piece.featured,
    styleSlugs: piece.styles.map((style) => style.slug),
  }))
}

export async function claimProfessional(code: string): Promise<string> {
  const slug = claimPreviewProfessional(code)
  if (slug == null) throw new Error('código inválido')
  return slug
}

export interface NewPiece {
  readonly professionalId: string
  readonly mediaId: string
  readonly styleSlugsInOrder: readonly string[]
  readonly isFeatured: boolean
}

export async function addPiece(piece: NewPiece): Promise<string> {
  addPreviewPiece({
    id: piece.mediaId,
    featured: piece.isFeatured,
    styles: weightsFor(piece.styleSlugsInOrder).map((weight) => ({
      slug: weight.slug,
      weight: weight.weight,
    })),
  })
  return piece.mediaId
}

export async function removePiece(pieceId: string): Promise<void> {
  removePreviewPiece(pieceId)
}
