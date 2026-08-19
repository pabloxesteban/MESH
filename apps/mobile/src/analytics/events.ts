/**
 * Catálogo de eventos, tipado.
 *
 * La unión discriminada es la que impone las reglas de privacidad de
 * `docs/product/metrics.md` §5: **no hay ningún evento cuyas propiedades
 * admitan texto libre.** Solo conteos, enums, booleanos e ids. Agregar un
 * evento con una propiedad `string` suelta requiere escribirla acá, y ese es
 * exactamente el momento en que hay que preguntarse si corresponde.
 *
 * Lo que NO existe a propósito:
 *   - tiempo de permanencia en una tarjeta: mediría atención, y optimizar por
 *     atención es lo que MESH decidió no hacer;
 *   - nombres de estilos en los eventos de gusto: un vector de gusto es un
 *     proxy razonable de la identidad de alguien, y vive bajo RLS en
 *     `taste_profiles`, no en un flujo de analytics;
 *   - texto de búsqueda, descripciones de proyecto, mensajes ni strings de
 *     error.
 */

export type Via = 'gesture' | 'button'
export type MatchBandName = 'strong' | 'good' | 'possible'
export type ProfileSource = 'match' | 'discover' | 'search' | 'project'

export type AnalyticsEvent =
  | { name: 'app_opened'; props: { is_first_open: boolean } }
  | { name: 'onboarding_started'; props: Record<string, never> }
  | { name: 'onboarding_completed'; props: { interaction_count: number } }
  | {
      name: 'artwork_viewed'
      props: { portfolio_item_id: string; position: number }
    }
  | { name: 'artwork_liked'; props: { portfolio_item_id: string; via: Via } }
  | { name: 'artwork_passed'; props: { portfolio_item_id: string; via: Via } }
  | { name: 'artwork_saved'; props: { portfolio_item_id: string; via: Via } }
  | {
      name: 'artwork_undone'
      props: { portfolio_item_id: string; previous_verdict: 'like' | 'pass' }
    }
  | {
      name: 'taste_profile_generated'
      props: {
        style_count: number
        interaction_count: number
        taste_version: string
      }
    }
  | { name: 'taste_profile_viewed'; props: { source: string } }
  | { name: 'taste_profile_reset'; props: { interaction_count: number } }
  | {
      name: 'match_viewed'
      props: {
        professional_id: string
        band: MatchBandName
        rank: number
        matching_version: string
      }
    }
  | {
      name: 'match_list_empty'
      props: { reason: 'not_ready' | 'no_candidates' }
    }
  | {
      name: 'professional_profile_viewed'
      props: { professional_id: string; source: ProfileSource }
    }
  | {
      name: 'contact_clicked'
      props: {
        professional_id: string
        channel: 'whatsapp' | 'instagram'
        has_project: boolean
      }
    }
  | { name: 'contact_message_edited'; props: { professional_id: string } }
  | { name: 'project_started'; props: Record<string, never> }
  | {
      name: 'project_completed'
      props: {
        has_budget: boolean
        has_references: boolean
        style_count: number
      }
    }
  | { name: 'project_abandoned'; props: { last_step: string } }
  | { name: 'search_performed'; props: { filter_count: number } }
  // El mazo del artista. `project_id` y nada más: quién publicó la búsqueda no
  // entra a analytics, igual que no entra a la tarjeta. Ver ADR-014.
  | { name: 'search_interested'; props: { project_id: string; via: Via } }
  | { name: 'search_passed'; props: { project_id: string; via: Via } }
  | {
      name: 'search_undone'
      props: { project_id: string; previous_verdict: string }
    }
  | { name: 'search_opened'; props: { is_open: boolean } }
  | { name: 'error_shown'; props: { surface: string; error_code: string } }

export type EventName = AnalyticsEvent['name']

/** Todos los nombres, para el test que verifica que el catálogo esté completo. */
export const EVENT_NAMES = [
  'app_opened',
  'onboarding_started',
  'onboarding_completed',
  'artwork_viewed',
  'artwork_liked',
  'artwork_passed',
  'artwork_saved',
  'artwork_undone',
  'taste_profile_generated',
  'taste_profile_viewed',
  'taste_profile_reset',
  'match_viewed',
  'match_list_empty',
  'professional_profile_viewed',
  'contact_clicked',
  'contact_message_edited',
  'project_started',
  'project_completed',
  'project_abandoned',
  'search_performed',
  'search_interested',
  'search_passed',
  'search_undone',
  'search_opened',
  'error_shown',
] as const satisfies readonly EventName[]
