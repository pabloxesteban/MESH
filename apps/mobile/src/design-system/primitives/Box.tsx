import { View, type ViewProps } from 'react-native'
import { useTheme } from '../providers/ThemeProvider.tsx'
import type { Theme } from '../tokens/theme.ts'
import {
  HAIRLINE,
  radius,
  spacing,
  type Radius,
  type Spacing,
} from '../tokens/layout.ts'

type SurfaceToken = Extract<
  keyof Theme,
  'surface' | 'surfaceRaised' | 'surfaceSunken'
>
type BorderToken = Extract<keyof Theme, 'borderSubtle' | 'borderStrong'>

export interface BoxProps extends Omit<ViewProps, 'style'> {
  /**
   * Espaciados por token, no por número. Un `padding: 24` dentro de una
   * pantalla es un error de lint; acá directamente no se puede escribir.
   */
  padding?: Spacing
  paddingX?: Spacing
  paddingY?: Spacing
  paddingTop?: Spacing
  paddingBottom?: Spacing
  gap?: Spacing
  radius?: Radius
  background?: SurfaceToken
  /** La elevación se expresa con superficie y borde de un píxel, no con sombras. */
  border?: BorderToken
  direction?: 'row' | 'column'
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between'
  flex?: number
}

export function Box({
  padding,
  paddingX,
  paddingY,
  paddingTop,
  paddingBottom,
  gap,
  radius: radiusToken,
  background,
  border,
  direction,
  align,
  justify,
  flex,
  ...rest
}: BoxProps) {
  const theme = useTheme()

  return (
    <View
      {...rest}
      style={{
        ...(padding != null && { padding: spacing[padding] }),
        ...(paddingX != null && { paddingHorizontal: spacing[paddingX] }),
        ...(paddingY != null && { paddingVertical: spacing[paddingY] }),
        ...(paddingTop != null && { paddingTop: spacing[paddingTop] }),
        ...(paddingBottom != null && { paddingBottom: spacing[paddingBottom] }),
        ...(gap != null && { gap: spacing[gap] }),
        ...(radiusToken != null && { borderRadius: radius[radiusToken] }),
        ...(background != null && { backgroundColor: theme[background] }),
        ...(border != null && {
          borderWidth: HAIRLINE,
          borderColor: theme[border],
        }),
        ...(direction != null && { flexDirection: direction }),
        ...(align != null && { alignItems: align }),
        ...(justify != null && { justifyContent: justify }),
        ...(flex != null && { flex }),
      }}
    />
  )
}
