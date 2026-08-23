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
 * entero o más — clampeado ahí).
 *
 * Bajó de 0.95 a 0.86 para un contraste más editorial entre lo enfocado y lo
 * que no —pedido directo, con referencias visuales de una grilla de
 * categorías y un carrusel de contenido, citando a Tattoodo como inspiración
 * pero pidiendo explícitamente no copiarlo—. Sigue siendo "de reojo", nunca
 * descartada del todo: la vecina se ve, solo que ahora con más recorte
 * revelado (14% del marco original visible en el borde, contra 5% antes).
 */
export const SCALE_PEEK = 0.86

/**
 * Escala de la pieza centrada (`distance = 0`), reemplaza el `1` implícito
 * de antes de este cambio.
 *
 * **Ojo con lo que esto NO hace**: `Frame` lleva el `transform`, pero quien
 * recorta es el `Pressable` —el ancla de `useArtworkAnchor`, que nunca puede
 * llevar `style` animado— y su tamaño de layout no cambia con ningún
 * `scale`. Un valor mayor a 1 acá no agranda la tarjeta como una ficha que
 * "crece" (eso pedía una de las referencias): es un acercamiento leve sobre
 * la imagen sobredimensionada, adentro de la misma ventana con esquinas
 * redondeadas de siempre. Un valor modesto (1.04) alcanza para una
 * intimidad extra sin distorsionar el encuadre que eligió el artista; nunca
 * iba a leerse como "más grande" por más que subiera, así que no vale la
 * pena forzarlo.
 */
export const SCALE_FOCUS = 1.04

/**
 * Opacidad del velo de atenuación (`Scrim`) en el punto de mayor distancia.
 * 0 en el centro, esto en los extremos — nunca tapa del todo: es foco, no un
 * carrusel de tarjetas apagadas.
 *
 * Subió de 0.18 a 0.40 (más del doble) en el mismo pedido que bajó
 * `SCALE_PEEK`: las referencias mostraban un contraste mucho más marcado
 * entre lo enfocado y lo que no. **No se persiguió un teñido de color** —
 * `visual-language.md` §4 prohíbe sin excepción teñir la obra con color de
 * marca — así que todo el contraste "vívido vs. apagado" que pedían las
 * referencias sale de este número solo: 0% de velo en el centro contra 40%+
 * en el borde. Si en dispositivo real se ve más "apagado" que "foco", el
 * repliegue documentado es bajar esto a 0.32, no tocar `CARD_DIM_RECEDE`
 * (otro eje, fuera de este cambio).
 */
export const DIM_PEEK = 0.4

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
 * vez) y `SCALE_FOCUS` (los dos efectos en su máximo) — así que el margen
 * relativo también lo es, y el peor caso (el margen más chico) es el mínimo
 * combinado, nunca un punto intermedio ni el máximo:
 *
 *   s_min = SCALE_PEEK × CARD_SCALE_RECEDE = 0.86 × 0.92 = 0.7912
 *
 * **Subió de 1.24 a 1.36** — `SCALE_PEEK` bajó (0.95→0.86) en el mismo
 * cambio que agregó este contraste más fuerte, y un `s_min` más chico exige
 * más sobra de imagen para no dejar ver el `Pressable` crudo detrás:
 *
 *   margen_por_lado = 200 × (1.36 × 0.7912 − 1) / 2
 *                    = 200 × (1.076032 − 1) / 2
 *                    = 200 × 0.038016
 *                    ≈ 7.60pt
 *
 * Positivo, con margen — nunca cero, nunca negativo. En alto: 266,67 ×
 * 0.038016 ≈ 10.14pt, más holgado todavía. Casos de un solo eje, para
 * contexto (el mínimo combinado sigue siendo el peor caso, estos dan más
 * margen):
 *
 *   horizontal solo, s = SCALE_PEEK = 0.86:
 *     200 × (1.36 × 0.86 − 1) / 2 ≈ 16.96pt
 *   foco máximo, s = SCALE_FOCUS = 1.04 (el otro eje también en su centro,
 *   `verticalScale = 1`):
 *     200 × (1.36 × 1.04 − 1) / 2 ≈ 41.44pt
 *
 * (El número de la spec de `interaction-designer` daba lo mismo en los tres
 * casos — esto es la verificación independiente que pide el Paso 2, hecha de
 * nuevo con los valores finales, no una copia de la de la spec.)
 */
export const IMAGE_OVERSCALE = 1.36

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
 * opacidad compuesta: nunca puede superar 1.
 *
 * Con `DIM_PEEK` en 0.4 (subió de 0.18 en el mismo cambio que este valor no
 * tocó), el extremo combinado da `1 − (1 − 0.4)(1 − 0.35) = 1 − (0.6)(0.65)
 * ≈ 0.61` — pasa el "nunca tapa la obra a la mitad" que valía con el
 * `DIM_PEEK` anterior. Se sostiene igual: ese extremo exige que una pieza
 * esté en el borde del snap horizontal Y en el borde vertical de pantalla a
 * la vez — por construcción, cuanto más lejos del centro en los dos ejes
 * juntos, menos foco de atención real recibe. Si en dispositivo real se ve
 * más "apagado" que "foco" en ese punto, el repliegue es bajar `DIM_PEEK` a
 * 0.32 (combinado → 0.56), no este valor — es de otro eje.
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
