import { router } from 'expo-router'
import { View } from 'react-native'

import { Box, Button, Text, useTheme } from '@/design-system/index.ts'
import { PlaygroundHome } from '@/playground/PlaygroundHome.tsx'

/**
 * Ruta del UX Playground.
 *
 * Existe como archivo de ruta porque Expo Router necesita uno para poder
 * navegar acá en desarrollo, pero el contenido real está detrás de un
 * `if (__DEV__)`. `__DEV__` es una constante de compilación: Metro la
 * reemplaza por `false` en un build de release y el minificador elimina la
 * rama muerta — no es una comprobación en tiempo de ejecución que alguien
 * pueda burlar, es código que directamente no está en el bundle final.
 *
 * A propósito, esta ruta no está enlazada desde ninguna pestaña ni pantalla
 * real: se llega escribiendo `/playground` durante desarrollo, nunca por un
 * botón que una persona usando la app pueda tocar por accidente.
 */
export default function PlaygroundRoute() {
  if (!__DEV__) {
    return <ProductionFallback />
  }
  return <PlaygroundHome />
}

/** Lo que ve alguien que de algún modo llega acá en producción — nunca debería pasar. */
function ProductionFallback() {
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <Box padding="lg" gap="md">
        <Text role="titleLg">No es una pantalla de MESH</Text>
        <Button label="Volver" onPress={() => router.back()} />
      </Box>
    </View>
  )
}
