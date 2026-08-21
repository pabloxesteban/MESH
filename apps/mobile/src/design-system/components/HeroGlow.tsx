import { LinearGradient } from 'expo-linear-gradient'

import { useTheme } from '../providers/ThemeProvider.tsx'

export interface HeroGlowProps {
  /**
   * Alto del área que cubre el brillo. Un número en puntos, o un porcentaje
   * del contenedor que lo envuelve — igual que `Skeleton`, porque el caso de
   * uso es el mismo: el tamaño depende de la pantalla que lo envuelve, no de
   * un valor fijo del design system. ADR-032 usa `'45%'` en `IntentScreen`.
   */
  height: number | `${number}%`
  testID?: string
}

/**
 * Degradado de héroe. ADR-032.
 *
 * Puntual y acotado: acento al borde de un área chica, en la parte de arriba
 * de la pantalla, apagándose por completo a transparente antes de llegar al
 * 55% de esa área — nunca toca el contenido de abajo. Los stops y locations
 * vienen enteramente de `theme.heroGlow`; este componente no decide ningún
 * color, solo los aplica.
 *
 * **Nunca sobre una tarjeta, nunca sobre una miniatura de obra, nunca como
 * fondo permanente de una pantalla completa.** Eso sigue prohibido sin
 * excepción — visual-language.md §4. Es responsabilidad de quien lo usa
 * posicionarlo detrás de un título, nunca detrás de una imagen.
 *
 * Puramente decorativo: no lleva significado ni texto, así que queda fuera
 * del árbol de accesibilidad en las dos plataformas.
 */
export function HeroGlow({ height, testID }: HeroGlowProps) {
  const theme = useTheme()

  return (
    <LinearGradient
      testID={testID}
      colors={theme.heroGlow.colors}
      locations={theme.heroGlow.locations}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height,
      }}
    />
  )
}
