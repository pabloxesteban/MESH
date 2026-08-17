import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useColorScheme } from 'react-native'
import {
  darkTheme,
  lightTheme,
  type Theme,
  type ThemeName,
} from '../tokens/theme.ts'

/**
 * Resuelve el tema desde el sistema, con anulación del usuario.
 *
 * El oscuro es el predeterminado: es el marco correcto para la fotografía y es
 * lo que hace una galería. `'system'` sigue al sistema operativo pero cae en
 * oscuro cuando el sistema no dice nada.
 */
export type ThemePreference = ThemeName | 'system'

interface ThemeContextValue {
  readonly theme: Theme
  readonly preference: ThemePreference
  readonly setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  initialPreference = 'system',
}: {
  children: ReactNode
  initialPreference?: ThemePreference
}) {
  const systemScheme = useColorScheme()
  const [preference, setPreference] =
    useState<ThemePreference>(initialPreference)

  const value = useMemo<ThemeContextValue>(() => {
    const resolved: ThemeName =
      preference === 'system'
        ? systemScheme === 'light'
          ? 'light'
          : 'dark'
        : preference

    return {
      theme: resolved === 'light' ? lightTheme : darkTheme,
      preference,
      setPreference,
    }
  }, [preference, systemScheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Devuelve el tema resuelto.
 *
 * Tira si no hay provider: un componente que renderiza sin tema estaría
 * inventando colores, y preferimos que eso falle fuerte en desarrollo antes que
 * salir a producción con un gris de fallback.
 */
export function useTheme(): Theme {
  const context = useContext(ThemeContext)
  if (context == null) {
    throw new Error('useTheme necesita estar dentro de <ThemeProvider>')
  }
  return context.theme
}

export function useThemePreference(): Omit<ThemeContextValue, 'theme'> {
  const context = useContext(ThemeContext)
  if (context == null) {
    throw new Error(
      'useThemePreference necesita estar dentro de <ThemeProvider>',
    )
  }
  const { preference, setPreference } = context
  return { preference, setPreference }
}
