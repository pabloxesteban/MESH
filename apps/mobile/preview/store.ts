/**
 * El "backend" del preview web: memoria y nada más.
 *
 * El preview se publica como un archivo suelto y no puede hablar con ningún
 * servidor. Los módulos `*.preview.ts` de cada feature leen de acá, así que el
 * mazo, el gusto y los encajes son **la misma app** —las mismas pantallas, los
 * mismos componentes, el mismo motor de gusto y de matching— corriendo sobre un
 * catálogo horneado en vez de sobre Postgres.
 *
 * Lo que el preview NO prueba: RLS, paginación real, latencia, offline, y todo
 * lo que sea nativo (hápticos, gestos del sistema, performance). Para eso hace
 * falta un dispositivo con Expo Go. Ver docs/design/preview.md.
 */

import {
  findLocation,
  type GeoCoordinates,
  type Interaction,
  type Location,
} from '@mesh/domain'

import { PREVIEW_ARTISTS, type PreviewArtist } from './data.generated.ts'

/** Las decisiones que la persona tomó en esta sesión de preview. */
const interactions = new Map<string, Interaction>()

export function recordPreviewInteraction(item: Interaction): void {
  interactions.set(item.portfolioItemId, item)
}

export function forgetPreviewInteraction(portfolioItemId: string): void {
  interactions.delete(portfolioItemId)
}

export function previewInteractions(): readonly Interaction[] {
  return [...interactions.values()]
}

export function resetPreviewInteractions(): void {
  interactions.clear()
}

export function artistBySlug(slug: string): PreviewArtist | undefined {
  return previewArtists().find((artist) => artist.slug === slug)
}

export function artistOfPiece(pieceId: string): PreviewArtist | undefined {
  return PREVIEW_ARTISTS.find((artist) =>
    artist.pieces.some((piece) => piece.id === pieceId),
  )
}

/**
 * La imagen, ya adentro del bundle.
 *
 * `mediaPath` en la app real es una ruta en Storage. Acá se usa el id de la
 * pieza como ruta, y este mapa lo resuelve al data URI. Las pantallas no se
 * enteran: siguen llamando a `mediaUrl()`.
 */
const MEDIA = new Map<string, string>(
  PREVIEW_ARTISTS.flatMap((artist) =>
    artist.pieces.map((piece) => [piece.id, piece.dataUri] as const),
  ),
)

export function previewMediaUrl(path: string): string {
  return MEDIA.get(path) ?? ''
}

/** Registra una imagen subida desde el estudio. Vive solo en esta sesión. */
export function registerPreviewMedia(id: string, dataUri: string): void {
  MEDIA.set(id, dataUri)
}

// --- estudio -----------------------------------------------------------------
//
// El preview deja recorrer el modo artista entero: darse de alta, declarar
// estilos, publicar la ubicación del estudio, subir una foto, y verla aparecer
// en el mazo. Lo que NO prueba es lo único que importa de seguridad —que un
// artista no pueda escribir en el perfil de otro—, porque eso lo decide RLS y
// acá no hay base.
//
// Los códigos están a la vista, en el código fuente de un archivo que se
// publica. Es correcto: en el preview no hay nada que proteger. En la app de
// verdad viven en `professional_claims`, una tabla que el cliente no puede leer.

/** Código de preview → slug. En la app real esto es una tabla inaccesible. */
const PREVIEW_CODES: Readonly<Record<string, string>> = {
  BRIZA123: 'fixture-vieja-escuela',
  AGUJA456: 'fixture-aguja-fina',
}

export interface PreviewOwnProfile {
  readonly slug: string
  readonly displayName: string
  /**
   * `true` solo si el perfil salió del catálogo horneado. Un perfil que una
   * persona creó desde la app NO es un registro de prueba, ni acá ni en la
   * base: marcarlo así sería mentir en la dirección contraria. Ver ADR-013.
   */
  readonly isFixture: boolean
  readonly instagramHandle: string | null
  readonly whatsappE164: string | null
}

let ownProfile: PreviewOwnProfile | null = null

/** `null` mientras el artista no declaró estilos: entonces valen los horneados. */
let ownStyleSlugs: readonly string[] | null = null

