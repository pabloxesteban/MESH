import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
import { StudioScreen } from '@/features/artist/StudioScreen.tsx'
import { ContactScreen } from '@/features/contact/ContactScreen.tsx'
import { DeckScreen } from '@/features/discovery/DeckScreen.tsx'
import { MatchesScreen } from '@/features/matches/MatchesScreen.tsx'
import { ProfileScreen } from '@/features/profile/ProfileScreen.tsx'
import { TasteScreen } from '@/features/taste/TasteScreen.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import DesignSystemGallery from './app/galeria.tsx'

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

type Pestana = 'mazo' | 'gusto' | 'encajes' | 'estudio' | 'galeria'

/**
 * Etiquetas de una palabra.
 *
 * En la app las pestañas dicen "Descubrí", "Tu gusto", "Para vos" — copy, no
 * navegación. Acá son cinco y entran en 390 px solo si son cortas: con dos
 * palabras, "Tu gusto" se partía en dos líneas y la barra crecía.
 */
const PESTANAS: ReadonlyArray<{ id: Pestana; label: string }> = [
  { id: 'mazo', label: 'Mazo' },
  { id: 'gusto', label: 'Gusto' },
  { id: 'encajes', label: 'Encajes' },
  { id: 'estudio', label: 'Estudio' },
  { id: 'galeria', label: 'Diseño' },
]

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
              {fontsLoaded ? <Shell /> : <ThemedBackdrop />}
            </QueryClientProvider>
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

function Shell() {
  const theme = useTheme()
  const [pestana, setPestana] = useState<Pestana>('mazo')
  const [perfil, setPerfil] = useState<string | null>(null)
  const [contacto, setContacto] = useState<string | null>(null)

  const contenido = (() => {
    if (contacto != null) {
      return <ContactScreen slug={contacto} onBack={() => setContacto(null)} />
    }
    if (perfil != null) {
      return (
        <ProfileScreen
          slug={perfil}
          today={HOY}
          onBack={() => setPerfil(null)}
          onContact={(slug) => setContacto(slug)}
        />
      )
    }
    switch (pestana) {
      case 'mazo':
        return (
          <DeckScreen
            categorySlug="tattoo"
            userId={USUARIO}
            onOpenProfile={(slug) => setPerfil(slug)}
          />
        )
      case 'gusto':
        return (
          <TasteScreen userId={USUARIO} onExplore={() => setPestana('mazo')} />
        )
      case 'encajes':
        return (
          <MatchesScreen
            userId={USUARIO}
            today={HOY}
            onExplore={() => setPestana('mazo')}
            onOpenProfile={(slug) => setPerfil(slug)}
          />
        )
      case 'estudio':
        // En la app de verdad esto NO es una pestaña: vive adentro de Cuenta,
        // porque de cada mil personas que usan MESH quince son artistas. Acá es
        // una pestaña para que se pueda encontrar sin explicación.
        return (
          <StudioScreen userId={USUARIO} onBack={() => setPestana('mazo')} />
        )
      case 'galeria':
        return (
          <ScrollView>
            <DesignSystemGallery />
          </ScrollView>
        )
    }
  })()

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <View style={{ flex: 1 }}>{contenido}</View>
      <TabBar
        actual={pestana}
        onCambiar={(id) => {
          setPerfil(null)
          setContacto(null)
          setPestana(id)
        }}
      />
    </View>
  )
}

function TabBar({
  actual,
  onCambiar,
}: {
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
      {PESTANAS.map((tab) => (
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
