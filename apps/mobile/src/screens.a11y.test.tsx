/**
 * Barrido de accesibilidad y callejones sobre las pantallas reales.
 *
 * No revisa una pantalla: las recorre todas, en todos sus estados, y aplica las
 * mismas tres reglas a cada una. Una revisión manual encuentra lo que uno mira;
 * esto encuentra lo que uno no.
 *
 * Las tres reglas, de `.claude/workflows/ui-review.md`:
 *
 * 1. **Todo lo que se toca tiene nombre accesible.** Un botón sin etiqueta es
 *    un botón que un lector de pantalla anuncia como "botón".
 * 2. **Ninguna pantalla es un callejón.** Todo estado —incluidos vacío y
 *    error— ofrece al menos una acción hacia adelante.
 * 3. **Todo lo que se toca llega a 44pt.** Un objetivo de 30pt lo falla
 *    cualquiera con las manos frías.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { ReactElement } from 'react'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'
import { MIN_TOUCH_TARGET } from '@/design-system/index.ts'

import { ExploreScreen } from '@/features/discovery/ExploreScreen.tsx'
import { ArtistsScreen } from '@/features/artists/ArtistsScreen.tsx'
import { ProfileScreen } from '@/features/profile/ProfileScreen.tsx'
import { ContactScreen } from '@/features/contact/ContactScreen.tsx'
import { ProjectFormScreen } from '@/features/projects/ProjectFormScreen.tsx'
import { QuickSearchScreen } from '@/features/quick-search/QuickSearchScreen.tsx'
import { AccountScreen } from '@/features/account/AccountScreen.tsx'
import { IntentScreen } from '@/features/onboarding/IntentScreen.tsx'
import { ChatScreen } from '@/features/chat/ChatScreen.tsx'
import { StudioScreen } from '@/features/artist/StudioScreen.tsx'
import { SearchDeckScreen } from '@/features/demand/SearchDeckScreen.tsx'
import { ChatsScreen } from '@/features/chat/ChatsScreen.tsx'
import { AuthForm } from '@/features/auth/AuthForm.tsx'
import { NewPasswordScreen } from '@/features/auth/NewPasswordScreen.tsx'
import { SavedScreen } from '@/features/saved/SavedScreen.tsx'

const mockRpc = jest.fn()
jest.mock('@/data/supabase.ts', () => ({
  get supabase() {
    return {
      rpc: mockRpc,
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        }),
        upsert: async () => ({ error: null }),
      }),
      storage: {
        from: () => ({
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://ejemplo.test/${path}` },
          }),
        }),
      },
    }
  },
}))

jest.mock('@/features/profile/queries.ts', () => ({ fetchProfile: jest.fn() }))
jest.mock('@/features/artists/queries.ts', () => ({
  fetchArtistGrid: jest.fn().mockResolvedValue([]),
  avatarUrl: (path: string) => `https://ejemplo.test/${path}`,
  mediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))
jest.mock('@/features/saved/queries.ts', () => ({
  fetchSaved: jest.fn().mockResolvedValue([]),
  fetchSavedIds: jest.fn().mockResolvedValue(new Set()),
  savePiece: jest.fn(),
  unsavePiece: jest.fn(),
}))
jest.mock('@/features/settings/AnalyticsToggle.tsx', () => ({
  AnalyticsToggle: () => null,
}))
jest.mock('@/features/account/queries.ts', () => ({
  fetchAccount: jest.fn().mockResolvedValue({
    displayName: null,
    onboardingIntent: 'looking',
  }),
  updateAccount: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/features/chat/queries.ts', () => ({
  fetchConversations: jest.fn().mockResolvedValue([]),
  fetchMessages: jest.fn().mockResolvedValue([]),
  sendMessage: jest.fn().mockResolvedValue(undefined),
  markConversationRead: jest.fn().mockResolvedValue(undefined),
  subscribeToMessages: jest.fn().mockReturnValue(() => undefined),
}))
jest.mock('@/features/reviews/queries.ts', () => ({
  fetchReviews: jest.fn().mockResolvedValue([]),
  fetchReviewSummary: jest.fn().mockResolvedValue({ count: 0, average: null }),
  fetchReviewableAppointments: jest.fn().mockResolvedValue([]),
  createReview: jest.fn(),
  reviewMediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))
jest.mock('@/features/reviews/upload.ts', () => ({
  uploadReviewPhoto: jest.fn(),
}))
jest.mock('@/features/scheduling/queries.ts', () => ({
  ...jest.requireActual('@/features/scheduling/queries.ts'),
  fetchWeeklyRules: jest.fn().mockResolvedValue([]),
  fetchExceptions: jest.fn().mockResolvedValue([]),
  fetchBusySlots: jest.fn().mockResolvedValue([]),
  fetchAppointments: jest.fn().mockResolvedValue([]),
  fetchOwnProfessionalForConversation: jest.fn().mockResolvedValue(null),
  addWeeklyRule: jest.fn(),
  removeWeeklyRule: jest.fn(),
  closeDay: jest.fn(),
  removeException: jest.fn(),
  scheduleAppointment: jest.fn(),
  cancelAppointment: jest.fn(),
}))
jest.mock('@/features/location/device.ts', () => ({
  hasDeviceLocationPermission: jest.fn().mockResolvedValue(false),
  currentDeviceLocation: jest.fn().mockResolvedValue(null),
  requestDeviceLocation: jest.fn().mockResolvedValue(null),
}))
jest.mock('@/features/artist/queries.ts', () => ({
  fetchOwnedProfessional: jest.fn().mockResolvedValue(null),
  fetchOwnedPieces: jest.fn().mockResolvedValue([]),
  claimProfessional: jest.fn(),
  createOwnProfessional: jest.fn(),
  setOwnStyles: jest.fn(),
  setStudioLocation: jest.fn(),
  addPiece: jest.fn(),
  removePiece: jest.fn(),
}))
jest.mock('@/features/artist/gps.ts', () => ({
  readDeviceGps: jest.fn().mockResolvedValue({
    granted: false,
    coordinates: null,
    neighborhoodSlug: null,
  }),
}))
jest.mock('@/features/artist/upload.ts', () => ({
  uploadPortfolioPiece: jest.fn(),
}))
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}))
jest.mock('@/features/discovery/queries.ts', () => ({
  ...jest.requireActual('@/features/discovery/queries.ts'),
  fetchDiscoveryFeed: jest
    .fn()
    .mockResolvedValue({ items: [], nextCursor: null }),
  mediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))
jest.mock('@/features/discovery/interactions.ts', () => ({
  recordInteraction: jest.fn().mockResolvedValue(undefined),
  undoInteraction: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/features/demand/queries.ts', () => ({
  fetchOpenSearchFeed: jest
    .fn()
    .mockResolvedValue({ items: [], nextCursor: null }),
  decideOnSearch: jest.fn(),
  undoDecision: jest.fn(),
}))
jest.mock('@/features/demand/interests.ts', () => ({
  fetchSearchInterests: jest.fn().mockResolvedValue([]),
  dismissInterest: jest.fn(),
}))
jest.mock('@/features/quick-search/classify.ts', () => ({
  classifyReferencePhoto: jest.fn().mockResolvedValue('fine-line'),
}))
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: 'undetermined' }),
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
}))

import { fetchProfile } from '@/features/profile/queries.ts'
import {
  fetchAppointments,
  fetchOwnProfessionalForConversation,
  fetchWeeklyRules,
} from '@/features/scheduling/queries.ts'
import { fetchReviewableAppointments } from '@/features/reviews/queries.ts'
import { fetchArtistGrid } from '@/features/artists/queries.ts'
import { fetchOwnedProfessional } from '@/features/artist/queries.ts'
import { fetchOpenSearchFeed } from '@/features/demand/queries.ts'
import { fetchDiscoveryFeed } from '@/features/discovery/queries.ts'

const HOY = '2026-08-18'

function render(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">{element}</I18nProvider>
    </QueryClientProvider>,
  )
}

/** Nombre accesible de un nodo: etiqueta explícita, o el texto que contiene. */
function accessibleName(node: {
  props: Record<string, unknown>
  children: unknown[]
}): string {
  const label = node.props['accessibilityLabel']
  if (typeof label === 'string' && label.trim().length > 0) return label

  const texts: string[] = []
  const visit = (current: unknown) => {
    if (typeof current === 'string') {
      texts.push(current)
      return
    }
    if (
      current != null &&
      typeof current === 'object' &&
      'children' in current
    ) {
      for (const child of (current as { children: unknown[] }).children ?? []) {
        visit(child)
      }
    }
  }
  visit(node)
  return texts.join(' ').trim()
}

