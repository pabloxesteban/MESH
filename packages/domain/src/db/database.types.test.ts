/**
 * Reconciliación entre el esquema y los tipos de dominio.
 *
 * Existen dos representaciones del mismo modelo por razones buenas: los tipos
 * generados son el contrato literal con Postgres (snake_case, nullables tal
 * cual, todo aplanado), y los de `types/core.ts` son la forma que el producto
 * quiere usar (camelCase, objetos anidados, `Location` en vez de
 * `location_id`). Ninguna de las dos reemplaza a la otra.
 *
 * Lo que NO puede pasar es que se separen sin que nadie se entere. Este archivo
 * es donde se cruzan: los enums se comparan a nivel de tipo Y en runtime, y las
 * columnas que el dominio asume se afirman contra la tabla generada.
 *
 * Si una migración cambia un enum y este archivo no compila, funcionó.
 */

import { describe, expect, it } from 'vitest'

import type {
  AvailabilityStatus,
  InteractionSource,
  InteractionVerdict,
  MatchBand,
  ProjectStatus,
  ProjectTiming,
} from '../types/core.ts'
import { Constants, type Database } from './database.types.ts'

type PublicSchema = Database['public']
type Tables = PublicSchema['Tables']
type Enums = PublicSchema['Enums']

/** Igualdad de tipos exacta — `extends` en las dos direcciones no alcanza. */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

/** Falla la compilación si el argumento no es exactamente `true`. */
type Assert<T extends true> = T

type ProfessionalRow = Tables['professionals']['Row']
type InteractionRow = Tables['interactions']['Row']
type MatchRow = Tables['matches']['Row']
type TasteProfileRow = Tables['taste_profiles']['Row']
type FeedRow =
  PublicSchema['Functions']['get_discovery_feed']['Returns'][number]

/**
 * La lista de tablas está escrita a mano a propósito: agregar una obliga a pasar
 * por acá, que es donde uno se pregunta si el dominio también la necesita y si
 * sus políticas ya están en docs/security/security-model.md.
 */
const KNOWN_TABLES = [
  'analytics_events',
  'appointments',
  'audit_events',
  'availability_exceptions',
  'availability_rules',
  'categories',
  'conversations',
  'interactions',
  'locations',
  'matches',
  'media_assets',
  'messages',
  'portfolio_item_styles',
  'portfolio_items',
  'professional_claims',
  'professional_styles',
  'professionals',
  'profiles',
  'project_interests',
  'project_references',
  'project_styles',
  'project_traits',
  'projects',
  'reviews',
  'saved_items',
  'styles',
  'taste_profiles',
  'traits',
] as const satisfies readonly (keyof Tables)[]

type KnownTable = (typeof KNOWN_TABLES)[number]

/**
 * Todas las afirmaciones de tipo, en un solo lugar. Cada miembro es `true` si el
 * esquema y el dominio coinciden, y un error de compilación si no.
 *
 * De las columnas se afirma lo que el dominio LEE, no la tabla entera: reescribir
 * el esquema a mano acá sería exactamente el trabajo que el generador existe
 * para evitar.
 */
interface Reconciliacion {
  // Enums: manda el esquema.
  availabilityStatus: Assert<
    Equal<Enums['availability_status'], AvailabilityStatus>
  >
  interactionVerdict: Assert<
    Equal<Enums['interaction_verdict'], InteractionVerdict>
  >
  interactionSource: Assert<
    Equal<Enums['interaction_source'], InteractionSource>
  >
  projectTiming: Assert<Equal<Enums['project_timing'], ProjectTiming>>
  projectStatus: Assert<Equal<Enums['project_status'], ProjectStatus>>
  matchBand: Assert<Equal<Enums['match_band'], MatchBand>>

  // Columnas que el dominio da por sentadas.
  professionalSlug: Assert<Equal<ProfessionalRow['slug'], string>>
  professionalBio: Assert<Equal<ProfessionalRow['bio'], string | null>>
  professionalTravels: Assert<Equal<ProfessionalRow['travels'], boolean>>
  professionalPricedAt: Assert<
    Equal<ProfessionalRow['priced_at'], string | null>
  >
  professionalAvailability: Assert<
    Equal<ProfessionalRow['availability_status'], AvailabilityStatus | null>
  >
  interactionVerdictColumn: Assert<
    Equal<InteractionRow['verdict'], InteractionVerdict>
  >
  interactionSaved: Assert<Equal<InteractionRow['is_saved'], boolean>>
  matchBandColumn: Assert<Equal<MatchRow['band'], MatchBand>>
  matchProjectId: Assert<Equal<MatchRow['project_id'], string | null>>
  tasteReady: Assert<Equal<TasteProfileRow['is_ready'], boolean>>
  tasteCount: Assert<Equal<TasteProfileRow['decisive_count'], number>>

  // El feed es un RPC, así que su forma también es parte del contrato.
  feedCursor: Assert<Equal<FeedRow['feed_cursor'], string>>
  feedItemId: Assert<Equal<FeedRow['portfolio_item_id'], string>>

  // Inventario, en las dos direcciones: una tabla que desaparece rompe el
  // `satisfies` de arriba, y una tabla nueva rompe esta línea.
  inventario: Assert<Equal<Exclude<keyof Tables, KnownTable>, never>>
}

describe('el esquema y el dominio no se separaron', () => {
  it('las afirmaciones de tipo compilan', () => {
    // Este `it` no verifica nada por sí solo: lo verifica `tsc`. Existe para
    // que la suite reporte el archivo, y para que `Reconciliacion` esté usada.
    const reconciliacion = {} as Reconciliacion
    expect(reconciliacion).toBeDefined()
    expect(KNOWN_TABLES).toHaveLength(28)
  })

  const enums: ReadonlyArray<
    readonly [keyof typeof Constants.public.Enums, readonly string[]]
  > = [
    ['availability_status', ['open', 'limited', 'waitlist', 'closed']],
    ['interaction_verdict', ['like', 'pass']],
    ['interaction_source', ['discover', 'search', 'profile']],
    ['project_timing', ['asap', 'weeks', 'months', 'flexible']],
    ['project_status', ['draft', 'active', 'archived']],
    ['match_band', ['strong', 'good', 'possible']],
  ]

  // El orden importa: en Postgres el orden de un enum es su orden de
  // comparación, y un `order by band` que cambie de significado en silencio es
  // el tipo de regresión que nadie ve hasta que la lista sale al revés.
  it.each(enums)('el enum %s coincide, en orden', (name, expected) => {
    expect([...Constants.public.Enums[name]]).toEqual([...expected])
  })
})