export interface PreviewOwnPiece {
  readonly id: string
  readonly featured: boolean
  readonly styles: readonly { readonly slug: string; readonly weight: number }[]
}

const ownPieces: PreviewOwnPiece[] = []

export function claimPreviewProfessional(code: string): string | null {
  const slug = PREVIEW_CODES[code.toUpperCase().trim()]
  if (slug == null) return null
  const artist = PREVIEW_ARTISTS.find((candidate) => candidate.slug === slug)
  if (artist == null) return null
  ownProfile = {
    slug: artist.slug,
    displayName: artist.displayName,
    isFixture: artist.isFixture,
    instagramHandle: artist.instagramHandle,
    whatsappE164: artist.whatsappE164,
  }
  return slug
}

/**
 * El mismo slug que derivaría `create_own_professional` en Postgres.
 *
 * Repetir la derivación es duplicación, sí — pero la alternativa es que el
 * preview muestre una ruta distinta de la que la app va a mostrar, y la ruta
 * es lo que después se comparte. Si cambia una, tiene que cambiar la otra.
 */
function previewSlugify(displayName: string): string {
  const base = displayName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base === '' ? 'artista' : base
}

export function createPreviewProfessional(input: {
  displayName: string
  instagram?: string | undefined
  whatsapp?: string | undefined
}): string {
  // Los mismos tres rechazos que la función de Postgres, para que el preview
  // falle donde la app real falla y no un paso después.
  if (ownProfile != null) throw new Error('ya tenés un perfil')
  if (input.displayName.trim() === '') throw new Error('hace falta un nombre')
  if (
    (input.instagram ?? '').trim() === '' &&
    (input.whatsapp ?? '').trim() === ''
  ) {
    throw new Error('hace falta al menos un canal de contacto')
  }

  const base = previewSlugify(input.displayName)
  let slug = base
  let intento = 1
  while (PREVIEW_ARTISTS.some((artist) => artist.slug === slug)) {
    intento += 1
    slug = `${base}-${String(intento)}`
  }

  ownProfile = {
    slug,
    displayName: input.displayName.trim(),
    isFixture: false,
    instagramHandle: (input.instagram ?? '').trim() || null,
    whatsappE164: (input.whatsapp ?? '').trim() || null,
  }
  ownStyleSlugs = []
  return slug
}

export function previewOwnProfile(): PreviewOwnProfile | null {
  return ownProfile
}

export function previewOwnedProfessional(): string | null {
  return ownProfile?.slug ?? null
}

/** Los estilos declarados: los que se eligieron, o los horneados si no se tocó. */
export function previewOwnStyleSlugs(): readonly string[] {
  if (ownStyleSlugs != null) return ownStyleSlugs
  const artist = ownProfile == null ? undefined : bakedArtist(ownProfile.slug)
  return (artist?.styles ?? []).map((style) => style.styleSlug)
}

export function setPreviewOwnStyles(slugs: readonly string[]): void {
  if (ownProfile == null) throw new Error('no tenés un perfil')
  ownStyleSlugs = [...slugs]
}

export function previewPiecesOf(): readonly PreviewOwnPiece[] {
  return ownPieces
}

export function addPreviewPiece(piece: PreviewOwnPiece): void {
  ownPieces.unshift(piece)
}

export function removePreviewPiece(id: string): void {
  const index = ownPieces.findIndex((piece) => piece.id === id)
  if (index !== -1) ownPieces.splice(index, 1)
}

/** El id sintético de un profesional. Estable, porque sale del slug. */
export function previewProfessionalId(slug: string): string {
  return `preview-${slug}`
}

/** El inverso exacto de `previewProfessionalId`. */
export function previewSlugOfProfessional(id: string): string {
  return id.startsWith('preview-') ? id.slice('preview-'.length) : id
}

// --- ubicación del estudio ----------------------------------------------------
//
// Igual que `ownPieces`: solo el perfil propio puede tener una. El catálogo
// horneado no trae coordenadas para el resto de los artistas — son fixtures, y
// no inventamos una GPS que nadie dio. El único que puede aparecer con
// distancia en el preview es tu propio perfil, con el mismo botón que en la
// app real.

const studioLocations = new Map<string, GeoCoordinates>()
let ownNeighborhood: string | null = null

