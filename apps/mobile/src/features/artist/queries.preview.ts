/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El estudio anda de verdad en el preview: se reclama con un código, se sube
 * una foto y la pieza aparece en el mazo. Lo que NO se prueba acá es lo único
 * que importa de seguridad —que un artista no pueda escribir en el perfil de
 * otro—, porque eso lo decide RLS y acá no hay base. Está en
 * supabase/tests/25_artist_ownership.sql y en tests/integration.
 */

import {
  PREVIEW_ARTISTS,
  addPreviewPiece,
  claimPreviewProfessional,
  previewOwnedProfessional,
  previewPiecesOf,
  removePreviewPiece,
} from '../../../preview/store.ts'
import { weightsFor } from './weights.ts'

export interface OwnedProfessional {
  readonly id: string
  readonly slug: string
  readonly displayName: string
  readonly isPublished: boolean
}

export interface OwnedPiece {
  readonly id: string
  readonly mediaPath: string
  readonly isFeatured: boolean
  readonly styleSlugs: readonly string[]
}

export async function fetchOwnedProfessional(): Promise<OwnedProfessional | null> {
  const slug = previewOwnedProfessional()
  if (slug == null) return null
  const artist = PREVIEW_ARTISTS.find((a) => a.slug === slug)
  if (artist == null) return null
  return {
    id: `preview-${artist.slug}`,
    slug: artist.slug,
    displayName: artist.displayName,
    isPublished: true,
  }
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
