/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 */

import type { AvailabilityStatus, Professional } from '@mesh/domain'

import {
  artistBySlug,
  previewLocation,
  previewProfessionalId,
} from '../../../preview/store.ts'

export interface PortfolioPiece {
  readonly id: string
  readonly mediaPath: string
  readonly blurhash: string | null
  readonly width: number | null
  readonly height: number | null
  readonly caption: string | null
  readonly year: number | null
  readonly isFeatured: boolean
  readonly styles: readonly string[]
}

export interface ProfileData {
  readonly professional: Professional
  readonly pieces: readonly PortfolioPiece[]
}

export async function fetchProfile(slug: string): Promise<ProfileData | null> {
  const artist = artistBySlug(slug)
  if (artist == null) return null

  return {
    professional: {
      id: previewProfessionalId(artist.slug),
      slug: artist.slug,
      categorySlug: 'tattoo',
      displayName: artist.displayName,
      bio: artist.bio,
      location: previewLocation(artist.location),
      travels: artist.travels,
      styles: artist.styles,
      price:
        artist.price?.minCents != null && artist.price.maxCents != null
          ? {
              minCents: artist.price.minCents,
              maxCents: artist.price.maxCents,
              currency: artist.price.currency,
              pricedAt: artist.price.pricedAt,
            }
          : null,
      availability:
        artist.availability != null
          ? {
              status: artist.availability.status as AvailabilityStatus,
              updatedAt: artist.availability.updatedAt,
            }
          : null,
      instagramHandle: artist.instagramHandle,
      whatsappE164: artist.whatsappE164,
      isFixture: artist.isFixture,
    },
    pieces: artist.pieces.map((piece) => ({
      id: piece.id,
      mediaPath: piece.id,
      blurhash: null,
      width: piece.width,
      height: piece.height,
      caption: piece.caption,
      year: piece.year,
      isFeatured: piece.featured,
      styles: piece.styles.map((style) => style.slug),
    })),
  }
}