export function setPreviewStudioLocation(
  coordinates: GeoCoordinates,
  neighborhoodSlug?: string | null,
): void {
  if (ownProfile == null) return
  studioLocations.set(ownProfile.slug, coordinates)
  // Un barrio no reconocido no borra el que ya estaba, igual que en
  // `set_studio_location`.
  ownNeighborhood = neighborhoodSlug ?? ownNeighborhood
}

export function previewStudioCoordinatesOf(
  slug: string,
): GeoCoordinates | null {
  return studioLocations.get(slug) ?? null
}

// --- el catálogo, con tu perfil adentro ---------------------------------------
//
// `PREVIEW_ARTISTS` es data horneada e inmutable. Tu propio perfil cambia en
// medio de la sesión, así que el catálogo que ven el mazo, los encajes y las
// pantallas de perfil se arma cada vez en vez de hornearse en el import.

function bakedArtist(slug: string): PreviewArtist | undefined {
  return PREVIEW_ARTISTS.find((artist) => artist.slug === slug)
}

/** El catálogo horneado más —o pisado por— el perfil propio de esta sesión. */
export function previewArtists(): readonly PreviewArtist[] {
  if (ownProfile == null) return PREVIEW_ARTISTS

  const baked = bakedArtist(ownProfile.slug)
  const styles = previewOwnStyleSlugs().map((styleSlug, index) => ({
    styleSlug,
    proficiency: 1,
    isPrimary: index < 3,
  }))

  const mine: PreviewArtist = {
    ...(baked ?? {
      slug: ownProfile.slug,
      displayName: ownProfile.displayName,
      isFixture: false,
      bio: null,
      location: null,
      travels: false,
      styles: [],
      price: null,
      availability: null,
      instagramHandle: null,
      whatsappE164: null,
      pieces: [],
    }),
    slug: ownProfile.slug,
    displayName: ownProfile.displayName,
    isFixture: ownProfile.isFixture,
    instagramHandle: ownProfile.instagramHandle,
    whatsappE164: ownProfile.whatsappE164,
    styles,
    location: ownNeighborhood ?? baked?.location ?? null,
  }

  return [mine, ...PREVIEW_ARTISTS.filter((a) => a.slug !== ownProfile?.slug)]
}

// --- ubicación de quien busca --------------------------------------------------
//
// El export estático no tiene GPS real. Una vez que la persona "activa" su
// ubicación en el preview, se usa una posición fija de ejemplo (Palermo) en
// vez de simular un valor al azar — determinismo, mismo criterio que el resto
// del preview.

const PREVIEW_DEVICE_COORDINATES: GeoCoordinates = {
  lat: -34.5875,
  lng: -58.4371,
}

let deviceLocationGranted = false

export function grantPreviewDeviceLocation(): void {
  deviceLocationGranted = true
}

export function previewDeviceCoordinates(): GeoCoordinates | null {
  return deviceLocationGranted ? PREVIEW_DEVICE_COORDINATES : null
}

/**
 * Lo que "usar mi ubicación actual" lee cuando lo toca un artista en el
 * preview. Un punto distinto del de arriba (San Telmo, no Palermo) para que
 * la distancia mostrada en Matches no salga siempre en cero — sigue siendo
 * un valor fijo y no un GPS real, pero demuestra el cálculo de verdad.
 */
const PREVIEW_STUDIO_GPS_READING: GeoCoordinates = {
  lat: -34.6212,
  lng: -58.3731,
}

export function previewStudioGpsReading(): GeoCoordinates {
  return PREVIEW_STUDIO_GPS_READING
}

export function previewLocation(slug: string | null): Location | null {
  if (slug == null) return null
  const found = findLocation(slug)
  if (found == null) return null
  return {
    id: `preview-loc-${found.slug}`,
    slug: found.slug,
    city: found.city,
    adminArea: found.adminArea,
    countryCode: found.countryCode,
    metroKey: found.metroKey,
  }
}

export { PREVIEW_ARTISTS }
export type { PreviewArtist }

// --- perfil propio -------------------------------------------------------------
//
// Arranca sin intención elegida, para que el preview muestre la pregunta de
// onboarding igual que la app real la primera vez.

