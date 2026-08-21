import { useMemo, type ReactNode } from 'react'
import { View } from 'react-native'

import { Box } from '../primitives/Box.tsx'
import { spacing, type Spacing } from '../tokens/layout.ts'

/**
 * Reparte una lista en columnas balanceadas por altura acumulada.
 *
 * La misma cuenta que ya usaba la grilla de Explorar (`ArtworkGrid`,
 * D-013), sacada a un lugar propio para que un segundo consumidor —la grilla
 * de dos columnas de una colección— no la reescriba con una sutileza
 * distinta y las dos empiecen a divergir en silencio.
 *
 * **No alterna.** Alternar deja una columna mucho más larga apenas dos
 * elementos seguidos tienen alturas distintas. Se reparte siempre a la
 * columna más corta hasta ese momento, que es lo que termina parejo sin medir
 * nada en pantalla.
 *
 * `weightOf` devuelve el alto de cada elemento sobre un ancho unitario — no
 * hace falta el ancho real porque las columnas lo comparten y solo importa la
 * proporción entre ellas. Quien llama decide qué es "alto": para una obra es
 * el inverso de su relación de aspecto.
 */
export function balanceColumns<T>(
  items: readonly T[],
  columns: number,
  weightOf: (item: T) => number,
): ReadonlyArray<readonly T[]> {
  const cuantas = Math.max(1, Math.floor(columns))
  const reparto: T[][] = Array.from({ length: cuantas }, () => [])
  const altos = new Array<number>(cuantas).fill(0)

  for (const item of items) {
    const peso = weightOf(item)

    let masCorta = 0
    for (let i = 1; i < cuantas; i++) {
      if ((altos[i] ?? 0) < (altos[masCorta] ?? 0)) masCorta = i
    }

    reparto[masCorta]?.push(item)
    altos[masCorta] = (altos[masCorta] ?? 0) + peso
  }

  return reparto
}

export interface StaggeredGridProps<T> {
  items: readonly T[]
  /** Por defecto dos: la grilla de una colección, no la de Explorar. */
  columns?: number
  gap?: Spacing
  /** Ancho / alto real del elemento — la grilla respeta la forma, nunca recorta. */
  ratioOf: (item: T) => number
  keyExtractor: (item: T) => string
  renderItem: (item: T) => ReactNode
  testID?: string
}

/**
 * Grilla escalonada estática, de N columnas.
 *
 * Comparte el reparto por altura con `ArtworkGrid` y **nada más**: sin
 * respiración, sin desfasaje, sin reloj. Esa coreografía es de Explorar
 * —descubrimiento, D-013— y una superficie de administración personal como
 * "Guardado" o una colección no la hereda. Un movimiento perpetuo en una
 * pantalla donde la persona vino a ordenar sus cosas compite con lo que está
 * haciendo en vez de acompañarlo.
 *
 * Sin padding lateral propio: vive dentro de un contenedor que ya lo tiene
 * (el mismo patrón que `ProfileScreen` y `SavedScreen` ya usan para su
 * grilla de dos columnas), a diferencia de `ArtworkGrid`, que es dueña de
 * toda la pantalla de Explorar.
 */
export function StaggeredGrid<T>({
  items,
  columns = 2,
  gap = 'xxs',
  ratioOf,
  keyExtractor,
  renderItem,
  testID,
}: StaggeredGridProps<T>) {
  const columnas = useMemo(
    () => balanceColumns(items, columns, (item) => 1 / ratioOf(item)),
    [items, columns, ratioOf],
  )

  return (
    <View
      style={{ flexDirection: 'row', gap: spacing[gap] }}
      testID={testID}
    >
      {columnas.map((columna, indice) => (
        <Box key={indice} flex={1} gap={gap}>
          {columna.map((item) => (
            <View key={keyExtractor(item)}>{renderItem(item)}</View>
          ))}
        </Box>
      ))}
    </View>
  )
}
