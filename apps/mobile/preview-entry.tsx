import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { registerRootComponent } from 'expo'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import {
  Box,
  MotionProvider,
  Text,
  ThemeProvider,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { AccountScreen } from '@/features/account/AccountScreen.tsx'
import { AvatarPickerScreen } from '@/features/account/AvatarPickerScreen.tsx'
import { ConfiguracionScreen } from '@/features/account/ConfiguracionScreen.tsx'
import { resolveLocationId, updateAccount } from '@/features/account/queries.ts'
import { AuthForm } from '@/features/auth/AuthForm.tsx'
import { NewPasswordScreen } from '@/features/auth/NewPasswordScreen.tsx'
import {
  ALL_COLLECTION_ID,
  CollectionsScreen,
} from '@/features/collections/CollectionsScreen.tsx'
import { CollectionDetailScreen } from '@/features/collections/CollectionDetailScreen.tsx'
import { NewCollectionScreen } from '@/features/collections/NewCollectionScreen.tsx'
import { ArtistsScreen } from '@/features/artists/ArtistsScreen.tsx'
import { useOnboardingIntent } from '@/features/account/useIntent.ts'
import { fetchOwnedProfessional } from '@/features/artist/queries.ts'
import { StudioScreen } from '@/features/artist/StudioScreen.tsx'
import { ChatScreen } from '@/features/chat/ChatScreen.tsx'
import { ChatsScreen } from '@/features/chat/ChatsScreen.tsx'
import { SearchDeckScreen } from '@/features/demand/SearchDeckScreen.tsx'
import { useOpenChat } from '@/features/chat/useOpenChat.ts'
import { OnboardingGate } from '@/features/onboarding/OnboardingGate.tsx'
import { ContactScreen } from '@/features/contact/ContactScreen.tsx'
import { ExploreScreen } from '@/features/discovery/ExploreScreen.tsx'
import { QuickSearchScreen } from '@/features/quick-search/QuickSearchScreen.tsx'
import { AssistantScreen } from '@/features/assistant/AssistantScreen.tsx'
import { ProfileScreen } from '@/features/profile/ProfileScreen.tsx'
import { SearchLocationScreen } from '@/features/location/SearchLocationScreen.tsx'
import { useDeviceLocation } from '@/features/location/useDeviceLocation.ts'
import { useSearchLocation } from '@/features/location/useSearchLocation.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import DesignSystemGallery from './app/galeria.tsx'
import { PlaygroundHome } from '@/playground/PlaygroundHome.tsx'

/**
 * Punto de entrada del preview web.
 *
 * Monta **las pantallas reales de la app** sobre un catálogo horneado. Metro
 * intercambia los `queries.ts` de cada feature por su `queries.preview.ts`
 * cuando MESH_PREVIEW=1, así que no hay red, no hay Supabase y no hay sesión —
 * y sin embargo el mazo, el motor de gusto, el ranking y las razones son los
 * mismos que corren en el teléfono. Ver `preview/store.ts`.
 *
 * Sin expo-router a propósito: el router resuelve la ruta desde
 * `window.location.pathname`, y un preview publicado no se sirve en `/`, así
 * que con el router puesto toda URL cae en "Unmatched Route". La navegación
 * entre pestañas de acá es un `useState`, que es todo lo que un preview
 * necesita.
 *
 * **Lo que este preview NO prueba, y no hay que leerle:** hápticos, gestos
 * nativos, performance real, offline, RLS y paginación contra la base. Es una
 * herramienta para mirar diseño y flujo en una pantalla de teléfono de verdad,
 * no un sustituto de Expo Go.
 *
 * Se verifica en un navegador headless antes de publicarse: una vez salió
 * completamente negro y se entregó igual porque el archivo pesaba lo esperado.
 * El tamaño no dice nada sobre si se ve algo.
 */

const HOY = '2026-08-18'
const USUARIO = 'preview-user'

type Pestana =
  'inicio' | 'explorar' | 'estudio' | 'para-vos' | 'perfil' | 'galeria' | 'lab'

/**
 * Las cuatro pestañas de la app, más una que no existe en el teléfono.
 *
 * No son las mismas cuatro para todos: dependen de a qué vino la persona,
 * igual que en `app/(tabs)/_layout.tsx`. Ver ADR-014. Si esto y aquello se
 * separan, el preview deja de mostrar la app que existe.
 *
 * **Por defecto son exactamente las cuatro de la app**, y eso importa: un
 * preview con seis pestañas no muestra la app, muestra otra cosa. La barra es
 * lo primero que se lee de un producto, y "cuatro y ninguna más" es una
 * decisión de MESH — con seis pasa a ser un menú que hay que estudiar en vez de
 * un lugar donde la mano ya sabe ir.
 *
 * Diseño y Lab son **herramientas**, no producto: la galería del design system
 * y el playground de direcciones visuales. Sirven para mirar tokens,
 * componentes y prototipos en una pantalla de teléfono real, que es la única
 * forma honesta de compararlos. Viven acá y no en la app, y desde ahora
 * aparecen solo si se pide:
 *
 *     EXPO_PUBLIC_PREVIEW_DEV=1 npm run web:preview
 *
 * Se decide al construir y no con un parámetro en la URL a propósito: el
 * preview publicado se sirve dentro de un iframe, donde la query string de
 * afuera no llega, así que un `?dev=1` andaría en el archivo suelto y no en el
 * enlace — que es justo donde se mira.
 */
const DEV = process.env['EXPO_PUBLIC_PREVIEW_DEV'] === '1'

function pestanasPara(ofrece: boolean): ReadonlyArray<{
  id: Pestana
  label: string
}> {
  return [
    { id: 'inicio', label: 'Inicio' },
    ofrece
      ? { id: 'estudio' as const, label: 'Estudio' }
      : { id: 'explorar' as const, label: 'Explorar' },
    { id: 'para-vos', label: 'Chats' },
    { id: 'perfil', label: 'Perfil' },
    ...(DEV
      ? ([
          { id: 'galeria' as const, label: 'Diseño' },
          { id: 'lab' as const, label: 'Lab' },
        ] as const)
      : []),
  ]
}

function PreviewRoot() {
  const [fontsLoaded] = useFonts({
    /* eslint-disable @typescript-eslint/no-require-imports */
    'Fraunces-Regular': require('./assets/fonts/Fraunces-Regular.ttf'),
    'InstrumentSans-Regular': require('./assets/fonts/InstrumentSans-Regular.ttf'),
    'InstrumentSans-Medium': require('./assets/fonts/InstrumentSans-Medium.ttf'),
    // ADR-031. Lista separada de la de `app/_layout.tsx` porque este entry no
    // pasa por ahí — un corte que se agregue a uno y no al otro queda medio
    // cargado en el preview sin que ningún tipo lo marque.
    'Fraunces-SemiBold': require('./assets/fonts/Fraunces-SemiBold.ttf'),
    'InstrumentSans-Bold': require('./assets/fonts/InstrumentSans-Bold.ttf'),
    /* eslint-enable @typescript-eslint/no-require-imports */
  })

  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      }),
  )

  return (
    <SafeAreaProvider>
      {/* Sin `initialPreference`: el default es `'system'`, así que el preview
          sigue el modo claro/oscuro del teléfono — igual que la app.

          Antes había un botón de tema al final de la barra. Se sacó: al lado de
          cuatro pestañas se leía como una quinta, y no hacía falta. Para mirar
          el otro tema se cambia el del sistema, que además es la única forma en
          que alguien lo va a vivir de verdad. */}
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider>
            <QueryClientProvider client={client}>
              <StatusBar style="auto" />
              {fontsLoaded ? <GatedShell /> : <ThemedBackdrop />}
            </QueryClientProvider>
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

/**
 * La pregunta de onboarding envuelve todo, igual que en la app real.
 *
 * Elegir "ofrezco" abre el estudio; "busco" deja pasar al mazo. Es el mismo
 * componente que corre en el teléfono, sobre el perfil en memoria de
 * `preview/store.ts`.
 */
function GatedShell() {
  const [estudioDirecto, setEstudioDirecto] = useState(false)
  return (
    <OnboardingGate onOffering={() => setEstudioDirecto(true)}>
      <Shell abrirEstudio={estudioDirecto} />
    </OnboardingGate>
  )
}

function Shell({ abrirEstudio }: { abrirEstudio: boolean }) {
  const theme = useTheme()
  const intent = useOnboardingIntent()
  const ofrece = intent === 'offering'
  const pestanas = pestanasPara(ofrece)
  const [pestana, setPestana] = useState<Pestana>(
    abrirEstudio ? 'estudio' : 'inicio',
  )

  // El perfil de artista propio, para el mazo de búsquedas. Misma clave que
  // usa el estudio, así que crear el perfil ahí lo actualiza acá.
  const propio = useQuery({
    queryKey: ['studio', 'professional', USUARIO],
    queryFn: () => fetchOwnedProfessional(USUARIO),
    enabled: ofrece,
  })

  // Cambiar de intención desde Perfil puede dejar seleccionada una pestaña que
  // ya no existe. Se vuelve a Inicio, que existe en las dos apps.
  const actual = pestanas.some((tab) => tab.id === pestana) ? pestana : 'inicio'
  const [perfil, setPerfil] = useState<string | null>(null)
  const [eligiendoUbicacion, setEligiendoUbicacion] = useState(false)
  const searchLocation = useSearchLocation()
  const device = useDeviceLocation()
  const [contacto, setContacto] = useState<string | null>(null)
  const [estudio, setEstudio] = useState(abrirEstudio)
  const [chat, setChat] = useState<{ id: string; titulo: string } | null>(null)
  const abrirChat = useOpenChat(USUARIO, (id, titulo) =>
    setChat({ id, titulo }),
  )
  // Resultado de "buscar por fotos": un ProjectBriefInput armado a partir del
  // proyecto liviano que creó QuickSearchScreen. `null` mientras se busca o
  // mientras no hay ninguna búsqueda activa.
  // "Buscar con una foto" dejó de ser pestaña: se abre desde Explorar y
  // termina en Explorar, filtrado por el estilo que detectó la IA.
  const [buscando, setBuscando] = useState(false)
  // El asistente de ADR-021. En el preview el guion es fijo y sin modelo: tres
  // preguntas y cierra con un pedido que tiene un hueco a propósito.
  const [contando, setContando] = useState(false)
  // Crear cuenta y entrar son rutas en la app; acá son una sobrecapa, que es
  // todo lo que hace falta para MIRARLAS.
  const [cuenta, setCuenta] = useState<
    'crear' | 'entrar' | 'contrasena-nueva' | null
  >(null)
  const [estiloBuscado, setEstiloBuscado] = useState<string | null>(null)

  // Guardados → Colecciones (ADR-030): tres pantallas propias, en vez del
  // único booleano que bastaba para `SavedScreen`.
  type ColeccionesRuta =
    | { screen: 'list' }
    | { screen: 'detail'; id: string; addTo?: string }
    | { screen: 'new' }
  const [colecciones, setColecciones] = useState<ColeccionesRuta | null>(null)
  const [configuracion, setConfiguracion] = useState(false)
  const [fotoPerfil, setFotoPerfil] = useState(false)
  const [ubicacionPerfil, setUbicacionPerfil] = useState(false)

  const contenido = (() => {
    if (colecciones?.screen === 'new') {
      return (
        <NewCollectionScreen
          userId={USUARIO}
          onCancel={() => setColecciones({ screen: 'list' })}
          onCreated={(id) => setColecciones({ screen: 'detail', id })}
        />
      )
    }
    if (colecciones?.screen === 'detail') {
      return (
        <CollectionDetailScreen
          userId={USUARIO}
          collectionId={colecciones.id}
          addToCollectionId={colecciones.addTo ?? null}
          onBack={() =>
            setColecciones(
              colecciones.addTo != null
                ? { screen: 'detail', id: colecciones.addTo }
                : { screen: 'list' },
            )
          }
          onOpenArtist={(slug) => {
            setColecciones(null)
            setPerfil(slug)
          }}
          onExplore={() => {
            setColecciones(null)
            setPestana('explorar')
          }}
          onAddFromSaved={() =>
            setColecciones({
              screen: 'detail',
              id: ALL_COLLECTION_ID,
              addTo: colecciones.id,
            })
          }
          onDeleted={() => setColecciones({ screen: 'list' })}
        />
      )
    }
    if (colecciones?.screen === 'list') {
      return (
        <CollectionsScreen
          onBack={() => setColecciones(null)}
          onOpenCollection={(id) => setColecciones({ screen: 'detail', id })}
          onNewCollection={() => setColecciones({ screen: 'new' })}
          onExplore={() => {
            setColecciones(null)
            setPestana('explorar')
          }}
        />
      )
    }
    if (fotoPerfil) {
      return (
        <AvatarPickerScreen
          userId={USUARIO}
          onBack={() => setFotoPerfil(false)}
          onDone={() => setFotoPerfil(false)}
        />
      )
    }
    if (ubicacionPerfil) {
      // Mismo componente que `/perfil/ubicacion` en la app real, sin el
      // store de Zustand: acá no hace falta devolver el valor a través de
      // una ruta empujada, es la misma función de cierre.
      return (
        <SearchLocationScreen
          value={searchLocation.value}
          onChange={(next) => {
            void (async () => {
              if (next.mode === 'none') {
                await updateAccount({ cityLocationId: null })
                return
              }
              if (next.mode === 'neighborhood' && next.neighborhoodSlug != null) {
                const id = await resolveLocationId(next.neighborhoodSlug)
                await updateAccount({ cityLocationId: id })
              }
            })()
          }}
          onClose={() => setUbicacionPerfil(false)}
          deviceStatus={device.status}
          onRequestDevice={device.request}
        />
      )
    }
    if (configuracion) {
      return (
        <ConfiguracionScreen
          userId={USUARIO}
          isAnonymous
          email={null}
          onCreateAccount={() => setCuenta('crear')}
          onSignIn={() => setCuenta('entrar')}
          onSignOut={() => undefined}
          onDeleted={() => {
            setConfiguracion(false)
            setPestana('inicio')
          }}
          onBack={() => setConfiguracion(false)}
        />
      )
    }
    if (cuenta === 'contrasena-nueva') {
      // A esta pantalla se llega desde el correo, no desde un botón. Acá está
      // colgada de "olvidé mi contraseña" para poder mirarla.
      return (
        <ScrollView>
          <NewPasswordScreen
            onSubmit={async () => ({ ok: true }) as const}
            onDone={() => setCuenta(null)}
          />
        </ScrollView>
      )
    }
    if (cuenta != null) {
      // Sin red: el formulario es real, lo que hay detrás no. Alcanza para
      // mirar el orden —Google arriba, correo abajo— y el peso de cada cosa.
      return (
        <ScrollView>
          <AuthForm
            titleKey={
              cuenta === 'crear' ? 'auth.signUp.title' : 'auth.signIn.title'
            }
            {...(cuenta === 'crear'
              ? { bodyKey: 'auth.signUp.body' as const }
              : {})}
            submitKey={
              cuenta === 'crear' ? 'auth.signUp.submit' : 'auth.signIn.submit'
            }
            onSubmit={async () => ({ ok: true }) as const}
            onGoogle={async () => 'ok' as const}
            onDone={() => setCuenta(null)}
            links={[
              {
                key:
                  cuenta === 'crear'
                    ? 'auth.signUp.toSignIn'
                    : 'auth.signIn.toSignUp',
                onPress: () =>
                  setCuenta(cuenta === 'crear' ? 'entrar' : 'crear'),
              },
              ...(cuenta === 'entrar'
                ? [
                    {
                      key: 'auth.signIn.forgot' as const,
                      onPress: () => setCuenta('contrasena-nueva'),
                    },
                  ]
                : []),
            ]}
          />
        </ScrollView>
      )
    }
    if (chat != null) {
      return (
        <ChatScreen
          conversationId={chat.id}
          userId={USUARIO}
          title={chat.titulo}
          onBack={() => setChat(null)}
        />
      )
    }
    if (estudio) {
      return (
        <StudioScreen
          userId={USUARIO}
          onBack={() => setEstudio(false)}
          // Desde un turno de la agenda al chat del que salió.
          onOpenChat={(id, quien) => setChat({ id, titulo: quien ?? '' })}
        />
      )
    }
    if (eligiendoUbicacion) {
      return (
        <SearchLocationScreen
          value={searchLocation.value}
          onChange={searchLocation.set}
          onClose={() => setEligiendoUbicacion(false)}
          deviceStatus={device.status}
          onRequestDevice={device.request}
        />
      )
    }
    if (contacto != null) {
      return <ContactScreen slug={contacto} onBack={() => setContacto(null)} />
    }
    if (contando) {
      return (
        <AssistantScreen
          userId={USUARIO}
          onBack={() => setContando(false)}
          onPublished={() => {
            setContando(false)
            setPestana('para-vos')
          }}
        />
      )
    }
    if (buscando) {
      return (
        <QuickSearchScreen
          userId={USUARIO}
          onCreated={(_projectId, styleSlug) => {
            setEstiloBuscado(styleSlug)
            setBuscando(false)
            setPestana('explorar')
          }}
          onCancel={() => setBuscando(false)}
        />
      )
    }
    if (perfil != null) {
      return (
        <ProfileScreen
          slug={perfil}
          today={HOY}
          onBack={() => setPerfil(null)}
          onContact={(slug) => setContacto(slug)}
          onChat={abrirChat.open}
          userId={USUARIO}
        />
      )
    }
    switch (actual) {
      case 'inicio':
        // La app entera cambia según a qué vino la persona: quien ofrece ve
        // búsquedas de gente, no obra de otros tatuadores.
        return ofrece ? (
          <SearchDeckScreen
            categorySlug="tattoo"
            professionalId={propio.data?.id ?? null}
            onOpenStudio={() => setPestana('estudio')}
          />
        ) : (
          <ArtistsScreen
            categorySlug="tattoo"
            userId={USUARIO}
            onOpenArtist={(slug) => setPerfil(slug)}
            onExplore={() => setPestana('explorar')}
            onChangeLocation={() => setEligiendoUbicacion(true)}
          />
        )
      case 'explorar':
        return (
          <ExploreScreen
            categorySlug="tattoo"
            userId={USUARIO}
            onOpenArtist={(slug) => setPerfil(slug)}
            onSearchByPhotos={() => setBuscando(true)}
            onSearchByWords={() => setContando(true)}
            {...(estiloBuscado != null ? { initialStyle: estiloBuscado } : {})}
          />
        )
      case 'estudio':
        return (
          <StudioScreen
            userId={USUARIO}
            onBack={() => setPestana('inicio')}
            // Desde un turno de la agenda al chat del que salió.
            onOpenChat={(id, quien) => setChat({ id, titulo: quien ?? '' })}
          />
        )
      case 'perfil':
        return (
          <AccountScreen
            userId={USUARIO}
            // Anónimo a propósito: es el estado en el que se ve el bloque de
            // cuenta anónima en el header, que es lo que hay que poder mirar.
            isAnonymous
            onOpenStudio={() => setEstudio(true)}
            onOpenColecciones={() => setColecciones({ screen: 'list' })}
            onOpenConfiguracion={() => setConfiguracion(true)}
            onOpenAvatarPicker={() => setFotoPerfil(true)}
            onOpenLocationEditor={() => setUbicacionPerfil(true)}
            onOpenArtist={(slug) => setPerfil(slug)}
          />
        )
      case 'para-vos':
        return (
          <ChatsScreen
            intent={intent}
            onOpenChat={(id, titulo) => setChat({ id, titulo })}
            // Quién se interesó en tu búsqueda es del lado de quien busca.
            {...(ofrece
              ? {}
              : { onOpenArtist: (slug: string) => setPerfil(slug) })}
            onOpenHome={() => setPestana('inicio')}
          />
        )

      case 'galeria':
        return (
          <ScrollView>
            <DesignSystemGallery />
          </ScrollView>
        )
      case 'lab':
        return <PlaygroundHome />
    }
  })()

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <View style={{ flex: 1 }}>{contenido}</View>
      <TabBar
        pestanas={pestanas}
        actual={actual}
        onCambiar={(id) => {
          setPerfil(null)
          setContacto(null)
          setBuscando(false)
          setChat(null)
          setEstudio(false)
          setCuenta(null)
          setColecciones(null)
          setConfiguracion(false)
          setFotoPerfil(false)
          setUbicacionPerfil(false)
          setPestana(id)
        }}
      />
    </View>
  )
}

function TabBar({
  pestanas,
  actual,
  onCambiar,
}: {
  pestanas: ReadonlyArray<{ id: Pestana; label: string }>
  actual: Pestana
  onCambiar: (id: Pestana) => void
}) {
  return (
    <Box
      direction="row"
      align="center"
      background="surfaceRaised"
      padding="xs"
      gap="xxs"
    >
      {pestanas.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => onCambiar(tab.id)}
          accessibilityRole="tab"
          accessibilityState={{ selected: actual === tab.id }}
          accessibilityLabel={tab.label}
          // 44pt de alto mínimo, igual que en la app. Un preview con botones
          // chiquitos miente sobre lo que se siente tocar la app.
          style={{
            flex: 1,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: spacing.xxs,
          }}
        >
          <Text
            role="micro"
            color={actual === tab.id ? 'textPrimary' : 'textTertiary'}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </Box>
  )
}

function ThemedBackdrop() {
  const theme = useTheme()
  return <View style={{ flex: 1, backgroundColor: theme.surface }} />
}

registerRootComponent(PreviewRoot)
