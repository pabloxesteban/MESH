/**
 * El catálogo, para poder puntuarlo en el cliente.
 *
 * Con ≤50 profesionales esto es una consulta y microsegundos de trabajo. **Esto
 * cambia a escala**: cuando el catálogo sea demasiado grande para mandárselo al
 * cliente, el matching se muda a una edge function con el mismo núcleo puro.
 * Ver system-architecture §10.
 */

import type { Professional } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'

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

const SELECT = `
  id, slug, display_name, bio, travels,
  price_min_cents, price_max_cents, price_currency, priced_at,
  availability_status, availability_updated_at,
  instagram_handle, whatsapp_e164, is_fixture,
  locations ( id, slug, city, admin_area, country_code, metro_key ),
  professional_styles ( proficiency, is_primary, styles ( slug ) )
`

export async function fetchCatalog(
  categorySlug: string,
): Promise<readonly Professional[]> {
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .maybeSingle()

  if (categoryError != null) throw categoryError
  if (category == null) return []

  // Sin filtro por `is_published`: la política de RLS ya lo hace. El filtro
  // explícito sería una segunda fuente de verdad que puede quedar desfasada.
  const { data, error } = await supabase
    .from('professionals')
    .select(SELECT)
    .eq('category_id', category.id)

  if (error != null) throw error

  return ((data ?? []) as unknown as ProfessionalRow[]).map(toProfessional)
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
      })),
    // Las cuatro columnas de precio van juntas por CHECK en la base, así que
    // alcanza con mirar una para saber si hay precio.
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
    isFixture: row.is_fixture,
  }
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

/**
 * Guarda los matches para poder auditarlos después.
 *
 * No es un caché de performance: es el registro de qué le dijimos a quién y por
 * qué. La base rechaza cualquier razón que nombre un componente que no aportó.
 */
export async function persistMatches(
  userId: string,
  matches: readonly PersistableMatch[],
): Promise<void> {
  if (matches.length === 0) return
  await supabase.from('matches').upsert(
    matches.map((match) => ({
      user_id: userId,
      professional_id: match.professionalId,
      project_id: match.projectId,
      score: match.score,
      band: match.band,
      components: match.components,
      reasons: match.reasons,
      matching_version: match.matchingVersion,
      taste_version: match.tasteVersion,
      computed_at: new Date().toISOString(),
    })) as never,
    // `project_key` y no `project_id`: es la columna generada sobre la que está
    // el índice único. Nombrar `project_id` acá falla con 42P10, porque el
    // índice no está sobre esa columna.
    { onConflict: 'user_id,professional_id,project_key' },
  )
}