interface PreviewAccount {
  displayName: string | null
  onboardingIntent: 'offering' | 'looking' | null
}

const account: PreviewAccount = {
  displayName: null,
  onboardingIntent: null,
}

export function previewAccount(): PreviewAccount {
  return { ...account }
}

export function updatePreviewAccount(patch: Partial<PreviewAccount>): void {
  Object.assign(account, patch)
}

// --- chat ----------------------------------------------------------------------
//
// Hilos en memoria, con el slug del artista como identidad — en la app real es
// un uuid, pero acá el catálogo está horneado y el slug ya es único.

export interface PreviewConversation {
  readonly id: string
  /**
   * El **id** del profesional, no su slug. Se llamaba `professionalSlug` y
   * guardaba un id: quien abre un hilo es `ProfileScreen`, que pasa
   * `professional.id`, y en el preview eso es `preview-<slug>`. El nombre
   * mentía y el que lo creía —`artistBySlug`— devolvía `undefined`, así que la
   * lista de chats mostraba `preview-aguja-fina` en lugar del nombre.
   */
  readonly professionalId: string
  lastMessageAt: string | null
  readAt: string | null
  readonly hasUnread: boolean
}

interface PreviewMessage {
  readonly id: string
  readonly senderUserId: string
  readonly body: string
  readonly createdAt: string
}

const conversations = new Map<
  string,
  {
    professionalId: string
    lastMessageAt: string | null
    readAt: string | null
  }
>()
const messagesByConversation = new Map<string, PreviewMessage[]>()
let messageCounter = 0

export function openPreviewConversation(professionalId: string): string {
  const id = `preview-chat-${professionalId}`
  if (!conversations.has(id)) {
    conversations.set(id, {
      professionalId,
      lastMessageAt: null,
      readAt: null,
    })
    messagesByConversation.set(id, [])
    sembrarTurnoPasado(id, professionalId)
  }
  return id
}

/**
 * **Andamio del preview, no comportamiento del producto.**
 *
 * Reseñar exige un turno propio que ya pasó, y en el preview no hay forma de
 * conseguir uno: agendar rechaza el pasado, igual que la base. Sin esto, la
 * mitad de las reseñas —dejarlas— no se puede mirar nunca.
 *
 * Se siembra un turno de hace tres días al abrir un chat con **tu propio
 * perfil**, que es el mismo truco que usan las búsquedas y el interés: el
 * preview tiene un solo perfil con dueño, así que recorrer las dos puntas es
 * hablar con vos mismo.
 *
 * En la app real nadie siembra nada: el turno lo da el artista desde el chat, y
 * pasa cuando pasa.
 */
function sembrarTurnoPasado(
  conversationId: string,
  professionalId: string,
): void {
  const own = previewOwnProfile()
  if (own == null || professionalId !== previewProfessionalId(own.slug)) return

  const inicio = new Date()
  inicio.setDate(inicio.getDate() - 3)
  inicio.setHours(15, 0, 0, 0)
  const fin = new Date(inicio)
  fin.setHours(17, 0, 0, 0)

  turnos.push({
    id: idAlmanaque('appointment'),
    professionalId,
    conversationId,
    startsAt: inicio.toISOString(),
    endsAt: fin.toISOString(),
    note: 'Fine line en el antebrazo',
  })
}

export function previewConversations(): readonly PreviewConversation[] {
  return [...conversations.entries()]
    .map(([id, value]) => ({
      id,
      professionalId: value.professionalId,
      lastMessageAt: value.lastMessageAt,
      readAt: value.readAt,
      hasUnread:
        value.lastMessageAt != null &&
        (value.readAt == null || value.readAt < value.lastMessageAt),
    }))
    .sort((a, b) =>
      (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''),
    )
}

export function previewMessages(
  conversationId: string,
): readonly PreviewMessage[] {
  return messagesByConversation.get(conversationId) ?? []
}

export function addPreviewMessage(
  conversationId: string,
  senderUserId: string,
  body: string,
): void {
  messageCounter += 1
  // Un contador y no un reloj: `Date.now()` haría que dos corridas del preview
  // den resultados distintos, y el orden solo necesita ser estable.
  const createdAt = `2026-08-19T00:00:${String(messageCounter).padStart(2, '0')}Z`
  const list = messagesByConversation.get(conversationId) ?? []
  list.push({
    id: `preview-msg-${String(messageCounter)}`,
    senderUserId,
    body,
    createdAt,
  })
  messagesByConversation.set(conversationId, list)
  const conversation = conversations.get(conversationId)
  if (conversation != null) conversation.lastMessageAt = createdAt
}