/** Alto y ancho mínimos declarados en el estilo, aplanando arrays. */
function minSize(style: unknown): { height: number; width: number } {
  const flat = (Array.isArray(style) ? style : [style]).filter(Boolean)
  let height = 0
  let width = 0
  for (const entry of flat) {
    const record = entry as Record<string, unknown>
    height = Math.max(
      height,
      Number(record?.['minHeight'] ?? record?.['height'] ?? 0),
    )
    width = Math.max(
      width,
      Number(record?.['minWidth'] ?? record?.['width'] ?? 0),
    )
  }
  return { height, width }
}

function touchables() {
  return screen.UNSAFE_root.findAll(
    (node) =>
      node.props?.accessibilityRole === 'button' &&
      node.props?.accessible !== false,
  )
}

/** Aplica las tres reglas al árbol que está en pantalla. */
function sweep(name: string) {
  const found = touchables()
  expect(found.length).toBeGreaterThan(0)

  const sinNombre: string[] = []
  const chicos: string[] = []

  for (const node of found) {
    const label = accessibleName(
      node as unknown as {
        props: Record<string, unknown>
        children: unknown[]
      },
    )
    if (label.length === 0) {
      sinNombre.push(JSON.stringify(node.props['testID'] ?? '(sin testID)'))
      continue
    }

    const { height, width } = minSize(node.props['style'])
    const hitSlop = node.props['hitSlop'] as
      | { top?: number; bottom?: number; left?: number; right?: number }
      | undefined
    const efectivoAlto = height + (hitSlop?.top ?? 0) + (hitSlop?.bottom ?? 0)
    const efectivoAncho = width + (hitSlop?.left ?? 0) + (hitSlop?.right ?? 0)

    // Solo se exige cuando el nodo declara tamaño: un botón que se estira con
    // su contenido puede no tener `minHeight` y medir de sobra.
    if (height > 0 && efectivoAlto < MIN_TOUCH_TARGET) {
      chicos.push(`${label}: alto ${efectivoAlto}`)
    }
    if (width > 0 && efectivoAncho < MIN_TOUCH_TARGET) {
      chicos.push(`${label}: ancho ${efectivoAncho}`)
    }
  }

  expect({ pantalla: name, sinNombre }).toEqual({
    pantalla: name,
    sinNombre: [],
  })
  expect({ pantalla: name, chicos }).toEqual({ pantalla: name, chicos: [] })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRpc.mockResolvedValue({ data: [], error: null })
  ;(fetchProfile as jest.Mock).mockResolvedValue(null)
})

