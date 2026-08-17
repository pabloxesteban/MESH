import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import {
  MotionProvider,
  ThemeProvider,
  useTheme,
} from '@/design-system/index.ts'

/**
 * Layout raíz.
 *
 * Las tipografías viajan en el bundle y se registran acá con las mismas claves
 * que usa `tokens/typography.ts`. Si no coinciden, el sistema cae al tipo por
 * defecto y nadie se entera — por eso las claves están en un solo lugar.
 *
 * El arranque de sesión anónima llega en la Fase 6.
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
        <StatusBar style="auto" />
        {/* Sin pantalla de carga con spinner: el fondo del tema pintado
            mientras cargan las tipografías es menos ruidoso que un indicador
            que aparece y desaparece en 200ms. */}
        {fontsLoaded ? <Navigator /> : <ThemedBackdrop />}
      </MotionProvider>
    </ThemeProvider>
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

function ThemedBackdrop() {
  const theme = useTheme()
  return <View style={{ flex: 1, backgroundColor: theme.surface }} />
}