export function markPreviewConversationRead(conversationId: string): void {
  const conversation = conversations.get(conversationId)
  if (conversation != null) conversation.readAt = conversation.lastMessageAt
}

// --- proyectos / búsqueda por fotos -------------------------------------------
//
// Un proyecto en memoria, con lo mínimo que necesita el matching por brief:
// estilos y barrio. Nada de presupuesto/timing/descripción porque el flujo de
// preview que los usa es "buscar por fotos", que nunca los pide.

export interface PreviewProject {
  readonly id: string
  readonly title: string
  readonly styleSlugs: readonly string[]
  readonly locationSlug: string | null
}

const previewProjects = new Map<string, PreviewProject>()
let previewProjectCounter = 0

export function createPreviewProject(input: {
  title: string
  styleSlugs: readonly string[]
  locationSlug?: string | undefined
}): string {
  previewProjectCounter += 1
  const id = `preview-project-${String(previewProjectCounter)}`
  previewProjects.set(id, {
    id,
    title: input.title,
    styleSlugs: input.styleSlugs,
    locationSlug: input.locationSlug ?? null,
  })
  return id
}

export function previewProject(id: string): PreviewProject | undefined {
  return previewProjects.get(id)
}

// --- búsquedas abiertas ---------------------------------------------------------
//
// La otra dirección de MESH: lo que ve un tatuador. Ver ADR-014.
//
// Dos ejemplos horneados más lo que abras vos desde "Buscar por fotos" con el
// interruptor encendido. Los ejemplos son inventados igual que los diez
// artistas del catálogo —el preview entero es una maqueta y lo dice arriba de
// todo— y usan una foto del catálogo como referencia porque no hay otra imagen
// adentro del bundle.
//
// Lo que el preview NO prueba de esto es lo único que importa: que una búsqueda
// cerrada no la vea nadie. Eso lo decide RLS. Está en
// supabase/tests/46_open_searches.sql.

export interface PreviewOpenSearch {
  readonly projectId: string
  readonly title: string
  readonly styleSlugs: readonly string[]
  readonly locationSlug: string | null
  readonly referenceIds: readonly string[]
  readonly createdAt: string
}

function ejemploDeBusqueda(
  projectId: string,
  title: string,
  styleSlug: string,
  locationSlug: string,
  createdAt: string,
): PreviewOpenSearch {
  // La primera pieza del catálogo que sea de ese estilo. Si no hay ninguna, la
  // búsqueda va sin foto — que es un estado real y la tarjeta lo contempla.
  const pieza = PREVIEW_ARTISTS.flatMap((artist) => artist.pieces).find(
    (candidate) => candidate.styles.some((style) => style.slug === styleSlug),
  )
  return {
    projectId,
    title,
    styleSlugs: [styleSlug],
    locationSlug,
    referenceIds: pieza == null ? [] : [pieza.id],
    createdAt,
  }
}

const BUSQUEDAS_HORNEADAS: readonly PreviewOpenSearch[] = [
  ejemploDeBusqueda(
    'preview-search-1',
    'Algo de línea fina en el antebrazo',
    'fine-line',
    'palermo',
    '2026-08-18T12:00:00Z',
  ),
  ejemploDeBusqueda(
    'preview-search-2',
    'Blackwork chico, primera vez',
    'blackwork',
    'san-telmo',
    '2026-08-17T12:00:00Z',
  ),
]

const busquedasPropias: PreviewOpenSearch[] = []

/** Lo que "Buscar por fotos" abre cuando el interruptor está encendido. */
export function openPreviewSearch(search: PreviewOpenSearch): void {
  busquedasPropias.unshift(search)
}

/** Suma una foto de referencia a una búsqueda propia ya abierta. */
export function attachPreviewSearchReference(
  projectId: string,
  mediaId: string,
): void {
  const indice = busquedasPropias.findIndex(
    (search) => search.projectId === projectId,
  )
  const search = busquedasPropias[indice]
  if (search == null) return
  busquedasPropias[indice] = {
    ...search,
    referenceIds: [...search.referenceIds, mediaId],
  }
}

