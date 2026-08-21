import { View } from 'react-native'
import { Image } from 'expo-image'

import { Skeleton } from './Skeleton.tsx'
import { useTheme } from '../providers/ThemeProvider.tsx'
import { radius } from '../tokens/layout.ts'

export type AvatarSize = 'sm' | 'md' | 'lg'

/** Diámetro por tamaño. `sm` es el mismo que ya usaba la tarjeta de Inicio. */
const DIAMETER: Record<AvatarSize, number> = {
  sm: 36,
  md: 56,
  lg: 96,
}

export interface AvatarProps {
  /** URL ya resuelta. La ausencia (`null`/`undefined`) dibuja la silueta. */
  source?: string | null
  size?: AvatarSize
  /** Mientras se resuelve la URL. Un círculo de `Skeleton`, no un spinner. */
  loading?: boolean
  /**
   * Solo cuando el avatar es la única descripción de la persona en pantalla
   * (por ejemplo, una miniatura sin nombre al lado). Con nombre visible al
   * lado, dejalo afuera: describir la misma foto dos veces es ruido para un
   * lector de pantalla.
   */
  accessibilityLabel?: string
  testID?: string
}

/**
 * Foto de perfil circular, o su ausencia.
 *
 * **Nunca una inicial generada.** Una inicial parece un dato — "esta persona
 * se llama M"— y no lo es: es tipografía disfrazada de información. La
 * silueta no finge nada; dice con claridad "todavía no hay foto", que es la
 * verdad en la mayoría de los perfiles hoy. Es una regla de producto, no una
 * preferencia visual, así que vive acá y no se vuelve a decidir por pantalla.
 *
 * La silueta se dibuja con primitivos — dos círculos recortados por el
 * contenedor — y no con un ícono importado: MESH no tiene set de íconos
 * propio, y uno genérico al lado de la tipografía de marca se lee como
 * pegado.
 */
export function Avatar({
  source = null,
  size = 'md',
  loading = false,
  accessibilityLabel,
  testID,
}: AvatarProps) {
  const theme = useTheme()
  const diameter = DIAMETER[size]

  if (loading) {
    return (
      <Skeleton
        width={diameter}
        height={diameter}
        radius="full"
        {...(testID != null ? { testID } : {})}
      />
    )
  }

  if (source == null) {
    return (
      <View
        testID={testID}
        accessible={accessibilityLabel != null}
        accessibilityRole={accessibilityLabel != null ? 'image' : undefined}
        accessibilityLabel={accessibilityLabel}
        style={{
          width: diameter,
          height: diameter,
          borderRadius: radius.full,
          backgroundColor: theme.surfaceRaised,
          alignItems: 'center',
          justifyContent: 'flex-end',
          overflow: 'hidden',
        }}
      >
        {/* Cabeza. */}
        <View
          style={{
            position: 'absolute',
            top: diameter * 0.2,
            width: diameter * 0.38,
            height: diameter * 0.38,
            borderRadius: radius.full,
            backgroundColor: theme.borderStrong,
          }}
        />
        {/* Hombros: un círculo más ancho que el marco, recortado por el
            `overflow: hidden` del contenedor. */}
        <View
          style={{
            width: diameter * 0.9,
            height: diameter * 0.62,
            borderRadius: diameter * 0.45,
            backgroundColor: theme.borderStrong,
            marginBottom: -diameter * 0.18,
          }}
        />
      </View>
    )
  }

  return (
    <Image
      source={source}
      accessible={accessibilityLabel != null}
      {...(testID != null ? { testID } : {})}
      {...(accessibilityLabel != null
        ? { accessibilityRole: 'image' as const, accessibilityLabel }
        : {})}
      contentFit="cover"
      transition={0}
      style={{
        width: diameter,
        height: diameter,
        borderRadius: radius.full,
        backgroundColor: theme.surfaceRaised,
      }}
    />
  )
}
