/**
 * La grilla de descubrimiento: comparar, no contemplar.
 *
 * Es la mitad de EDITORIAL GRID que corrige el modelo anterior. Una pantalla
 * que muestra una sola opción obliga a recordar la anterior para elegir, y
 * nadie recuerda bien. Doce obras a la vez permiten comparar, que es la parte
 * de decidir que el mazo no cubre.
 *
 * **Tres columnas con las relaciones de aspecto reales.** Recortar todo a
 * cuadrado sería mentir sobre la obra: un lettering vertical y un blackwork
 * apaisado no ocupan el mismo rectángulo, y la grilla existe para respetar eso.
 *
 * El reparto entre columnas no es alternado: eso deja una columna mucho más
 * larga apenas las alturas son distintas. Se reparte a la columna más corta en
 * cada paso, que es lo que hace que terminen parejas sin medir nada en
 * pantalla.
 *
 * ## El desplazamiento opuesto
 *
 * Al scrollear, las columnas impares suben un poco y las pares bajan un poco.
 * Es paralaje ligado al scroll, **no** una animación que corre sola: una grilla
 * que se mueve sin que la toques es una distracción, y acá lo que tiene que
 * llamar la atención es la obra.
 *
 * Está acotado a `MAX_DRIFT` y se apaga entero con reducción de movimiento.
 */

import { useMemo } from 'react'
import { View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'

import {
  Box,
  SCREEN_GUTTER,
  spacing,
  useMotion,
} from '@/design-system/index.ts'

import { ratioOf } from '@/features/transitions/geometry.ts'

import { ArtworkTile } from './ArtworkTile.tsx'
import type { FeedItem } from './queries.ts'

/** Separación entre obras. Chica: la grilla es densa a propósito. */
const GAP = spacing.xxs

/** Tres. Con dos, cada obra pide contemplación; con cuatro no se ve ninguna. */
export const COLUMNS = 3

/**
 * Cuánto se corre una columna, como mucho, respecto de las vecinas.
 *
 * Chico a propósito: el efecto tiene que notarse sin que se lea como que la
 * grilla está rota. Y acotado, porque la transición obra → artista mide el
 * rectángulo de la obra desde el árbol de layout, donde este desplazamiento no
 * figura — con un valor grande, la copia arrancaría visiblemente corrida.
 */
const MAX_DRIFT = 18

/** A cuánto scroll se llega al desplazamiento máximo. */
const DRIFT_OVER = 900

/**
 * Reparte las obras en columnas balanceadas por altura.
 *
 * La altura de cada obra se calcula con la relación de aspecto sobre un ancho
 * unitario — no hace falta saber el ancho real, porque las columnas lo
 * comparten y solo importa la proporción entre ellas.
 */
export function splitIntoColumns(
  items: readonly FeedItem[],
  columns: number = COLUMNS,
): ReadonlyArray<readonly FeedItem[]> {
  const cuantas = Math.max(1, Math.floor(columns))
  const reparto: FeedItem[][] = Array.from({ length: cuantas }, () => [])
  const altos = new Array<number>(cuantas).fill(0)

  for (const item of items) {
    // El inverso de la relación de aspecto: acá se acumulan altos, no anchos.
    // El default sale del mismo lugar que el de la tarjeta y el del hero, para
    // que las tres pantallas coincidan sobre la forma de una obra sin medidas.
    const ratio = 1 / ratioOf(item.mediaWidth, item.mediaHeight)

    let masCorta = 0
    for (let i = 1; i < cuantas; i++) {
      if ((altos[i] ?? 0) < (altos[masCorta] ?? 0)) masCorta = i
    }

    reparto[masCorta]?.push(item)
    altos[masCorta] = (altos[masCorta] ?? 0) + ratio
  }

  return reparto
}

/** Impares hacia arriba, pares hacia abajo. La primera columna es la 0. */
export function driftDirection(columnIndex: number): 1 | -1 {
  'worklet'
  return columnIndex % 2 === 0 ? -1 : 1
}

/**
 * Cuánto se corre una columna para un scroll dado.
 *
 * Función aparte y no un cálculo adentro del worklet para poder verificar sin
 * navegador las dos cosas que importan: que satura —si creciera sin techo, en
 * un feed largo las columnas terminarían visiblemente descolgadas— y que las
 * vecinas van en direcciones opuestas, que es lo único que hace visible el
 * efecto.
 */
export function driftFor(scrollY: number, columnIndex: number): number {
  'worklet'
  const avance = Math.min(1, Math.max(0, scrollY / DRIFT_OVER))
  const corrimiento = avance * MAX_DRIFT * driftDirection(columnIndex)
  // `0 * -1` es `-0`, que no es igual a `0` para nadie que compare en serio.
  return corrimiento === 0 ? 0 : corrimiento
}

export interface ArtworkGridProps {
  items: readonly FeedItem[]
  onOpen: (item: FeedItem) => void
  /** La obra que está volviendo a su lugar, y por eso no se dibuja todavía. */
  hiddenPieceId?: string | null
  /** Desplazamiento del scroll. Ausente = sin paralaje. */
  scrollY?: SharedValue<number> | undefined
}

export function ArtworkGrid({
  items,
  onOpen,
  hiddenPieceId = null,
  scrollY,
}: ArtworkGridProps) {
  const columnas = useMemo(() => splitIntoColumns(items), [items])

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: GAP,
        paddingHorizontal: SCREEN_GUTTER,
      }}
      testID="discovery-grid"
    >
      {columnas.map((columna, indice) => (
        <Column
          key={indice}
          index={indice}
          items={columna}
          onOpen={onOpen}
          hiddenPieceId={hiddenPieceId}
          scrollY={scrollY}
        />
      ))}
    </View>
  )
}

function Column({
  index,
  items,
  onOpen,
  hiddenPieceId,
  scrollY,
}: {
  index: number
  items: readonly FeedItem[]
  onOpen: (item: FeedItem) => void
  hiddenPieceId: string | null
  scrollY: SharedValue<number> | undefined
}) {
  const { reduceMotion } = useMotion()
  const activo = scrollY != null && !reduceMotion

  const style = useAnimatedStyle(() => {
    if (!activo || scrollY == null) return { transform: [{ translateY: 0 }] }
    return { transform: [{ translateY: driftFor(scrollY.value, index) }] }
  })

  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <Box flex={1} gap="xxs">
        {items.map((item) => (
          <ArtworkTile
            key={item.portfolioItemId}
            item={item}
            onPress={() => onOpen(item)}
            hidden={item.portfolioItemId === hiddenPieceId}
            testID={`discovery-tile-${item.portfolioItemId}`}
          />
        ))}
      </Box>
    </Animated.View>
  )
}
