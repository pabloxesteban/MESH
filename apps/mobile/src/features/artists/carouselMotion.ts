/**
 * El efecto de foco del carrusel de obra: constantes.
 *
 * Cada obra del carrusel horizontal de `ArtistCard` se escala y atenúa según
 * su distancia al centro del viewport mientras se scrollea, con snap nativo al
 * soltar. `interaction-designer` especificó los números; viven acá y no en
 * `design-system/tokens/motion.ts` porque no son duraciones ni easings — son
 * geometría y una curva de interpolación propias de esta feature, calculadas
 * como **constantes de JS puro**: la caja de cada obra es 200×267 fija,
 * siempre, así que no hace falta medir nada con `onLayout` como sí hacía falta
 * en el intento anterior. `apps/mobile/CLAUDE.md` pide que todo valor crudo
 * fuera del design system quede documentado línea por línea — eso es lo que
 * sigue.
 *
 * A diferencia del revelado editorial vertical que se probó y se revirtió
 * (ver `git log` — 174c920 lo agregó, c4bd77c lo sacó, por una franja de
 * fondo crudo visible que el diseño no había verificado matemáticamente en
 * todo el rango, solo en los extremos), acá la cobertura de la imagen contra
 * la escala mínima SÍ se verificó con la cuenta completa. Ver el comentario
 * de `IMAGE_OVERSCALE_PEEK` más abajo — es la verificación, no una promesa.
 */

import { spacing } from '@/design-system/index.ts'

/** Ancho de cada obra del carrusel. Único lugar donde vive — `ArtistCard.tsx` lo importa de acá. */
export const PIECE_WIDTH = 200

/**
 * Distancia de centro a centro entre dos piezas consecutivas.
 *
 * `PIECE_WIDTH` (200) más el gap entre piezas del `contentContainerStyle` del
 * carrusel (`spacing.xxs`, 4pt): 204. El mismo número sirve dos propósitos, y
 * eso es lo que los mantiene sincronizados: es el paso que cada
 * `CarouselPiece` usa para calcular su posición de reposo (`itemLeft = index
 * * PITCH`) en JS puro, y es el `snapToInterval` que se le da al scroll
 * nativo. Si alguna vez cambia el ancho de la pieza o el gap, este valor
 * cambia con ellos — no hay dos lugares para desincronizarse.
 */
export const PITCH = PIECE_WIDTH + spacing.xxs // 204

/**
 * Escala de una pieza en el punto de mayor distancia al centro (a un `PITCH`
 * entero o más — clampeado ahí). Apenas por debajo de 1: la pieza vecina se
 * ve "de reojo", nunca protagonista ni descartada del todo.
 */
export const SCALE_PEEK = 0.95

/**
 * Opacidad del velo de atenuación (`Scrim`) en el punto de mayor distancia.
 * 0 en el centro, esto en los extremos — nunca tapa del todo: es foco, no un
 * carrusel de tarjetas apagadas.
 */
export const DIM_PEEK = 0.18

/**
 * Cuánto más grande que su caja se renderiza la imagen de cada obra —en las
 * dos dimensiones, centrada— y con ella el velo de atenuación, que **tiene
 * que compartir exactamente esta misma geometría** (ver el comentario de
 * `Scrim` en `ArtistCard.tsx`). Existe por la misma razón que tenía
 * `IMAGE_OVERSCALE` en el revelado vertical revertido: el `scale` mínimo
 * (`SCALE_PEEK`) encoge visualmente el marco entero alrededor de su propio
 * centro, y sin sobra la imagen dejaría ver el fondo crudo del `Pressable`
 * en el borde — exactamente el bug que se shippeó y se revirtió (174c920 →
 * c4bd77c), solo que ahí era una franja de scroll vertical y acá sería un
 * anillo en el borde de cada obra al encogerse.
 *
 * **La cuenta, hecha de nuevo acá con los números finales que terminó usando
 * el código** (no una copia del número de la spec):
 *
 * La imagen (y el velo) se renderizan al `IMAGE_OVERSCALE_PEEK` de la caja,
 * centrados, como hijos de un `Animated.View` ("Frame") que lleva el
 * `transform: scale(s)`. Ese `transform` escala visualmente TODO el
 * subárbol alrededor de su propio centro — que coincide con el centro de la
 * caja, porque el Frame ocupa el 100%/100% del `Pressable` y no se traslada.
 * El tamaño visual efectivo de la imagen, en cada dimensión, es entonces:
 *
 *   tamaño_caja × IMAGE_OVERSCALE_PEEK × s
 *
 * y el margen que sobra por lado contra el borde de la caja (que NO se
 * escala nunca — es el `Pressable`, el ancla de `useArtworkAnchor`):
 *
 *   margen_por_lado = tamaño_caja × (IMAGE_OVERSCALE_PEEK × s − 1) / 2
 *
 * Esto es una **fracción** del tamaño de la caja, no un número fijo de
 * puntos — por eso da lo mismo en ancho que en alto (la imagen y el velo se
 * sobredimensionan con el mismo porcentaje en las dos dimensiones), y por eso
 * alcanza con verificar el ancho: el alto (200 / (3/4) ≈ 266,67pt) da el
 * mismo margen relativo, solo que en más puntos absolutos.
 *
 * `s` es monotónico creciente entre `SCALE_PEEK` (0.95, en el extremo del
 * rango de interpolación) y 1 (en el centro) — así que el margen relativo
 * también lo es, y el peor caso (el margen más chico) es el extremo, con
 * `s = SCALE_PEEK`:
 *
 *   margen_por_lado = 200 × (1.12 × 0.95 − 1) / 2
 *                    = 200 × (1.064 − 1) / 2
 *                    = 200 × 0.032
 *                    = 6.4pt
 *
 * Positivo, en todo punto verificable del rango — nunca cero, nunca
 * negativo, y el peor caso está en el extremo (no a mitad de camino), así
 * que no hace falta revisar puntos intermedios. En alto: 266,67 × 0.032 ≈
 * 8.53pt de margen por lado, más holgado todavía.
 *
 * (El número de la spec de `interaction-designer` daba lo mismo, ≈6.4pt —
 * esto es la verificación independiente que pide el Paso 2, hecha de nuevo,
 * no una copia de la de la spec.)
 */
export const IMAGE_OVERSCALE_PEEK = 1.12
