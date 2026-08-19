/**
 * El único lugar donde el modo artista habla con Supabase.
 *
 * Todo lo de acá está autorizado por RLS y no por estas funciones: un cliente
 * modificado que llame `addPiece` con el id de otro profesional recibe un 42501.
 * Ver supabase/tests/25_artist_ownership.sql.
 */

import type { GeoCoordinates } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'

import { weightsFor } from './weights.ts'

export interface OwnedProfessional {
  readonly id: string
  readonly slug: string
  readonly displayName: string
  readonly isPublished: boolean
  readonly studioCoordinates: GeoCoordinates | null
}

export interface OwnedPiece {
  readonly id: string
  readonly mediaPath: string
  readonly isFeatured: boolean
  readonly styleSlugs: readonly string[]
}

/**
 * El perfil que esta persona reclamó, o `null`.
 *
 * No filtra por `owner_user_id`: la política ya lo hace, y repetir el filtro
 * acá invitaría a creer que la seguridad vive en el cliente.
 */
export async function fetchOwnedProfessional(): Promise<OwnedProfessional | null> {
  const { data, error } = await supabase
    .from('professionals')
    .select('id, slug, display_name, is_published, studio_lat, studio_lng')
    .not('owner_user_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (error != null) throw error
  if (data == null) return null

  return {
    id: data.id,
    slug: data.slug,
    displayName: data.display_name,
    isPublished: data.is_published,
    studioCoordinates:
      data.studio_lat == null || data.studio_lng == null
        ? null
        : { lat: data.studio_lat, lng: data.studio_lng },
  }
}

/** Publica (o actualiza) la ubicación real del estudio. Solo la fila propia. */
export async function setStudioLocation(
  coordinates: GeoCoordinates,
): Promise<void> {
  const { error } = await supabase.rpc('set_studio_location', {
    p_lat: coordinates.lat,
    p_lng: coordinates.lng,
  })
  if (error != null) throw error
}

export async function fetchOwnedPieces(
  professionalId: string,
): Promise<readonly OwnedPiece[]> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select(
      'id, is_featured, sort_order, media_assets ( path ), portfolio_item_styles ( weight, styles ( slug ) )',
    )
    .eq('professional_id', professionalId)
    .order('sort_order', { ascending: true })

  if (error != null) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    mediaPath: row.media_assets?.path ?? '',
    isFeatured: row.is_featured,
    styleSlugs: (row.portfolio_item_styles ?? [])
      .slice()
      .sort((a, b) => Number(b.weight) - Number(a.weight))
      .map((entry) => entry.styles?.slug)
      .filter((slug): slug is string => slug != null),
  }))
}

/** Canjea el código. Devuelve el slug del perfil reclamado. */
export async function claimProfessional(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_professional', {
    p_code: code,
  })
  if (error != null) throw error
  return String(data)
}

export interface NewPiece {
  readonly professionalId: string
  readonly mediaId: string
  readonly styleSlugsInOrder: readonly string[]
  readonly isFeatured: boolean
}

/**
 * Crea la pieza y sus estilos.
 *
 * Dos escrituras y no una transacción: PostgREST no expone transacciones desde
 * el cliente. Si la segunda falla, se borra la primera — una pieza sin estilos
 * no aparece en el mazo pero sí ocupa lugar en el perfil, y una pieza a medias
 * es peor que ninguna.
 */
export async function addPiece(piece: NewPiece): Promise<string> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .insert({
      professional_id: piece.professionalId,
      media_id: piece.mediaId,
      is_featured: piece.isFeatured,
    })
    .select('id')
    .single()

  if (error != null || data == null) {
    throw error ?? new Error('no se pudo crear la pieza')
  }

  const weights = weightsFor(piece.styleSlugsInOrder)
  const { data: styleRows, error: stylesLookupError } = await supabase
    .from('styles')
    .select('id, slug')
    .in(
      'slug',
      weights.map((weight) => weight.slug),
    )

  if (stylesLookupError != null) {
    await supabase.from('portfolio_items').delete().eq('id', data.id)
    throw stylesLookupError
  }

  const byslug = new Map((styleRows ?? []).map((row) => [row.slug, row.id]))
  const { error: stylesError } = await supabase
    .from('portfolio_item_styles')
    .insert(
      weights.map((weight) => ({
        portfolio_item_id: data.id,
        style_id: byslug.get(weight.slug) as string,
        weight: weight.weight,
      })),
    )

  if (stylesError != null) {
    await supabase.from('portfolio_items').delete().eq('id', data.id)
    throw stylesError
  }

  return data.id
}

export async function removePiece(pieceId: string): Promise<void> {
  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', pieceId)
  if (error != null) throw error
}