/**
 * Un reloj de mentira, monótono.
 *
 * `Date.now()` haría que dos corridas del preview den resultados distintos, y
 * el orden solo necesita ser estable. Mismo criterio que los mensajes.
 */
let relojPreview = 0

export function nextPreviewTimestamp(): string {
  relojPreview += 1
  return `2026-08-19T01:00:${String(relojPreview).padStart(2, '0')}Z`
}

export type PreviewVerdict = 'interest' | 'pass'

/**
 * Lo que el artista respondió sobre una búsqueda.
 *
 * Un `interest` **siempre** trae propuesta, igual que en la base: desde ADR-020
 * la restricción `project_interests_proposal_shape` no deja existir un interés
 * sin rango ni sesiones. El preview lo respeta para no mostrar una forma que la
 * app real rechaza.
 */
export interface PreviewDecision {
  readonly verdict: PreviewVerdict
  readonly priceMinCents: number | null
  readonly priceMaxCents: number | null
  readonly sessions: number | null
  readonly note: string | null
}

const decisiones = new Map<string, PreviewDecision>()

/**
 * Las búsquedas que este artista todavía no decidió, y que piden algún estilo
 * que hace. El mismo filtro que hace el RPC, y por el mismo motivo: mostrarle
 * a alguien que hace blackwork una búsqueda de lettering es ruido.
 */
export function previewOpenSearches(): readonly PreviewOpenSearch[] {
  const mios = new Set(previewOwnStyleSlugs())
  return [...busquedasPropias, ...BUSQUEDAS_HORNEADAS].filter(
    (search) =>
      !decisiones.has(search.projectId) &&
      search.styleSlugs.some((slug) => mios.has(slug)),
  )
}

export function decidePreviewSearch(
  projectId: string,
  verdict: PreviewVerdict,
  propuesta?: {
    priceMinCents: number
    priceMaxCents: number
    sessions: number
    note: string | null
  },
): void {
  decisiones.set(projectId, {
    verdict,
    priceMinCents: propuesta?.priceMinCents ?? null,
    priceMaxCents: propuesta?.priceMaxCents ?? null,
    sessions: propuesta?.sessions ?? null,
    note: propuesta?.note ?? null,
  })
}

export function undoPreviewSearchDecision(projectId: string): void {
  decisiones.delete(projectId)
}

/**
 * Los artistas que levantaron la mano ante una búsqueda tuya.
 *
 * En el preview hay un solo artista con dueño —el tuyo— así que esto se llena
 * cuando vos mismo tocás "me interesa" sobre una búsqueda que vos mismo
 * abriste. Suena raro y es exactamente lo que hace falta para recorrer el
 * circuito completo sin dos teléfonos.
 */
export function previewSearchInterests(): readonly {
  interestId: string
  projectId: string
  projectTitle: string
  professionalSlug: string
  professionalName: string
  createdAt: string
  priceMinCents: number
  priceMaxCents: number
  sessions: number
  note: string | null
}[] {
  const own = previewOwnProfile()
  if (own == null) return []

  return [...busquedasPropias, ...BUSQUEDAS_HORNEADAS]
    .filter(
      (search) =>
        decisiones.get(search.projectId)?.verdict === 'interest' &&
        busquedasPropias.some((mia) => mia.projectId === search.projectId),
    )
    .map((search) => {
      const decision = decisiones.get(search.projectId)
      return {
        interestId: `preview-interest-${search.projectId}`,
        projectId: search.projectId,
        projectTitle: search.title,
        professionalSlug: own.slug,
        professionalName: own.displayName,
        createdAt: search.createdAt,
        // Los `?? 0` no se alcanzan: el filtro de arriba ya dejó solo intereses,
        // y un interés sin propuesta no se puede crear.
        priceMinCents: decision?.priceMinCents ?? 0,
        priceMaxCents: decision?.priceMaxCents ?? 0,
        sessions: decision?.sessions ?? 1,
        note: decision?.note ?? null,
      }
    })
}

