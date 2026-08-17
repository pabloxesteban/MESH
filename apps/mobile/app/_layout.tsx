import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

/**
 * Layout raíz.
 *
 * En la Fase 3 se envuelve con ThemeProvider y MotionProvider, y en la Fase 6
 * con el arranque de sesión anónima. Por ahora es lo mínimo para que la app
 * levante y se pueda verificar en un dispositivo. Ver docs/product/roadmap.md.
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
