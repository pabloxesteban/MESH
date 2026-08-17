import { render, type RenderOptions } from '@testing-library/react-native'
import type { ReactElement, ReactNode } from 'react'
import { MotionProvider } from './providers/MotionProvider.tsx'
import {
  ThemeProvider,
  type ThemePreference,
} from './providers/ThemeProvider.tsx'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  theme?: ThemePreference
  reduceMotion?: boolean
}

/**
 * Renderiza con los providers puestos.
 *
 * Acepta el tema para poder correr el mismo test en los dos: un componente que
 * solo funciona en oscuro no está terminado, y la forma de sostener eso es que
 * los tests lo verifiquen.
 */
export function renderWithProviders(
  ui: ReactElement,
  { theme = 'dark', reduceMotion = false, ...options }: Options = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider initialPreference={theme}>
        <MotionProvider forceReduceMotion={reduceMotion}>
          {children}
        </MotionProvider>
      </ThemeProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

/** Los dos temas, para `describe.each`. */
export const BOTH_THEMES: ReadonlyArray<[string, ThemePreference]> = [
  ['oscuro', 'dark'],
  ['claro', 'light'],
]
