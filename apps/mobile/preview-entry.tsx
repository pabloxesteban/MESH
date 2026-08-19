import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
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
  useThemePreference,
} from '@/design-system/index.ts'
import { AccountScreen } from '@/features/account/AccountScreen.tsx'
import { useOnboardingIntent } from '@/features/account/useIntent.ts'
import { fetchOwnedProfessional } from '@/features/artist/queries.ts'
import { StudioScreen } from '@/features/artist/StudioScreen.tsx'
import { ChatScreen } from '@/features/chat/ChatScreen.tsx'
import { ChatsScreen } from '@/features/chat/ChatsScreen.tsx'
import { SearchDeckScreen } from '@/features/demand/SearchDeckScreen.tsx'
import { useOpenChat } from '@/features/chat/useOpenChat.ts'
import { OnboardingGate } from '@/features/onboarding/OnboardingGate.tsx'
import { ContactScreen } from '@/features/contact/ContactScreen.tsx'
import { DeckScreen } from '@/features/discovery/DeckScreen.tsx'
import { MatchesScreen } from '@/features/matches/MatchesScreen.tsx'
import type { ProjectBriefInput } from '@/features/matches/useMatches.ts'
import { QuickSearchScreen } from '@/features/quick-search/QuickSearchScreen.tsx'
import { fetchProject } from '@/features/projects/queries.ts'
import { ProfileScreen } from '@/features/profile/ProfileScreen.tsx'
import { TasteScreen } from '@/features/taste/TasteScreen.tsx'
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
  | 'inicio'
  | 'buscar'
  | 'estudio'
  | 'para-vos'
  | 'perfil'
  | 'galeria'
  | 'lab'

/**
 * Las cuatro pestañas de la app, más una que no existe en el teléfono.
 *
 * No son las mismas cuatro para todos: dependen de a qué vino la persona,
 * igual que en `app/(tabs)/_layout.tsx`. Ver ADR-014. Si esto y aquello se
 * separan, el preview deja de mostrar la app que existe.
 *
 * "Diseño" es la galería del design system: no es producto, es una
 * herramienta para mirar tokens y componentes en una pantalla real. Vive acá
 * y no en la app.
 */
function pestanasPara(ofrece: boolean): ReadonlyArray<{
  id: Pestana
  label: string
}> {
  return [
    { id: 'inicio', label: 'Inicio' },
    ofrece
      ? { id: 'estudio' as const, label: 'Estudio' }
      : { id: 'buscar' as const, label: 'Buscar' },
    { id: 'para-vos', label: ofrece ? 'Chats' : 'Matches' },
    { id: 'perfil', label: 'Perfil' },
    { id: 'galeria', label: 'Diseño' },
    // El playground entra al preview para poder MIRAR las direcciones
    // visuales en una pantalla de teléfono real, que es la única forma
    // honesta de compararlas. No es producto y no viaja en el bundle nativo.
    { id: 'lab', label: 'Lab' },
  ]
}

function PreviewRoot() {
  const [fontsLoaded] = useFonts({
    /* eslint-disable @typescript-eslint/no-require-imports */
    'Fraunces-Regular': require('./assets/fonts/Fraunces-Regular.ttf'),
    'InstrumentSans-Regular': require('./assets/fonts/InstrumentSans-Regular.ttf'),
    'InstrumentSans-Medium': require('./assets/fonts/InstrumentSans-Medium.ttf'),
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
    queryKey: ['studio', 'professional'],
    queryFn: fetchOwnedProfessional,
    enabled: ofrece,
  })

  // Cambiar de intención desde Perfil puede dejar seleccionada una pestaña que
  // ya no existe. Se vuelve a Inicio, que existe en las dos apps.
  const actual = pestanas.some((tab) => tab.id === pestana) ? pestana : 'inicio'
  const [perfil, setPerfil] = useState<string | null>(null)
  const [contacto, setContacto] = useState<string | null>(null)
  const [estudio, setEstudio] = useState(abrirEstudio)
  const [gusto, setGusto] = useState(false)
  const [chat, setChat] = useState<{ id: string; titulo: string } | null>(null)
  const abrirChat = useOpenChat(USUARIO, (id, titulo) =>
    setChat({ id, titulo }),
  )
  // Resultado de "buscar por fotos": un ProjectBriefInput armado a partir del
  // proyecto liviano que creó QuickSearchScreen. `null` mientras se busca o
  // mientras no hay ninguna búsqueda activa.
  const [resultadoBusqueda, setResultadoBusqueda] =
    useState<ProjectBriefInput | null>(null)

  const contenido = (() => {
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
      return <StudioScreen userId={USUARIO} onBack={() => setEstudio(false)} />
    }
    if (gusto) {
      return (
        <TasteScreen userId={USUARIO} onExplore={() => setGusto(false)} />
      )
    }
    if (contacto != null) {
      return <ContactScreen slug={contacto} onBack={() => setContacto(null)} />
    }
    if (resultadoBusqueda != null) {
      return (
        <MatchesScreen
          userId={USUARIO}
          today={HOY}
          project={resultadoBusqueda}
          onExplore={() => setResultadoBusqueda(null)}
          onOpenProfile={(slug) => setPerfil(slug)}
          onOpenChat={(id, titulo) => setChat({ id, titulo })}
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
          <DeckScreen
            categorySlug="tattoo"
            userId={USUARIO}
            onOpenProfile={(slug) => setPerfil(slug)}
          />
        )
      case 'estudio':
        return <StudioScreen userId={USUARIO} onBack={() => setPestana('inicio')} />
      case 'perfil':
        return (
          <AccountScreen
            userId={USUARIO}
            onOpenTaste={() => setGusto(true)}
            onOpenStudio={() => setEstudio(true)}
          />
        )
      case 'para-vos':
        return ofrece ? (
          <ChatsScreen
            onOpenChat={(id, titulo) => setChat({ id, titulo })}
            onOpenDeck={() => setPestana('inicio')}
          />
        ) : (
          <MatchesScreen
            userId={USUARIO}
            today={HOY}
            onExplore={() => setPestana('inicio')}
            onOpenProfile={(slug) => setPerfil(slug)}
            onOpenChat={(id, titulo) => setChat({ id, titulo })}
          />
        )
      case 'buscar':
        return (
          <QuickSearchScreen
            userId={USUARIO}
            onCreated={(projectId) => {
              void (async () => {
                const project = await fetchProject(projectId)
                if (project == null) return
                setResultadoBusqueda({
                  id: project.id,
                  styles: project.styles,
                  ...(project.locationSlug != null
                    ? { locationSlug: project.locationSlug }
                    : {}),
                })
              })()
            }}
            onCancel={() => setPestana('inicio')}
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
          setResultadoBusqueda(null)
          setChat(null)
          setEstudio(false)
          setGusto(false)
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
  const theme = useTheme()
  const { preference, setPreference } = useThemePreference()

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

      <Pressable
        onPress={() => setPreference(preference === 'light' ? 'dark' : 'light')}
        accessibilityRole="button"
        accessibilityLabel="Cambiar entre tema claro y oscuro"
        style={{
          minWidth: 44,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderLeftWidth: 1,
          borderLeftColor: theme.borderSubtle,
        }}
      >
        <Text role="micro" color="textSecondary">
          {preference === 'light' ? 'Osc' : 'Cla'}
        </Text>
      </Pressable>
    </Box>
  )
}

function ThemedBackdrop() {
  const theme = useTheme()
  return <View style={{ flex: 1, backgroundColor: theme.surface }} />
}

registerRootComponent(PreviewRoot)
