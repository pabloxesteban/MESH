import { registerRootComponent } from 'expo'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import {
  MotionProvider,
  ThemeProvider,
  useTheme,
} from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'
import DesignSystemGallery from './app/galeria.tsx'

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
 * **Monta la galería, no el inicio de la app.** `app/index.tsx` es el mazo, y
 * el mazo necesita sesión, cliente de queries y una base alcanzable — nada de
 * eso existe en un HTML suelto. Cuando la galería se mudó de `app/index.tsx` a
 * `app/galeria.tsx`, este import quedó apuntando al mazo y el preview salió
 * completamente negro: el error de "falta SessionProvider" se tragó el render
 * entero. Por eso `build-web-preview.mjs` ahora ABRE el resultado en un
 * navegador headless antes de dar el archivo por bueno.
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
        <I18nProvider>
          <StatusBar style="auto" />
          {fontsLoaded ? <DesignSystemGallery /> : <ThemedBackdrop />}
        </I18nProvider>
      </MotionProvider>
    </ThemeProvider>
  )
}

function ThemedBackdrop() {
  const theme = useTheme()
  return <View style={{ flex: 1, backgroundColor: theme.surface }} />
}

registerRootComponent(PreviewRoot)
