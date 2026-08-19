import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useState } from 'react'

import {
  MotionProvider,
  ThemeProvider,
  useTheme,
} from '@/design-system/index.ts'
import { AnalyticsProvider } from '@/analytics/AnalyticsProvider.tsx'
import { ErrorView } from '@/components/ErrorView.tsx'
import {
  SessionProvider,
  useSession,
} from '@/features/auth/SessionProvider.tsx'
import { OnboardingGate } from '@/features/onboarding/OnboardingGate.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'
import { createQueryClient } from '@/data/queryClient.ts'

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

  // Se crea una sola vez. Un cliente nuevo por render tira el caché entero en
  // cada re-render del layout raíz.
  const [queryClient] = useState(createQueryClient)

  return (
    // GestureHandlerRootView tiene que envolver TODO: sin él los gestos del
    // mazo no llegan nunca, y falla en silencio.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <MotionProvider>
              <I18nProvider>
                <SessionProvider>
                  <AnalyticsProvider>
                    <StatusBar style="auto" />
                    {/* Sin pantalla de carga con spinner: el fondo del tema
                        pintado mientras cargan las tipografías es menos ruidoso
                        que un indicador que aparece y desaparece en 200ms. */}
                    {fontsLoaded ? <SessionGate /> : <ThemedBackdrop />}
                  </AnalyticsProvider>
                </SessionProvider>
              </I18nProvider>
            </MotionProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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

  // El gate va DENTRO de la sesión y FUERA del navegador: la pregunta de
  // onboarding no es una ruta, así que ningún deep link la saltea.
  return (
    <OnboardingGate onOffering={() => router.push('/estudio')}>
      <Navigator />
    </OnboardingGate>
  )
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
