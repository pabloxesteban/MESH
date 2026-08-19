/**
 * Perfil de un profesional: una sola consulta.
 *
 * Cualquier pantalla que necesite tres consultas recibe un RPC en su lugar. Esta
 * necesita dos —el profesional con sus estilos y su ubicación, y la grilla de
 * obra— porque anidar el portfolio dentro del profesional repetiría los datos
 * del artista en cada pieza.
 */

import type { Professional } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'

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
  /**
   * Si este perfil lo maneja alguien.
   *
   * Solo se puede chatear con un perfil reclamado: sin dueño no hay nadie del
   * otro lado a quien le llegue el mensaje, y ofrecer el chat igual sería una
   * bandeja de salida que no llega a ningún lado. Es un booleano y no el id
   * del dueño: quién es no le importa a ninguna pantalla.
   */
  readonly canChat: boolean
}

const PROFESSIONAL_SELECT = `
  id, slug, display_name, bio, travels,
  price_min_cents, price_max_cents, price_currency, priced_at,
  availability_status, availability_updated_at,
  instagram_handle, whatsapp_e164, studio_lat, studio_lng, owner_user_id, is_fixture,
  locations ( id, slug, city, admin_area, country_code, metro_key ),
  professional_styles ( proficiency, is_primary, styles ( slug ) )
`

const PIECES_SELECT = `
  id, caption, year, is_featured, sort_order,
  media_assets ( path, blurhash, width, height ),
  portfolio_item_styles ( weight, styles ( slug ) )
`

/**
 * `null` cuando no existe o no está publicado.
 *
 * Las dos situaciones son indistinguibles desde acá a propósito: RLS devuelve
 * cero filas en los dos casos, y la pantalla muestra el mismo mensaje. Decir "no
 * tenés permiso" confirmaría que el artista existe.
 */
export async function fetchProfile(slug: string): Promise<ProfileData | null> {
  const { data: professional, error } = await supabase
    .from('professionals')
    .select(PROFESSIONAL_SELECT)
    .eq('slug', slug)
    .maybeSingle()

  if (error != null) throw error
  if (professional == null) return null

  const row = professional as unknown as ProfessionalRow

  const { data: pieces, error: piecesError } = await supabase
    .from('portfolio_items')
    .select(PIECES_SELECT)
    .eq('professional_id', row.id)
    .order('sort_order', { ascending: true })

  if (piecesError != null) throw piecesError

  return {
    professional: toProfessional(row),
    pieces: ((pieces ?? []) as unknown as PieceRow[]).map(toPiece),
    canChat: row.owner_user_id != null,
  }
}

interface ProfessionalRow {
  id: string
  slug: string
  display_name: string
  bio: string | null
  travels: boolean
  price_min_cents: number | null
  price_max_cents: number | null
  price_currency: string | null
  priced_at: string | null
  availability_status: 'open' | 'limited' | 'waitlist' | 'closed' | null
  availability_updated_at: string | null
  instagram_handle: string | null
  whatsapp_e164: string | null
  studio_lat: number | null
  studio_lng: number | null
  owner_user_id: string | null
  is_fixture: boolean
  locations: {
    id: string
    slug: string
    city: string
    admin_area: string | null
    country_code: string
    metro_key: string
  } | null
  professional_styles: Array<{
    proficiency: number
    is_primary: boolean
    styles: { slug: string } | null
  }>
}

interface PieceRow {
  id: string
  caption: string | null
  year: number | null
  is_featured: boolean
  media_assets: {
    path: string
    blurhash: string | null
    width: number | null
    height: number | null
  } | null
  portfolio_item_styles: Array<{
    weight: number
    styles: { slug: string } | null
  }>
}

function toProfessional(row: ProfessionalRow): Professional {
  return {
    id: row.id,
    slug: row.slug,
    categorySlug: 'tattoo',
    displayName: row.display_name,
    bio: row.bio,
    location:
      row.locations == null
        ? null
        : {
            id: row.locations.id,
            slug: row.locations.slug,
            city: row.locations.city,
            adminArea: row.locations.admin_area ?? '',
            countryCode: row.locations.country_code,
            metroKey: row.locations.metro_key,
          },
    travels: row.travels,
    styles: row.professional_styles
      .filter((style) => style.styles != null)
      .map((style) => ({
        styleSlug: String(style.styles?.slug),
        proficiency: Number(style.proficiency),
        isPrimary: style.is_primary,
      }))
      // Primarios primero: es lo que define a un artista, y una grilla de ocho
      // etiquetas en orden alfabético no dice nada.
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          b.proficiency - a.proficiency,
      ),
    price:
      row.price_min_cents == null
        ? null
        : {
            minCents: row.price_min_cents,
            maxCents: row.price_max_cents ?? row.price_min_cents,
            currency: row.price_currency ?? 'ARS',
            pricedAt: row.priced_at ?? '',
          },
    availability:
      row.availability_status == null
        ? null
        : {
            status: row.availability_status,
            updatedAt: row.availability_updated_at ?? '',
          },
    instagramHandle: row.instagram_handle,
    whatsappE164: row.whatsapp_e164,
    studioCoordinates:
      row.studio_lat == null || row.studio_lng == null
        ? null
        : { lat: row.studio_lat, lng: row.studio_lng },
    isFixture: row.is_fixture,
  }
}

function toPiece(row: PieceRow): PortfolioPiece {
  return {
    id: row.id,
    mediaPath: row.media_assets?.path ?? '',
    blurhash: row.media_assets?.blurhash ?? null,
    width: row.media_assets?.width ?? null,
    height: row.media_assets?.height ?? null,
    caption: row.caption,
    year: row.year,
    isFeatured: row.is_featured,
    styles: row.portfolio_item_styles
      .filter((style) => style.styles != null)
      .sort((a, b) => Number(b.weight) - Number(a.weight))
      .map((style) => String(style.styles?.slug)),
  }
}
