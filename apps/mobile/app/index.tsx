import { StyleSheet, Text, View } from 'react-native'
import {
  CATEGORIES,
  MATCHING_VERSION,
  STYLES,
  TASTE_VERSION,
} from '@mesh/domain'

/**
 * Pantalla de verificación de la Fase 1.
 *
 * Existe para confirmar dos cosas en un dispositivo real: que la app levanta con
 * Expo Router, y que `@mesh/domain` resuelve desde el workspace. La pantalla de
 * intro real es la Fase 18.
 *
 * Sin colores, tipografías ni espaciados: el design system es la Fase 3 y hasta
 * entonces no hay tokens de dónde sacarlos. Poner valores crudos acá rompería el
 * lint, que es exactamente lo que queremos que haga. Ver ADR-008.
 */
export default function Index() {
  const tattooStyles = STYLES.filter((s) => s.categorySlug === 'tattoo')

  return (
    <View style={styles.container}>
      <Text>MESH</Text>
      <Text>Descubrí gente. Hacé que las ideas pasen.</Text>
      <Text>
        Fase 1 — fundaciones. {CATEGORIES.length} categoría,{' '}
        {tattooStyles.length} estilos en la taxonomía.
      </Text>
      <Text>
        {TASTE_VERSION} · {MATCHING_VERSION}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
