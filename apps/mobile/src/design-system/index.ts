/**
 * Design system de MESH.
 *
 * Las pantallas y las features importan de acá y de ningún otro lado. Un valor
 * de diseño crudo dentro de una pantalla es un error de lint, no una
 * observación de revisión. Ver ADR-008 y docs/design/design-system.md.
 *
 * `palette.ts` no se exporta a propósito: los componentes consumen tokens
 * semánticos, nunca literales. Si algo necesita un literal, a `theme.ts` le
 * falta un token.
 */

// Providers
export {
  ThemeProvider,
  useTheme,
  useThemePreference,
  type ThemePreference,
} from './providers/ThemeProvider.tsx'
export { MotionProvider, useMotion } from './providers/MotionProvider.tsx'

// Primitivos
export { Box, type BoxProps } from './primitives/Box.tsx'
export { Text, type TextColor, type TextProps } from './primitives/Text.tsx'
export { Pressable, type PressableProps } from './primitives/Pressable.tsx'

// Controles
export {
  Button,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from './components/Button.tsx'
export { FilterChip, type FilterChipProps } from './components/FilterChip.tsx'
export { Input, type InputProps } from './components/Input.tsx'
export { Tag, type TagProps } from './components/Tag.tsx'

// Estados
export { EmptyState, type EmptyStateProps } from './components/EmptyState.tsx'
export {
  ErrorState,
  type ErrorCause,
  type ErrorStateAction,
  type ErrorStateProps,
} from './components/ErrorState.tsx'
export { Skeleton, type SkeletonProps } from './components/Skeleton.tsx'
export { Toast, type ToastProps, type ToastTone } from './components/Toast.tsx'

// Tokens
export {
  darkTheme,
  lightTheme,
  themes,
  type Theme,
  type ThemeName,
} from './tokens/theme.ts'
export {
  HAIRLINE,
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  radius,
  spacing,
  type Radius,
  type Spacing,
} from './tokens/layout.ts'
export {
  MAX_FONT_SCALE,
  fontFamily,
  textRoles,
  type TextRole,
} from './tokens/typography.ts'
export {
  MAX_DURATION,
  REDUCED_DURATION,
  STAGGER,
  duration,
  easing,
  spring,
  type Duration,
  type Spring,
} from './tokens/motion.ts'
export {
  haptic,
  hapticsEnabled,
  setHapticsEnabled,
  type HapticIntent,
} from './tokens/haptics.ts'
export { AA_LARGE, AA_TEXT, contrastRatio, meetsContrast } from './contrast.ts'
