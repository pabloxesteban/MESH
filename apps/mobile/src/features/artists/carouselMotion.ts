/**
 * El efecto de foco de Inicio: constantes.
 *
 * Dos efectos comparten este archivo porque son la misma idea en dos ejes:
 *
 * · **Horizontal** — cada obra del carrusel de `ArtistCard` se escala y
 *   atenúa según su distancia al centro del viewport mientras se scrollea,
 *   con snap nativo al soltar.
 * · **Vertical** — cada tarjeta de artista de `ArtistsScreen` hace lo mismo
 *   según su distancia al centro de la pantalla mientras se scrollea la
 *   lista, sin snap (D-010: sigue siendo una lista vertical normal, nunca un
 *   mazo).
 *
 * `interaction-designer` especificó los números de los dos; viven acá y no en
 * `design-system/tokens/motion.ts` porque no son duraciones ni easings — son
 * geometría y curvas de interpolación propias de esta feature, calculadas
 * como **constantes de JS puro** donde se puede (la caja de cada obra es
 * 200×267 fija, siempre, así que `PIECE_WIDTH`/`PITCH` no necesitan
 * `onLayout`). `apps/mobile/CLAUDE.md` pide que todo valor crudo fuera del
 * design system quede documentado línea por línea — eso es lo que sigue.
 *
 * A diferencia del revelado editorial vertical que se probó y se revirtió
 * (ver `git log` — 174c920 lo agregó, c4bd77c lo sacó, por una franja de
 * fondo crudo visible que el diseño no había verificado matemáticamente en
 * todo el rango, solo en los extremos), acá la cobertura de la imagen contra
 * la escala mínima combinada SÍ se verificó con la cuenta completa. Ver el
 * comentario de `IMAGE_OVERSCALE` más abajo — es la verificación, no una
 * promesa.
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
 * encoge visualmente el marco entero alrededor de su propio centro, y sin
 * sobra la imagen dejaría ver el fondo crudo del `Pressable` en el borde —
 * exactamente el bug que se shippeó y se revirtió (174c920 → c4bd77c), solo
 * que ahí era una franja de scroll vertical y acá sería un anillo en el
 * borde de cada obra al encogerse.
 *
 * **Ya no cubre un solo efecto — cubre dos combinados.** Desde que existe el
 * foco vertical entre tarjetas (`CARD_SCALE_RECEDE` más abajo), el `scale`
 * real de `Frame` es `horizontalScale × verticalScale`: una obra puede estar
 * a la vez en el extremo del carrusel horizontal Y en una tarjeta en receso
 * vertical. El overscale tiene que cubrir esa combinación, no cada eje por
 * separado — por eso el valor subió de 1.12 (solo horizontal) a 1.24.
 *
 * **La cuenta, hecha de nuevo acá con los números finales que terminó usando
 * el código** (no una copia del número de la spec):
 *
 * La imagen (y el velo) se renderizan al `IMAGE_OVERSCALE` de la caja,
 * centrados, como hijos de un `Animated.View` ("Frame") que lleva el
 * `transform: scale(s)`. Ese `transform` escala visualmente TODO el
 * subárbol alrededor de su propio centro — que coincide con el centro de la
 * caja, porque el Frame ocupa el 100%/100% del `Pressable` y no se traslada.
 * El tamaño visual efectivo de la imagen, en cada dimensión, es entonces:
 *
 *   tamaño_caja × IMAGE_OVERSCALE × s
 *
 * y el margen que sobra por lado contra el borde de la caja (que NO se
 * escala nunca — es el `Pressable`, el ancla de `useArtworkAnchor`):
 *
 *   margen_por_lado = tamaño_caja × (IMAGE_OVERSCALE × s − 1) / 2
 *
 * Esto es una **fracción** del tamaño de la caja, no un número fijo de
 * puntos — por eso da lo mismo en ancho que en alto (la imagen y el velo se
 * sobredimensionan con el mismo porcentaje en las dos dimensiones), y por eso
 * alcanza con verificar el ancho: el alto (200 / (3/4) ≈ 266,67pt) da el
 * mismo margen relativo, solo que en más puntos absolutos.
 *
 * `s` combinado es monotónico creciente entre `s_min` (los dos mínimos a la
 * vez) y 1 (los dos efectos en su centro) — así que el margen relativo
 * también lo es, y el peor caso (el margen más chico) es el extremo
 * combinado, nunca un punto intermedio:
 *
 *   s_min = SCALE_PEEK × CARD_SCALE_RECEDE = 0.95 × 0.92 = 0.874
 *
 *   margen_por_lado = 200 × (1.24 × 0.874 − 1) / 2
 *                    = 200 × (1.08376 − 1) / 2
 *                    = 200 × 0.04188
 *                    = 8.38pt
 *
 * Positivo, con margen — nunca cero, nunca negativo. En alto: 266,67 ×
 * 0.04188 ≈ 11.17pt, más holgado todavía. Y el caso de un solo efecto activo
 * (el que ya andaba en producción) queda **más** cubierto que antes, no
 * menos: horizontal solo, `s = SCALE_PEEK = 0.95` →
 * `200 × (1.24 × 0.95 − 1) / 2 ≈ 17.8pt` — sin regresión sobre lo que ya
 * funcionaba.
 *
 * (El número de la spec de `interaction-designer` daba lo mismo, ≈8.38pt —
 * esto es la verificación independiente que pide el Paso 2, hecha de nuevo,
 * no una copia de la de la spec.)
 */
