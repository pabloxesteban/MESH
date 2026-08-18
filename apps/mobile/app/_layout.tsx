import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'

import {
  MotionProvider,
  ThemeProvider,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import {
  SessionProvider,
  useSession,
} from '@/features/auth/SessionProvider.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

/**
 * Layout raíz.
 *
 * Las tipografías viajan en el bundle y se registran acá con las mismas claves
 * que usa `tokens/typography.ts`. Si no coinciden, el sistema cae al tipo por
 * defecto y nadie se entera — por eso las claves están en un solo lugar.
 *
 * El orden de los proveedores importa: `I18nProvider` envuelve a
 * `SessionProvider` porque el error de arranque de sesión ya necesita estar
 * traducido.
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // require() y no import: es como Metro resuelve assets binarios. Un import
    // de un .ttf no produce el módulo de asset que espera expo-font.
    /* eslint-disable @typescript-eslint/no-require-imports */
    'Fraunces-Regular': require('../assets/fonts/Fraunces-Regular.ttf'),
    'InstrumentSans-Regular': require('../assets/fonts/InstrumentSans-Regular.ttf'),
    'InstrumentSans-Medium': require('../assets/fonts/InstrumentSans-Medium.ttf'),
    /* eslint-enable @typescript-eslint/no-require-imports */
  })

  return (
    <ThemeProvider>
      <MotionProvider>
        <I18nProvider>
          <SessionProvider>
            <StatusBar style="auto" />
            {/* Sin pantalla de carga con spinner: el fondo del tema pintado
                mientras cargan las tipografías es menos ruidoso que un
                indicador que aparece y desaparece en 200ms. */}
            {fontsLoaded ? <SessionGate /> : <ThemedBackdrop />}
          </SessionProvider>
        </I18nProvider>
      </MotionProvider>
    </ThemeProvider>
  )
}

/**
 * Nada se renderiza hasta que hay sesión.
 *
 * No es una pantalla de login: es esperar a que exista `auth.uid()`. Sin él,
 * toda consulta devuelve vacío por RLS y la app mostraría estados vacíos que
 * son mentira. Ver ADR-002.
 */
function SessionGate() {
  const { isLoading, hasError, retry } = useSession()

  if (hasError) {
    return (
      <Screen>
        <ErrorView cause="offline" onRetry={retry} testID="session-error" />
      </Screen>
    )
  }

  if (isLoading) return <ThemedBackdrop />

  return <Navigator />
}

function Navigator() {
  const theme = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.surface },
      }}
    />
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>{children}</View>
  )
}

function ThemedBackdrop() {
  const theme = useTheme()
  return <View style={{ flex: 1, backgroundColor: theme.surface }} />
}