/**
 * Tipografía dinámica: todo texto tiene que respetar el tope de escala.
 *
 * Sin `maxFontSizeMultiplier`, el tamaño accesible más grande de iOS multiplica
 * por más de 3 y rompe cualquier layout. Con el tope, el texto crece de verdad
 * —que es el punto— pero hasta donde la pantalla lo sostiene.
 */
function sweepDynamicType(name: string) {
  // El tipo del host es un string en el árbol de test, pero el tipado de RNTL
  // lo declara como la unión de roles. Se compara sobre el string.
  const textos = screen.UNSAFE_root.findAll(
    (node) => String(node.type) === 'Text' && node.props?.children != null,
  )
  expect(textos.length).toBeGreaterThan(0)

  const sinTope = textos
    .filter((node) => node.props['maxFontSizeMultiplier'] == null)
    .map((node) => String(node.props['children']).slice(0, 40))

  expect({ pantalla: name, sinTope }).toEqual({ pantalla: name, sinTope: [] })
}

describe('barrido de accesibilidad y callejones', () => {
  it('artistas cerca, sin nadie dado de alta todavía', async () => {
    ;(fetchArtistGrid as jest.Mock).mockResolvedValue([])
    render(
      <ArtistsScreen
        categorySlug="tattoo"
        userId="u1"
        onOpenArtist={jest.fn()}
        onExplore={jest.fn()}
        onChangeLocation={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('artists-empty')).toBeTruthy(),
    )
    sweep('artistas · vacío')
    sweepDynamicType('artistas · vacío')
  })

  it('artistas cerca, con uno', async () => {
    ;(fetchArtistGrid as jest.Mock).mockResolvedValue([
      {
        professionalId: 'pro-1',
        slug: 'artista-uno',
        displayName: 'Artista Uno',
        isFixture: false,
        avatarPath: null,
        neighborhoodSlug: 'palermo',
        studioCoordinates: null,
        styleSlugs: ['fine-line'],
        pieces: [
          {
            id: 'p1',
            mediaPath: 'a/lg.jpg',
            width: 800,
            height: 1000,
            blurhash: null,
          },
        ],
      },
    ])
    render(
      <ArtistsScreen
        categorySlug="tattoo"
        userId="u1"
        onOpenArtist={jest.fn()}
        onExplore={jest.fn()}
        onChangeLocation={jest.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('artists-list')).toBeTruthy())
    sweep('artistas · con uno')
    sweepDynamicType('artistas · con uno')
  })

  it('explorar, con obra', async () => {
    ;(fetchDiscoveryFeed as jest.Mock).mockResolvedValue({
      items: [
        {
          cursor: 'a',
          portfolioItemId: 'a',
          professionalId: 'pro-a',
          professionalSlug: 'artista-a',
          professionalName: 'Artista Uno',
          isFixture: false,
          caption: null,
          year: null,
          mediaBucket: 'portfolio',
          mediaPath: 'a/lg.jpg',
          mediaWidth: 800,
          mediaHeight: 1000,
          blurhash: null,
          styles: [{ slug: 'fine-line', weight: 1 }],
        },
      ],
      nextCursor: null,
    })
    render(
      <ExploreScreen
        categorySlug="tattoo"
        userId="u1"
        onOpenArtist={jest.fn()}
        onSearchByPhotos={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('discovery-grid')).toBeTruthy(),
    )
    sweep('explorar · con obra')
    sweepDynamicType('explorar · con obra')
  })

  it('perfil, no encontrado', async () => {
    render(
      <ProfileScreen
        slug="x"
        today={HOY}
        onBack={jest.fn()}
        onContact={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('profile-not-found')).toBeTruthy(),
    )
    // El caso más fácil de dejar como callejón: no hay nada que reintentar, así
    // que si no hubiera "volver" la pantalla sería una pared.
    sweep('perfil · no encontrado')
  })

  it('contacto, sin canal', async () => {
    ;(fetchProfile as jest.Mock).mockResolvedValue({
      professional: {
        id: 'p1',
        slug: 'x',
        categorySlug: 'tattoo',
        displayName: 'X',
        bio: null,
        location: null,
        travels: false,
        styles: [],
        price: null,
        availability: null,
        instagramHandle: null,
        whatsappE164: null,
        // NO es fixture a propósito: un fixture se corta antes de llegar acá
        // (content-policy §4.4), así que este caso nunca se alcanzaría.
        isFixture: false,
      },
      pieces: [],
    })
    render(<ContactScreen slug="x" onBack={jest.fn()} />)
    await waitFor(() =>
      expect(screen.getByTestId('contact-no-channel')).toBeTruthy(),
    )
    sweep('contacto · sin canal')
  })

  it('contacto, registro ficticio', async () => {
    ;(fetchProfile as jest.Mock).mockResolvedValue({
      professional: {
        id: 'p1',
        slug: 'fixture-x',
        categorySlug: 'tattoo',
        displayName: 'Tinta Negra',
        bio: null,
        location: null,
        travels: false,
        styles: [],
        price: null,
        availability: null,
        instagramHandle: 'x',
        whatsappE164: '+5491100000001',
        isFixture: true,
      },
      pieces: [],
    })
    render(<ContactScreen slug="fixture-x" onBack={jest.fn()} />)
    await waitFor(() =>
      expect(screen.getByTestId('contact-fixture-blocked')).toBeTruthy(),
    )
    sweep('contacto · ficticio')
  })

  it('formulario de proyecto', () => {
    render(<ProjectFormScreen onSubmit={jest.fn()} onCancel={jest.fn()} />)
    sweep('proyecto · formulario')
    sweepDynamicType('proyecto · formulario')
  })

  it('la pregunta de onboarding', () => {
    render(<IntentScreen busy={false} onChoose={jest.fn()} />)
    sweep('onboarding · intención')
    sweepDynamicType('onboarding · intención')
  })

  it('perfil, sin cuenta todavía', async () => {
    render(
      <AccountScreen
        userId="u1"
        onOpenStudio={jest.fn()}
        onOpenSaved={jest.fn()}
        isAnonymous
        email={null}
        onCreateAccount={jest.fn()}
        onSignIn={jest.fn()}
        onSignOut={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('account-content')).toBeTruthy(),
    )
    // La puerta a crear cuenta tiene que estar acá: es la única que hay.
    expect(screen.getByTestId('account-sign-up')).toBeTruthy()
    sweep('perfil · sin cuenta')
    sweepDynamicType('perfil · sin cuenta')
  })

  it('perfil, con cuenta', async () => {
    render(
      <AccountScreen
        userId="u1"
        onOpenStudio={jest.fn()}
        onOpenSaved={jest.fn()}
        isAnonymous={false}
        email="vos@ejemplo.com"
        onCreateAccount={jest.fn()}
        onSignIn={jest.fn()}
        onSignOut={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('account-content')).toBeTruthy(),
    )
    sweep('perfil · con cuenta')
    sweepDynamicType('perfil · con cuenta')
  })

  it('chat, vacío', async () => {
    render(
      <ChatScreen
        conversationId="c1"
        userId="u1"
        title="Aguja Fina"
        onBack={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('chat-messages')).toBeTruthy(),
    )
    sweep('chat · vacío')
    sweepDynamicType('chat · vacío')
  })

  // El chat del artista es otra pantalla: aparece el botón de dar un turno, y
  // aparece el turno ya dado. Las dos cosas son texto nuevo que tiene que
  // sobrevivir al tamaño de tipografía más grande.
  it('chat del artista, con un turno dado', async () => {
    ;(fetchOwnProfessionalForConversation as jest.Mock).mockResolvedValue('p1')
    ;(fetchAppointments as jest.Mock).mockResolvedValue([
      {
        id: 'a1',
        startsAt: '2026-09-01T17:00:00Z',
        endsAt: '2026-09-01T19:00:00Z',
        status: 'scheduled',
        note: 'Fine line en el antebrazo',
        professionalId: 'p1',
        conversationId: 'c1',
      },
    ])
    render(
      <ChatScreen
        conversationId="c1"
        userId="u1"
        title="Aguja Fina"
        onBack={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('appointment-a1')).toBeTruthy(),
    )
    // Que el botón esté es la mitad del caso: sin él, esta pantalla sería la
    // del cliente y el barrido no cubriría nada nuevo.
    expect(screen.getByTestId('schedule-open')).toBeTruthy()
    sweep('chat del artista · con turno')
    sweepDynamicType('chat del artista · con turno')
  })

  // La pantalla de dejar una reseña vive dentro del turno pasado, así que el
  // barrido la alcanza desde el chat: estrellas tocables, campo de comentario y
  // el aviso de que la foto se publica.
  it('chat, con un turno pasado listo para reseñar', async () => {
    const hace = new Date()
    hace.setDate(hace.getDate() - 5)
    const desde = new Date(hace)
    desde.setHours(desde.getHours() - 2)
    ;(fetchAppointments as jest.Mock).mockResolvedValue([
      {
        id: 'a9',
        startsAt: desde.toISOString(),
        endsAt: hace.toISOString(),
        status: 'scheduled',
        note: null,
        professionalId: 'p1',
        conversationId: 'c1',
      },
    ])
    ;(fetchReviewableAppointments as jest.Mock).mockResolvedValue([
      {
        appointmentId: 'a9',
        professionalId: 'p1',
        professionalSlug: 'aguja-fina',
        professionalName: 'Aguja Fina',
        conversationId: 'c1',
        endsAt: hace.toISOString(),
      },
    ])

    render(
      <ChatScreen
        conversationId="c1"
        userId="u1"
        title="Aguja Fina"
        onBack={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('appointment-review')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('appointment-review'))
    expect(screen.getByTestId('leave-review')).toBeTruthy()

    sweep('chat · dejar reseña')
    sweepDynamicType('chat · dejar reseña')
  })

  it('el estudio, sin perfil todavía', async () => {
    ;(fetchOwnedProfessional as jest.Mock).mockResolvedValue(null)
    render(<StudioScreen userId="u1" onBack={jest.fn()} />)
    await waitFor(() =>
      expect(screen.getByTestId('studio-create')).toBeTruthy(),
    )
    sweep('estudio · sin perfil')
    sweepDynamicType('estudio · sin perfil')
  })

  it('el estudio, con perfil propio y sin piezas', async () => {
    ;(fetchOwnedProfessional as jest.Mock).mockResolvedValue({
      id: 'p1',
      slug: 'pablo-esteban',
      displayName: 'Pablo Esteban',
      isPublished: true,
      studioCoordinates: null,
      styleSlugs: [],
    })
    render(<StudioScreen userId="u1" onBack={jest.fn()} />)
    await waitFor(() =>
      expect(screen.getByTestId('studio-content')).toBeTruthy(),
    )
    sweep('estudio · con perfil')
    sweepDynamicType('estudio · con perfil')
  })

  it('el estudio, con el horario ya cargado', async () => {
    ;(fetchOwnedProfessional as jest.Mock).mockResolvedValue({
      id: 'p1',
      slug: 'pablo-esteban',
      displayName: 'Pablo Esteban',
      isPublished: true,
      studioCoordinates: null,
      styleSlugs: [],
    })
    ;(fetchWeeklyRules as jest.Mock).mockResolvedValue([
      { id: 'r1', weekday: 1, startsAt: '14:00', endsAt: '20:00' },
    ])
    render(<StudioScreen userId="u1" onBack={jest.fn()} />)
    await waitFor(() =>
      expect(screen.getByTestId('availability-rule-r1')).toBeTruthy(),
    )
    sweep('estudio · con horario')
    sweepDynamicType('estudio · con horario')
  })

  it('el mazo del artista, sin perfil todavía', async () => {
    render(
      <SearchDeckScreen
        categorySlug="tattoo"
        professionalId={null}
        onOpenStudio={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('demand-no-profile')).toBeTruthy(),
    )
    sweep('mazo del artista · sin perfil')
    sweepDynamicType('mazo del artista · sin perfil')
  })

  it('el mazo del artista, con una búsqueda', async () => {
    ;(fetchOpenSearchFeed as jest.Mock).mockResolvedValue({
      items: [
        {
          projectId: 'proj-1',
          title: 'Algo de línea fina',
          description: null,
          locationSlug: 'palermo',
          budgetMinCents: null,
          budgetMaxCents: null,
          budgetCurrency: null,
          timing: null,
          sizeNote: null,
          createdAt: '2026-08-18T12:00:00Z',
          styleSlugs: ['fine-line'],
          referenceUrls: [],
        },
      ],
      nextCursor: null,
    })
    render(
      <SearchDeckScreen
        categorySlug="tattoo"
        professionalId="pro-1"
        onOpenStudio={jest.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('demand-card-top')).toBeTruthy(),
    )
    sweep('mazo del artista · con búsqueda')
    sweepDynamicType('mazo del artista · con búsqueda')
  })

  it('los chats del artista, vacíos', async () => {
    render(
      <ChatsScreen
        intent="offering"
        onOpenChat={jest.fn()}
        onOpenHome={jest.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('chats-empty')).toBeTruthy())
    sweep('chats del artista · vacío')
    sweepDynamicType('chats del artista · vacío')
  })

  it('los chats de quien busca, vacíos', async () => {
    render(
      <ChatsScreen
        intent="looking"
        onOpenChat={jest.fn()}
        onOpenHome={jest.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('chats-empty')).toBeTruthy())
    sweep('chats de quien busca · vacío')
    sweepDynamicType('chats de quien busca · vacío')
  })

  it('buscar por fotos', () => {
    render(
      <QuickSearchScreen
        userId="u1"
        onCreated={jest.fn()}
        onCancel={jest.fn()}
      />,
    )
    sweep('buscar por fotos')
    sweepDynamicType('buscar por fotos')
  })

  it('crear cuenta, con Google arriba del correo', () => {
    // El botón de Google entra al barrido como cualquier otro: si algún día se
    // dibuja con el logo y sin texto, "sin nombre accesible" lo agarra acá y no
    // en la tienda.
    render(
      <AuthForm
        titleKey="auth.signUp.title"
        bodyKey="auth.signUp.body"
        submitKey="auth.signUp.submit"
        onSubmit={jest.fn().mockResolvedValue({ ok: true })}
        onGoogle={jest.fn().mockResolvedValue('ok')}
        onDone={jest.fn()}
        links={[{ key: 'auth.signUp.toSignIn', onPress: jest.fn() }]}
      />,
    )
    sweep('crear cuenta')
    sweepDynamicType('crear cuenta')
  })

  it('guardados, sin nada guardado todavía', async () => {
    render(
      <SavedScreen
        userId="u1"
        onOpenArtist={jest.fn()}
        onExplore={jest.fn()}
        onBack={jest.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('saved-empty')).toBeTruthy())
    sweep('guardados · vacío')
    sweepDynamicType('guardados · vacío')
  })

  it('contraseña nueva, después del enlace del correo', () => {
    render(
      <NewPasswordScreen
        onSubmit={jest.fn().mockResolvedValue({ ok: true })}
        onDone={jest.fn()}
      />,
    )
    sweep('contraseña nueva')
    sweepDynamicType('contraseña nueva')
  })
})
