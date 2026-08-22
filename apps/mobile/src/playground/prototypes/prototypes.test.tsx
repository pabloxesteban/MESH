/**
 * Tests de humo de los prototipos construidos.
 *
 * No son tests de física ni de UX — eso se evalúa con la mano, en dispositivo,
 * como documenta interaction-designer.md. Son la red mínima: que cada
 * prototipo monte sin tirar, y que sus alternativas sin gesto existan.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { SwipePhysicsLab } from './SwipePhysicsLab.tsx'
import { BottomSheetLab } from './BottomSheetLab.tsx'
import { TasteMapLab } from './TasteMapLab.tsx'
import { CarouselPeekLab } from './CarouselPeekLab.tsx'

function withProviders(node: React.ReactElement) {
  return (
    <ThemeProvider>
      <MotionProvider>
        <I18nProvider locale="es-AR">{node}</I18nProvider>
      </MotionProvider>
    </ThemeProvider>
  )
}

describe('SwipePhysicsLab', () => {
  it('monta y expone los tres controles', () => {
    render(withProviders(<SwipePhysicsLab />))
    expect(screen.getByTestId('lab-physics-card')).toBeTruthy()
    expect(screen.getByTestId('lab-last-decision').props.children).toMatch(
      /todavía no soltaste/i,
    )
  })

  it('reiniciar limpia la última decisión', () => {
    render(withProviders(<SwipePhysicsLab />))
    fireEvent.press(screen.getByTestId('lab-reset'))
    expect(screen.getByTestId('lab-last-decision').props.children).toMatch(
      /todavía no soltaste/i,
    )
  })
})

describe('BottomSheetLab', () => {
  it('el botón de cerrar es la alternativa sin gesto', () => {
    render(withProviders(<BottomSheetLab />))
    expect(screen.getByTestId('lab-sheet')).toBeTruthy()
    fireEvent.press(screen.getByTestId('lab-sheet-close'))
    expect(screen.queryByTestId('lab-sheet')).toBeNull()
    expect(screen.getByTestId('lab-sheet-open')).toBeTruthy()
  })
})

describe('TasteMapLab', () => {
  it('un nodo por estilo del fixture, sin líneas entre estilos', () => {
    render(withProviders(<TasteMapLab />))
    expect(screen.getByTestId('lab-taste-map-center')).toBeTruthy()
    expect(screen.getByTestId('lab-taste-node-fine-line')).toBeTruthy()
    expect(screen.getByTestId('lab-taste-node-japanese')).toBeTruthy()
  })
})

describe('CarouselPeekLab', () => {
  it('monta el carrusel completo, sin tirar', () => {
    render(withProviders(<CarouselPeekLab />))
    expect(screen.getByTestId('lab-carousel-peek')).toBeTruthy()
    expect(screen.getByTestId('lab-peek-piece-0')).toBeTruthy()
    expect(screen.getByTestId('lab-peek-piece-7')).toBeTruthy()
  })

  it('con movimiento reducido monta igual, sin animar', () => {
    render(
      <ThemeProvider>
        <MotionProvider forceReduceMotion>
          <I18nProvider locale="es-AR">
            <CarouselPeekLab />
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>,
    )
    expect(screen.getByTestId('lab-carousel-peek')).toBeTruthy()
  })

  it('el control forzado de movimiento reducido alterna el aviso', () => {
    render(withProviders(<CarouselPeekLab />))
    expect(screen.queryByText(/showcase spread estático/)).toBeNull()

    fireEvent.press(screen.getByTestId('lab-peek-reduce-motion'))
    expect(screen.getByText(/showcase spread estático/)).toBeTruthy()
  })
})
