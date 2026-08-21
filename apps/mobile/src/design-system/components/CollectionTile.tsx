import { Image } from 'expo-image'
import { View } from 'react-native'

import { Box } from '../primitives/Box.tsx'
import { Text } from '../primitives/Text.tsx'
import { Pressable } from '../primitives/Pressable.tsx'
import { Skeleton } from './Skeleton.tsx'
import { useTheme } from '../providers/ThemeProvider.tsx'
import { HAIRLINE, radius, spacing } from '../tokens/layout.ts'

/** Cuadrantes del mosaico. Siempre cuatro, aunque sobren o falten miniaturas. */
const SLOTS = [0, 1, 2, 3] as const

export interface CollectionTileProps {
  name: string
  /**
   * Cuánto dice la tarjeta, ya traducido (p. ej. "12 obras"). El design
   * system no pluraliza: eso depende del locale y vive en `i18n/`.
   */
  countLabel: string
  /**
   * Hasta cuatro URLs de portada, ya resueltas. Con menos de cuatro los
   * cuadrantes que faltan quedan en superficie neutra — nunca se repite una
   * miniatura ni se inventa una cuarta.
   */
  thumbnails: readonly string[]
  onPress: () => void
  /** La tarjeta entera, en una frase (nombre + cantidad). */
  accessibilityLabel: string
  loading?: boolean
  testID?: string
}

/**
 * Tile de una colección: nombre, cantidad, y un mosaico de hasta cuatro
 * portadas.
 *
 * El mosaico nunca miente sobre cuánto hay: una colección con una sola obra
 * muestra un cuadrante y tres vacíos, no la misma foto repetida cuatro veces
 * — eso contaría una colección más llena de lo que es.
 */
export function CollectionTile({
  name,
  countLabel,
  thumbnails,
  onPress,
  accessibilityLabel,
  loading = false,
  testID,
}: CollectionTileProps) {
  const theme = useTheme()

  if (loading) {
    return (
      <Box gap="xxs" testID={testID}>
        <Mosaic thumbnails={[]} loading theme={theme} />
        <Skeleton width="70%" height={18} />
        <Skeleton width="40%" height={14} />
      </Box>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={{ gap: spacing.xxs }}
    >
      <Mosaic thumbnails={thumbnails} loading={false} theme={theme} />
      <Box gap="xxs">
        <Text role="body" numberOfLines={1}>
          {name}
        </Text>
        <Text role="label" color="textTertiary">
          {countLabel}
        </Text>
      </Box>
    </Pressable>
  )
}

function Mosaic({
  thumbnails,
  loading,
  theme,
}: {
  thumbnails: readonly string[]
  loading: boolean
  theme: ReturnType<typeof useTheme>
}) {
  return (
    <View
      style={{
        aspectRatio: 1,
        borderRadius: radius.md,
        overflow: 'hidden',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: HAIRLINE,
        backgroundColor: theme.borderSubtle,
      }}
    >
      {SLOTS.map((slot) => {
        const source = thumbnails[slot]
        return (
          <View
            key={slot}
            style={{
              width: '49.7%',
              height: '49.7%',
              backgroundColor: theme.surfaceSunken,
            }}
          >
            {loading ? (
              <Skeleton width="100%" height="100%" radius="sm" />
            ) : source != null ? (
              <Image
                source={source}
                contentFit="cover"
                transition={0}
                accessible={false}
                style={{ width: '100%', height: '100%' }}
              />
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
