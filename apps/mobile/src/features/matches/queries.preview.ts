/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 *
 * El ranking NO se calcula acá: lo calcula `packages/domain` con la misma
 * función versionada que usa la app. Lo único que cambia es de dónde sale el
 * catálogo.
 */

import type { AvailabilityStatus, Professional } from '@mesh/domain'

import {
  PREVIEW_ARTISTS,
  previewLocation,
  previewProfessionalId,
} from '../../../preview/store.ts'

const CATALOG: readonly Professional[] = PREVIEW_ARTISTS.map((artist) => ({
  id: previewProfessionalId(artist.slug),
  slug: artist.slug,
  categorySlug: 'tattoo' as const,
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
}))

export async function fetchCatalog(
  _categorySlug: string,
): Promise<readonly Professional[]> {
  return CATALOG
}

export interface PersistableMatch {
  readonly professionalId: string
  readonly projectId: string | null
  readonly score: number
  readonly band: 'strong' | 'good' | 'possible'
  readonly components: Readonly<Record<string, number>>
  readonly reasons: readonly unknown[]
  readonly matchingVersion: string
  readonly tasteVersion: string
}

export async function persistMatches(
  _userId: string,
  _matches: readonly PersistableMatch[],
): Promise<void> {
  // La tabla `matches` existe para poder auditar qué se le mostró a quién. En
  // un preview no hay a quién auditar.
}
