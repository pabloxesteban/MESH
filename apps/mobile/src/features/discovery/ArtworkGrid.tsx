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
 * ## La respiración de las columnas
 *
 * Las tres columnas suben y bajan solas, muy despacio, cada una desfasada un
 * tercio de ciclo respecto de la anterior. Nunca están las tres en el mismo
 * lugar del ciclo, y eso es lo que hace que la grilla se sienta viva en vez de
 * quieta.
 *
 * **Es una oscilación continua, no un efecto ligado al scroll.** La primera
 * versión iba atada al scroll y no se movía sola; se cambió a pedido. Lo que
 * hace que no moleste al scrollear de verdad es que nunca arranca ni frena: la
 * misma sinusoide sigue corriendo, y una velocidad constante es invisible al
 * lado del movimiento del dedo.
 *
 * Los tres números están elegidos para eso: `AMPLITUDE` chica, `PERIOD_MS`
 * largo, y una sinusoide —no un vaivén lineal— porque un vaivén tiene un tirón
 * en cada punta y una sinusoide no tiene ninguno.
 *
 * Se apaga entero con reducción de movimiento.
 */

import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

import {
  balanceColumns,
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
 * Cuánto sube y baja una columna, como máximo, desde su lugar.
 *
 * Ocho puntos: se nota mirando y no se nota leyendo. Chico también porque la
 * transición obra → artista mide el rectángulo de la obra desde el árbol de
 * layout, donde este desplazamiento no figura — con un valor grande, la copia
 * arrancaría visiblemente corrida.
 */
const AMPLITUDE = 8

/**
 * Lo que tarda un ciclo entero.
 *
 * Veinte segundos. A este tamaño de amplitud son unos 1,6 puntos por segundo:
 * más lento que cualquier scroll, que es exactamente la condición para que no
 * compita con él.
 */
const PERIOD_MS = 20_000

/**
 * Reparte las obras en columnas balanceadas por altura.
 *
 * La cuenta en sí —a qué columna va cada elemento— vive en el design system
 * (`balanceColumns`), compartida con la grilla de dos columnas de una
 * colección: es la misma regla de reparto, y dos copias divergirían con el
 * tiempo sin que nadie lo decidiera. Lo único propio de acá es CÓMO se mide
 * el alto de una obra.
 *
 * La altura de cada obra se calcula con la relación de aspecto sobre un ancho
 * unitario — no hace falta saber el ancho real, porque las columnas lo
 * comparten y solo importa la proporción entre ellas.
 */
export function splitIntoColumns(
  items: readonly FeedItem[],
  columns: number = COLUMNS,
): ReadonlyArray<readonly FeedItem[]> {
  return balanceColumns(
    items,
    columns,
    // El inverso de la relación de aspecto: acá se acumulan altos, no anchos.
    // El default sale del mismo lugar que el de la tarjeta y el del hero,
    // para que las tres pantallas coincidan sobre la forma de una obra sin
    // medidas.
    (item) => 1 / ratioOf(item.mediaWidth, item.mediaHeight),
  )
}

/**
 * El desfasaje de una columna, en vueltas de ciclo.
 *
 * Un tercio por columna. Con tres columnas eso las deja lo más repartidas
 * posible: cuando la primera está arriba de todo, la segunda va bajando y la
 * tercera subiendo. Si el desfasaje fuera medio ciclo, la primera y la tercera
 * se moverían juntas y el efecto se perdería.
 */
export function phaseOf(
  columnIndex: number,
  columns: number = COLUMNS,
): number {
  'worklet'
  return (columnIndex % columns) / columns
}

/**
 * Dónde está una columna en su vaivén, para una fase dada del ciclo.
 *
 * `phase` va de 0 a 1 y vuelve a empezar. Una sinusoide y no un vaivén lineal:
 * el lineal cambia de dirección de golpe en cada punta, y eso se ve como un
 * tirón. La sinusoide entra y sale de cada extremo sola.
 *
 * Función aparte y no una cuenta adentro del worklet para poder verificar sin
 * navegador las tres cosas que importan y que no se ven en una captura: que no
 * se pasa de `AMPLITUDE`, que el ciclo cierra sin salto, y que las columnas
 * nunca están las tres en el mismo lugar.
 */
export function driftAt(phase: number, columnIndex: number): number {
  'worklet'
  const vuelta = (phase + phaseOf(columnIndex)) * 2 * Math.PI
  return Math.sin(vuelta) * AMPLITUDE
}

export interface ArtworkGridProps {
  items: readonly FeedItem[]
  onOpen: (item: FeedItem) => void
  /** La obra que está volviendo a su lugar, y por eso no se dibuja todavía. */
  hiddenPieceId?: string | null
}

export function ArtworkGrid({
  items,
  onOpen,
  hiddenPieceId = null,
}: ArtworkGridProps) {
  const columnas = useMemo(() => splitIntoColumns(items), [items])
  const { reduceMotion } = useMotion()

  // Un solo reloj para las tres columnas: si cada una tuviera el suyo, se irían
  // separando de a milisegundos y el desfasaje dejaría de ser el que se eligió.
  const phase = useSharedValue(0)

  useEffect(() => {
    if (reduceMotion) {
      phase.value = 0
      return
    }
    // `Easing.linear` y sin ida y vuelta: la curva la pone la sinusoide, no el
    // easing. Con un easing encima, el vaivén tendría dos suavizados
    // superpuestos y se movería a tirones.
    phase.value = withRepeat(
      withTiming(1, { duration: PERIOD_MS, easing: Easing.linear }),
      -1,
      false,
    )
    return () => cancelAnimation(phase)
  }, [reduceMotion, phase])

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
          phase={phase}
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
  phase,
}: {
  index: number
  items: readonly FeedItem[]
  onOpen: (item: FeedItem) => void
  hiddenPieceId: string | null
  phase: SharedValue<number>
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: driftAt(phase.value, index) }],
  }))

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
