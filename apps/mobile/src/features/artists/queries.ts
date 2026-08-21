/**
 * El único lugar donde la grilla de artistas habla con Supabase.
 *
 * Un round trip trae todo lo que necesita la tarjeta: el artista, su avatar, su
 * barrio, las coordenadas de su estudio y hasta seis obras para el carrusel.
 * Pedirle las obras a cada artista por separado sería una consulta por tarjeta.
 *
 * El orden **no** viene de acá: la base devuelve una mezcla estable y el orden
 * por cercanía lo hace `sortByProximity` en packages/domain, que es puro y
 * testeado sin base. Ver docs/design/MESH-DESIGN-DECISIONS.md D-010.
 */

import type { GeoCoordinates } from '@mesh/domain'

import { supabase } from '../../data/supabase.ts'
import { mediaUrl } from '../discovery/queries.ts'

export interface ArtistPiece {
  readonly id: string
  readonly mediaPath: string
  readonly width: number | null
  readonly height: number | null
  readonly blurhash: string | null
}

export interface ArtistCardData {
  readonly professionalId: string
  readonly slug: string
  readonly displayName: string
  readonly isFixture: boolean
  /** `null` cuando el artista no subió foto de perfil. No se inventa una. */
  readonly avatarPath: string | null
  readonly neighborhoodSlug: string | null
  readonly studioCoordinates: GeoCoordinates | null
  readonly pieces: readonly ArtistPiece[]
}

/**
 * Cuántos artistas se traen de una.
 *
 * Se bajan todos y se ordenan en el cliente porque el orden por cercanía no
 * puede paginarse en la base sin mandarle la ubicación de quien mira — y eso es
 * justamente lo que no queremos hacer. Con el catálogo de CABA alcanza de
 * sobra; cuando pase de este número hay que empujar el orden al RPC y aceptar
 * mandar las coordenadas.
 */
const MAX_ARTISTS = 100

export async function fetchArtistGrid(
  categorySlug: string,
): Promise<readonly ArtistCardData[]> {
  const { data, error } = await supabase.rpc('get_artist_grid', {
    p_category_slug: categorySlug,
    p_limit: MAX_ARTISTS,
  })

  if (error != null) throw error

  return (data ?? []).map(toCard)
}

/**
 * El piso de caracteres para que una búsqueda salga a la red.
 *
 * Es el mismo número que la base exige: con una sola letra el resultado sería
 * medio catálogo, que no es una respuesta. Está acá además de allá para no
 * gastar un viaje en algo que ya sabemos que vuelve vacío.
 */
export const MIN_SEARCH_LENGTH = 2

/**
 * Busca artistas por nombre.
 *
 * Devuelve la misma forma que la grilla, así que la tarjeta es la misma. El
 * orden **viene de la base** y no se toca: si escribiste un nombre querés ese
 * nombre, no el estudio más cerca que se le parezca. Por eso el resultado no
 * pasa por `sortByProximity`.
 */
export async function searchArtists(
  categorySlug: string,
  query: string,
): Promise<readonly ArtistCardData[]> {
  if (query.trim().length < MIN_SEARCH_LENGTH) return []

  const { data, error } = await supabase.rpc('search_professionals', {
    p_category_slug: categorySlug,
    p_query: query,
  })

  if (error != null) throw error

  return (data ?? []).map(toCard)
}

interface RawArtistRow {
  professional_id: string
  slug: string
  display_name: string
  is_fixture: boolean
  avatar_path: string | null
  neighborhood_slug: string | null
  studio_lat: number | null
  studio_lng: number | null
  pieces: unknown
}

function toCard(row: RawArtistRow): ArtistCardData {
  return {
    professionalId: String(row.professional_id),
    slug: String(row.slug),
    displayName: String(row.display_name),
    isFixture: row.is_fixture === true,
    avatarPath: row.avatar_path,
    neighborhoodSlug: row.neighborhood_slug,
    studioCoordinates:
      row.studio_lat == null || row.studio_lng == null
        ? null
        : { lat: row.studio_lat, lng: row.studio_lng },
    pieces: toPieces(row.pieces),
  }
}

interface RawPiece {
  id?: unknown
  path?: unknown
  width?: unknown
  height?: unknown
  blurhash?: unknown
}

function toPieces(raw: unknown): readonly ArtistPiece[] {
  if (!Array.isArray(raw)) return []
  return (raw as RawPiece[])
    .filter((piece) => typeof piece.path === 'string')
    .map((piece) => ({
      id: String(piece.id),
      mediaPath: String(piece.path),
      width: typeof piece.width === 'number' ? piece.width : null,
      height: typeof piece.height === 'number' ? piece.height : null,
      blurhash: typeof piece.blurhash === 'string' ? piece.blurhash : null,
    }))
}

/**
 * URL pública del avatar. El bucket `avatars` es público, igual que
 * `portfolio`, así que no hace falta firmar.
 */
export function avatarUrl(path: string): string {
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

export { mediaUrl }
