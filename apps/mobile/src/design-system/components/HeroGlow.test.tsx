import { screen } from '@testing-library/react-native'
import { processColor } from 'react-native'

import { darkTheme, lightTheme } from '../tokens/theme.ts'
import { BOTH_THEMES, renderWithProviders } from '../test-utils.tsx'
import { HeroGlow } from './HeroGlow.tsx'

// `accessibilityElementsHidden` saca al nodo del árbol de accesibilidad a
// propósito (es puramente decorativo), así que las queries por default de
// RNTL no lo encuentran — hay que pedirlo explícitamente, igual que ya hacen
// transitions.test.tsx y profile.test.tsx para otros nodos ocultos adrede.
function getHeroGlow(testID: string) {
  return screen.getByTestId(testID, { includeHiddenElements: true })
}

describe.each(BOTH_THEMES)('HeroGlow · tema %s', (_name, theme) => {
  it('usa los stops y locations de theme.heroGlow, no un color propio', () => {
    renderWithProviders(<HeroGlow height={200} testID="hero-glow" />, {
      theme,
    })
    const node = getHeroGlow('hero-glow')
    const expected = theme === 'dark' ? darkTheme.heroGlow : lightTheme.heroGlow

    // `LinearGradient` pasa cada color por `processColor()` de React Native
    // antes de llegar a la vista nativa (`colors.map(processColor)` en
    // expo-linear-gradient), así que lo que recibe el nodo host no es el
    // string del token sino su entero procesado — comparamos contra el mismo
    // procesamiento, no contra el string crudo, para que el test valide lo
    // que de verdad se compone.
    expect(node.props.colors).toEqual(expected.colors.map(processColor))
    expect(node.props.locations).toEqual(expected.locations)
  })

  it('el segundo stop siempre es transparente — se apaga antes del contenido', () => {
    renderWithProviders(<HeroGlow height={200} testID="hero-glow" />, {
      theme,
    })
    expect(getHeroGlow('hero-glow').props.colors[1]).toBe(
      processColor('transparent'),
    )
  })

  it('nunca intercepta el gesto: pointerEvents="none"', () => {
    renderWithProviders(<HeroGlow height={200} testID="hero-glow" />, {
      theme,
    })
    expect(getHeroGlow('hero-glow').props.pointerEvents).toBe('none')
  })

  it('queda fuera del árbol de accesibilidad: es puramente decorativo', () => {
    renderWithProviders(<HeroGlow height={200} testID="hero-glow" />, {
      theme,
    })
    const node = getHeroGlow('hero-glow')
    expect(node.props.accessibilityElementsHidden).toBe(true)
    expect(node.props.importantForAccessibility).toBe('no-hide-descendants')

    // Y la prueba directa: la query por default (sin `includeHiddenElements`)
    // no lo encuentra, que es exactamente el punto de ponerlo.
    expect(screen.queryByTestId('hero-glow')).toBeNull()
  })

  it('acepta un alto numérico o porcentual, igual que Skeleton', () => {
    renderWithProviders(<HeroGlow height="45%" testID="hero-glow" />, {
      theme,
    })
    const style = getHeroGlow('hero-glow').props.style
    expect(style.height).toBe('45%')
    expect(style.position).toBe('absolute')
  })
})
