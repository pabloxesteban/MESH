/**
 * Versión de preview de `queries.ts`. Ver apps/mobile/preview/store.ts.
 */

import type { AvailabilityStatus, Professional } from '@mesh/domain'

import {
  artistBySlug,
  previewLocation,
  previewOwnProfile,
  previewOwnedProfessional,
  previewPiecesOf,
  previewProfessionalId,
  previewStudioCoordinatesOf,
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
  readonly isOriginalDesign: boolean
  readonly sizeLabel: string | null
  readonly price: { cents: number; currency: string; pricedAt: string } | null
}

export interface ProfileData {
  readonly professional: Professional
  readonly pieces: readonly PortfolioPiece[]
  readonly canChat: boolean
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
      studioCoordinates: previewStudioCoordinatesOf(artist.slug),
      isFixture: artist.isFixture,
    },
    // En el preview se puede chatear con cualquiera: no hay dueños reales,
    // y el punto es poder recorrer el flujo.
    canChat: true,
    // Lo que subiste desde el estudio va primero, y solo en tu propio perfil:
    // el catálogo horneado no cambia, y ver la foto recién subida acá es lo que
    // cierra el flujo de "la subí" a "así se ve".
    pieces: [
      ...(previewOwnedProfessional() === slug ? previewPiecesOf() : []).map(
        (piece) => ({
          id: piece.id,
          mediaPath: piece.id,
          blurhash: null,
          width: null,
          height: null,
          caption: null,
          year: null,
          isFeatured: piece.featured,
          styles: piece.styles.map((style) => style.slug),
          isOriginalDesign: false,
          sizeLabel: null,
          price: null,
        }),
      ),
      ...artist.pieces.map((piece, index) => ({
        id: piece.id,
        mediaPath: piece.id,
        blurhash: null,
        width: piece.width,
        height: piece.height,
        caption: piece.caption,
        year: piece.year,
        isFeatured: piece.featured,
        styles: piece.styles.map((style) => style.slug),
        // La data generada (`data.generated.ts`, ver ADR-034: llegó después)
        // no tiene diseño propio — no es un dato real de ningún artista. Para
        // que la sección "Diseños propios" sea recorrible en el preview sin
        // inventar sobre un artista de verdad, la primera pieza NO destacada
        // de cada artista fixture se muestra también como diseño propio de
        // ejemplo, con un tamaño y precio ficticios y claramente de prueba.
        // Nunca la destacada: esa es el hero, y marcarla la sacaría de la
        // grilla de "Obra" sin sacarla del hero, un estado que no existe en
        // producción.
        ...(!piece.featured &&
        index === artist.pieces.findIndex((p) => !p.featured)
          ? {
              isOriginalDesign: true,
              sizeLabel: 'Mano chica',
              price: {
                cents: 4_500_000,
                currency: 'ARS',
                pricedAt: '2026-08-04',
              },
            }
          : { isOriginalDesign: false, sizeLabel: null, price: null }),
      })),
    ],
  }
}

export type ReplyHabit = 'same_day' | 'few_days' | 'slower'

/**
 * En el preview, el segundo artista de la lista tarda.
 *
 * No todos rápido: el estado que hay que poder mirar es el malo, porque es el
 * que decide si este indicador sirve para algo o es publicidad. Ver ADR-022.
 *
 * **Tu propio perfil nunca tiene hábito**, y no es un detalle: acabás de
 * crearlo, así que tiene cero conversaciones, y el piso de ADR-022 son tres.
 * Antes el hash le tocaba "Suele contestar en el día" a un perfil de un minuto
 * de vida — una disponibilidad inventada sobre uno mismo, que es justo lo que
 * el innegociable 2 prohíbe. En la base esto no pasa porque la RPC devuelve
 * null por debajo del piso; acá tiene que pasar lo mismo o el preview enseña
 * lo contrario de lo que hace el producto.
 */
export async function fetchReplyHabit(
  professionalId: string,
): Promise<ReplyHabit | null> {
  const own = previewOwnProfile()
  if (own != null && professionalId === previewProfessionalId(own.slug)) {
    return null
  }

  const posicion = [...professionalId].reduce(
    (total, letra) => total + letra.charCodeAt(0),
    0,
  )
  const cual = posicion % 3
  if (cual === 0) return null
  return cual === 1 ? 'same_day' : 'slower'
}