export const IMAGE_OVERSCALE = 1.24

// --- foco vertical entre tarjetas ------------------------------------------

/**
 * Franja alrededor del centro de la pantalla, como fracción de su alto,
 * donde una tarjeta ya está totalmente en foco (`verticalDepth = 1`). A
 * diferencia del carrusel horizontal, acá no hay snap — sin esta franja
 * plana ninguna tarjeta estaría nunca del todo resuelta, y el efecto se
 * leería inquieto en vez de sereno.
 */
export const PLATEAU_RATIO = 0.18

/**
 * Distancia al centro de la pantalla, como fracción de su alto, a partir de
 * la cual el receso ya llegó a su máximo (`verticalDepth = 0`). Entre
 * `PLATEAU_RATIO` y esto, `verticalDepth` interpola linealmente.
 */
export const FOCUS_BAND_RATIO = 0.62

/** Escala mínima de una tarjeta en receso total (`verticalDepth = 0`). */
export const CARD_SCALE_RECEDE = 0.92

/**
 * Opacidad extra del velo de una tarjeta en receso total, combinada con la
 * del foco horizontal — nunca sumada directo. Dos velos semitransparentes
 * apilados se combinan como `1 − (1 − a)(1 − b)`, la fórmula correcta de
 * opacidad compuesta: nunca puede superar 1, y con los dos extremos a la vez
 * (`DIM_PEEK=0.18`, esto en `0.35`) da `1 − (0.82)(0.65) ≈ 0.467` — nunca
 * tapa la obra a la mitad, sigue siendo foco, no apagado.
 */
export const CARD_DIM_RECEDE = 0.35

/** Opacidad mínima de la fila de identidad (avatar, nombre, ubicación) en receso total. */
export const IDENTITY_OPACITY_RECEDE = 0.55

/** Asentamiento vertical máximo, en puntos, de la fila de identidad en receso total. */
export const IDENTITY_TRANSLATE_RECEDE = 10

// --- borde de pantalla -------------------------------------------------------

/**
 * Alto de cada degradado de borde en `ArtistsScreen`, en puntos. Pinta
 * `theme.surface` sobre sí mismo con opacidad decreciente hacia el centro de
 * la pantalla — nunca un segundo color, por eso no hace falta una prueba de
 * cobertura para esto: en cualquier punto del rango es `theme.surface` sobre
 * `theme.surface`, así que pintarlo encima de sí mismo es un no-op visual.
 * Ver el comentario de `EdgeFade` en `ArtistsScreen.tsx`.
 */
export const EDGE_FADE_H = 96