export function dismissPreviewInterest(interestId: string): void {
  const projectId = interestId.replace('preview-interest-', '')
  decisiones.delete(projectId)
}

// --- almanaque ----------------------------------------------------------------
//
// Horario, excepciones y turnos, en memoria. Arranca **vacío a propósito**: un
// preview con horarios horneados sería disponibilidad inventada, que es
// exactamente lo que el innegociable 2 prohíbe mostrar. El almanaque se llena
// cargándolo desde el Estudio, que es el recorrido que el preview sirve para
// mirar.
//
// El turno sale del chat, y en el preview hay un solo perfil con dueño —el
// tuyo—, así que para recorrer el circuito completo hay que abrir un chat con
// tu propio perfil. Es el mismo truco que usa `previewSearchInterests`: raro de
// contar, y la única forma de ver las dos puntas sin dos teléfonos.

export interface PreviewRule {
  readonly id: string
  readonly professionalId: string
  readonly weekday: number
  readonly startsAt: string
  readonly endsAt: string
}

export interface PreviewException {
  readonly id: string
  readonly professionalId: string
  readonly onDate: string
  readonly isOpen: boolean
  readonly startsAt: string | null
  readonly endsAt: string | null
}

export interface PreviewAppointment {
  readonly id: string
  readonly professionalId: string
  readonly conversationId: string | null
  readonly startsAt: string
  readonly endsAt: string
  readonly note: string | null
}

const reglas: PreviewRule[] = []
const excepciones: PreviewException[] = []
const turnos: PreviewAppointment[] = []
let contadorAlmanaque = 0

function idAlmanaque(prefijo: string): string {
  contadorAlmanaque += 1
  return `preview-${prefijo}-${String(contadorAlmanaque)}`
}

export function previewRulesOf(professionalId: string): readonly PreviewRule[] {
  return reglas
    .filter((rule) => rule.professionalId === professionalId)
    .sort(
      (a, b) => a.weekday - b.weekday || a.startsAt.localeCompare(b.startsAt),
    )
}

export function addPreviewRule(
  professionalId: string,
  weekday: number,
  startsAt: string,
  endsAt: string,
): void {
  // Mismo tramo dos veces es el mismo tramo: la tabla real tiene un unique y
  // el preview tiene que mentir lo menos posible sobre eso.
  const yaEsta = reglas.some(
    (rule) =>
      rule.professionalId === professionalId &&
      rule.weekday === weekday &&
      rule.startsAt === startsAt &&
      rule.endsAt === endsAt,
  )
  if (yaEsta) return
  reglas.push({
    id: idAlmanaque('rule'),
    professionalId,
    weekday,
    startsAt,
    endsAt,
  })
}

export function removePreviewRule(id: string): void {
  const index = reglas.findIndex((rule) => rule.id === id)
  if (index !== -1) reglas.splice(index, 1)
}

export function previewExceptionsOf(
  professionalId: string,
  fromDate: string,
): readonly PreviewException[] {
  return excepciones
    .filter(
      (item) =>
        item.professionalId === professionalId && item.onDate >= fromDate,
    )
    .sort((a, b) => a.onDate.localeCompare(b.onDate))
}

export function closePreviewDay(professionalId: string, onDate: string): void {
  const yaEsta = excepciones.some(
    (item) => item.professionalId === professionalId && item.onDate === onDate,
  )
  if (yaEsta) return
  excepciones.push({
    id: idAlmanaque('exception'),
    professionalId,
    onDate,
    isOpen: false,
    startsAt: null,
    endsAt: null,
  })
}

export function removePreviewException(id: string): void {
  const index = excepciones.findIndex((item) => item.id === id)
  if (index !== -1) excepciones.splice(index, 1)
}

