import { registerRootComponent } from 'expo'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import {
  MotionProvider,
  ThemeProvider,
  useTheme,
} from '@/design-system/index.ts'
import DesignSystemGallery from './app/index.tsx'

/**
 * Punto de entrada del preview web.
 *
 * Monta los mismos providers y la misma galería que la app, pero **sin
 * expo-router**. La razón es concreta: el router resuelve la ruta desde
 * `window.location.pathname`, y un preview publicado no se sirve en `/`, así
 * que con el router puesto toda URL cae en "Unmatched Route". Se verificó
 * abriéndolo en un navegador headless antes de publicarlo.
 *
 * Los componentes, los tokens y las tipografías son los reales. Lo que este
 * entry NO ejercita es la navegación, que es justamente lo único que le sobra a
 * una galería de un solo tramo.
 *
 * Lo usa scripts/build-web-preview.mjs, que intercambia el `main` del
 * package.json mientras dura el export y después lo restaura.
 */
function PreviewRoot() {
  const [fontsLoaded] = useFonts({
    /* eslint-disable @typescript-eslint/no-require-imports */
    'Fraunces-Regular': require('./assets/fonts/Fraunces-Regular.ttf'),
    'InstrumentSans-Regular': require('./assets/fonts/InstrumentSans-Regular.ttf'),
    'InstrumentSans-Medium': require('./assets/fonts/InstrumentSans-Medium.ttf'),
    /* eslint-enable @typescript-eslint/no-require-imports */
  })

  return (
    <ThemeProvider>
      <MotionProvider>
        <StatusBar style="auto" />
        {fontsLoaded ? <DesignSystemGallery /> : <ThemedBackdrop />}
      </MotionProvider>
    </ThemeProvider>
  )
}

function ThemedBackdrop() {
  const theme = useTheme()
  return <View style={{ flex: 1, backgroundColor: theme.surface }} />
}

registerRootComponent(PreviewRoot)
