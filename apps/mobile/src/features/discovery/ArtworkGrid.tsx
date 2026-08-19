/**
 * La grilla de descubrimiento: comparar, no contemplar.
 *
 * Es la mitad de EDITORIAL GRID que corrige el modelo anterior. Una pantalla
 * que muestra una sola opción obliga a recordar la anterior para elegir, y
 * nadie recuerda bien. Ocho obras a la vez permiten comparar, que es la parte
 * de decidir que el mazo no cubre.
 *
 * **Dos columnas con las relaciones de aspecto reales.** Recortar todo a
 * cuadrado sería mentir sobre la obra: un lettering vertical y un blackwork
 * apaisado no ocupan el mismo rectángulo, y la grilla existe para respetar eso.
 *
 * El reparto entre columnas no es alternado (par a la izquierda, impar a la
 * derecha): eso deja una columna mucho más larga apenas las alturas son
 * distintas. Se reparte por altura acumulada, que es lo que hace que las dos
 * columnas terminen parejas sin medir nada en pantalla.
 */

import { useMemo } from 'react'
import { View } from 'react-native'

import { Box, SCREEN_GUTTER, spacing } from '@/design-system/index.ts'

import { ratioOf } from '@/features/transitions/geometry.ts'

import { ArtworkTile } from './ArtworkTile.tsx'
import type { FeedItem } from './queries.ts'

/** Separación entre obras. Chica: la grilla es densa a propósito. */
const GAP = spacing.xxs

export interface ArtworkGridProps {
  items: readonly FeedItem[]
  onOpen: (item: FeedItem) => void
}

/**
 * Reparte las obras en dos columnas balanceadas por altura.
 *
 * La altura de cada obra se calcula con la relación de aspecto sobre un ancho
 * unitario — no hace falta saber el ancho real, porque las dos columnas lo
 * comparten y solo importa la proporción entre ellas.
 */
export function splitIntoColumns(
  items: readonly FeedItem[],
): readonly [readonly FeedItem[], readonly FeedItem[]] {
  const left: FeedItem[] = []
  const right: FeedItem[] = []
  let altoIzquierda = 0
  let altoDerecha = 0

  for (const item of items) {
    // El inverso de la relación de aspecto: acá se acumulan altos, no anchos.
    // El default sale del mismo lugar que el de la tarjeta y el del hero, para
    // que las tres pantallas coincidan sobre la forma de una obra sin medidas.
    const ratio = 1 / ratioOf(item.mediaWidth, item.mediaHeight)

    if (altoIzquierda <= altoDerecha) {
      left.push(item)
      altoIzquierda += ratio
    } else {
      right.push(item)
      altoDerecha += ratio
    }
  }

  return [left, right]
}

export function ArtworkGrid({ items, onOpen }: ArtworkGridProps) {
  const [left, right] = useMemo(() => splitIntoColumns(items), [items])

  return (
    <View
      style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: SCREEN_GUTTER }}
      testID="discovery-grid"
    >
      <Box flex={1} gap="xxs">
        {left.map((item) => (
          <ArtworkTile
            key={item.portfolioItemId}
            item={item}
            onPress={() => onOpen(item)}
            testID={`discovery-tile-${item.portfolioItemId}`}
          />
        ))}
      </Box>
      <Box flex={1} gap="xxs">
        {right.map((item) => (
          <ArtworkTile
            key={item.portfolioItemId}
            item={item}
            onPress={() => onOpen(item)}
            testID={`discovery-tile-${item.portfolioItemId}`}
          />
        ))}
      </Box>
    </View>
  )
}