export function previewAppointments(): readonly PreviewAppointment[] {
  return [...turnos].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function previewBusySlots(
  professionalId: string,
  from: string,
  to: string,
): readonly { startsAt: string; endsAt: string }[] {
  return turnos
    .filter(
      (turno) =>
        turno.professionalId === professionalId &&
        turno.endsAt > from &&
        turno.startsAt < to,
    )
    .map((turno) => ({ startsAt: turno.startsAt, endsAt: turno.endsAt }))
}

/**
 * Agenda un turno, o dice por qué no.
 *
 * Repite las tres reglas que en la base son restricciones —el pasado no se
 * agenda, el fin va después del inicio, y dos turnos no se pisan— porque un
 * preview que las deje pasar muestra una pantalla que en la app real da error.
 */
export function schedulePreviewAppointment(
  professionalId: string,
  conversationId: string,
  startsAt: string,
  endsAt: string,
  note: string | null,
): 'ok' | 'taken' | 'past' {
  if (endsAt <= startsAt) return 'past'
  if (new Date(startsAt).getTime() < Date.now()) return 'past'

  const sePisa = turnos.some(
    (turno) =>
      turno.professionalId === professionalId &&
      turno.startsAt < endsAt &&
      startsAt < turno.endsAt,
  )
  if (sePisa) return 'taken'

  turnos.push({
    id: idAlmanaque('appointment'),
    professionalId,
    conversationId,
    startsAt,
    endsAt,
    note,
  })
  return 'ok'
}

export function cancelPreviewAppointment(id: string): void {
  const index = turnos.findIndex((turno) => turno.id === id)
  if (index !== -1) turnos.splice(index, 1)
}

/** El id del profesional de un hilo, o `null` si el hilo no existe. */
export function previewConversationProfessional(
  conversationId: string,
): string | null {
  return conversations.get(conversationId)?.professionalId ?? null
}

// --- reseñas ------------------------------------------------------------------

export interface PreviewReview {
  readonly id: string
  readonly appointmentId: string
  readonly professionalId: string
  readonly rating: number
  readonly body: string | null
  readonly mediaPath: string | null
  readonly appointmentEndsAt: string
  readonly createdAt: string
}

// Arranca vacío, y eso es la mitad de lo que hay que poder mirar: un perfil sin
// reseñas tiene que decirlo con palabras y no mostrar cinco estrellas vacías.
const resenas: PreviewReview[] = []
let contadorResenas = 0

export function previewReviewsOf(
  professionalId: string,
): readonly PreviewReview[] {
  return resenas
    .filter((r) => r.professionalId === professionalId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function previewReviewSummaryOf(professionalId: string): {
  count: number
  average: number | null
} {
  const propias = resenas.filter((r) => r.professionalId === professionalId)
  if (propias.length === 0) return { count: 0, average: null }
  const suma = propias.reduce((total, r) => total + r.rating, 0)
  return {
    count: propias.length,
    // Un decimal, igual que `round(avg(rating), 1)` en Postgres.
    average: Math.round((suma / propias.length) * 10) / 10,
  }
}

/**
 * Los turnos propios que ya pasaron y no tienen reseña.
 *
 * En el preview "propio" es cualquier turno que exista, porque hay una sola
 * persona usando la app. El candado de verdad está en la política de `reviews`
 * y se testea en `supabase/tests/51_reviews.sql`.
 */
export function previewReviewableAppointments(): readonly {
  appointmentId: string
  professionalId: string
  conversationId: string | null
  endsAt: string
}[] {
  const ahora = new Date().toISOString()
  return turnos
    .filter(
      (turno) =>
        turno.endsAt < ahora &&
        !resenas.some((r) => r.appointmentId === turno.id),
    )
    .map((turno) => ({
      appointmentId: turno.id,
      professionalId: turno.professionalId,
      conversationId: turno.conversationId,
      endsAt: turno.endsAt,
    }))
}

export function addPreviewReview(input: {
  appointmentId: string
  professionalId: string
  rating: number
  body: string | null
  mediaPath: string | null
}): void {
  const turno = turnos.find((t) => t.id === input.appointmentId)
  if (turno == null) throw new Error('ese turno no existe')

  contadorResenas += 1
  resenas.push({
    id: `preview-review-${String(contadorResenas)}`,
    appointmentId: input.appointmentId,
    professionalId: input.professionalId,
    rating: input.rating,
    body: input.body,
    mediaPath: input.mediaPath,
    appointmentEndsAt: turno.endsAt,
    // Un contador y no un reloj: dos corridas del preview tienen que dar el
    // mismo orden. Mismo criterio que los mensajes.
    createdAt: `2026-08-20T00:00:${String(contadorResenas).padStart(2, '0')}Z`,
  })
}
