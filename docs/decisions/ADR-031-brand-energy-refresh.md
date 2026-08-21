# ADR-031 — Acento de marca verde ácido y tipografía con más peso

**Estado:** Propuesto · **Fecha:** 2026-08-21 · **Responsable:** brand-designer ·
**Extiende:** [ADR-010](ADR-010-color-system.md) (paleta generada) y
[ADR-008](ADR-008-design-system.md) (design system) · **No toca:** la marca
gráfica (visual-language.md §3), `accentAlt`, ni ningún archivo de
`apps/mobile/src/design-system/tokens/`

## Contexto

El dueño de producto pidió explícitamente un cambio de identidad visual: no le
gusta la energía actual (cálida, editorial, de galería) y mandó capturas de
apps de moda / e-commerce — paletas de verde lima vibrante sobre negro,
tipografía bold, mucho contraste — confirmando que quiere esa paleta y esa
energía como dirección, no solo la estructura de esas pantallas.

Ese mismo dueño de producto había escrito antes, en el brief original de MESH:
"Do not create a visual copy of any existing app", "Avoid copying
Airbnb/Instagram literally", y en la sección de dirección visual: "Avoid
generic gradients... Tinder clones... Pinterest clones... Instagram clones...
generic AI-generated SaaS aesthetics. These are explicitly NOT the visual
identity of MESH." El pedido nuevo no anula el viejo: pide la *energía*
(audacia, alto contraste, tipografía con carácter), no una copia de la
pantalla de una app de ropa.

Este documento es la propuesta de dirección — el paso previo a tocar código.
No se editó ningún archivo de `tokens/`. Es lo que se le muestra al dueño de
producto antes de implementar.

## Lo que encontré antes de proponer nada

- **La paleta no se elige a ojo, se calcula.** `tools/brand/src/build-palette.mjs`
  define cada familia por un tono en OKLCH y resuelve la luminosidad exacta que
  necesita cada rol para pasar contraste. Cambiar el acento de marca es
  arquitectónicamente **cambiar un número de entrada** (el hue de `brand` en la
  tabla `FAMILIES`), no inventar hexadecimales nuevos. Reutilicé ese mismo
  solver (no lo reescribí) para probar candidatos.
- **El sistema ya tiene once familias cromáticas**, y cuatro de ellas —`dot`
  (75°), `gold` (95°), `letter` (130°), `hand` (160°)— ya ocupan justo la cuña
  amarillo-verde del círculo de tono donde vive un lima genuino. No hay un
  hueco libre ahí: cualquier verde lima nuevo va a caer cerca de alguna.
- **`theme.ts` hoy usa el mismo `accentFill` en los dos temas** (`brandVivid`,
  sin importar `dark`/`light`), a diferencia de `style-colors.ts`, que sí
  diferencia `vivid` (oscuro) de `deepVivid` (claro) para las diez familias de
  estilo. Con el rosa actual eso mide 3,61:1 contra papel — pasa 3:1 (objeto
  gráfico) pero no 4,5:1, un margen ya ajustado. Con un lima genuino ese mismo
  patrón mide **1,24:1** — no pasa ni el mínimo gráfico. El patrón compartido
  se rompe con este hue; hace falta diferenciar por tema.
- **Ya existe precedente de un rol de texto y un rol de relleno-claro
  colapsando casi al mismo valor**: `letterOnLight` (`#4F7909`) y
  `letterDeepVivid` (`#4E7900`) ya son casi idénticos hoy, sin que nadie lo haya
  tratado como error. Es una propiedad física de los tonos amarillo-verdes
  contra papel cálido, no un bug de esta propuesta.
- **Solo hay tres archivos de fuente empaquetados** hoy:
  `Fraunces-Regular.ttf` (wght 400, opsz 72), `InstrumentSans-Regular.ttf` y
  `InstrumentSans-Medium.ttf` (wght 500). React Native no expone los ejes de una
  variable font, así que cada peso nuevo es un corte estático nuevo que hay que
  generar con `tools/brand/src/build-fonts.py` a partir de las mismas variable
  fonts fuente (Fraunces, Instrument Sans — OFL, ya elegidas). **No hace falta
  una familia nueva.**
- **El logotipo ya usa un corte más pesado que el que corre en pantalla**:
  `MESH` en Fraunces wght 600, opsz 144 (visual-language.md §3) — más pesado
  que el `Fraunces-Regular` wght 400 opsz 72 que hoy usan `display`/`title`/
  `titleLg`. Ya existe, en la propia marca, la validación de que Fraunces
  aguanta más peso a tamaño grande.
- **Ya se probó y se descartó un Fraunces Medium a 24px** (comentario en
  `build-fonts.py`: "a 24px el Regular aguanta y el Medium pesa de más"). Esa
  decisión sigue siendo válida a ese tamaño — no la contradigo, la respeto:
  cualquier corte más pesado va solo al rol `display` (40px), no a `title`/
  `titleLg`.

## Problema

¿Cómo se traduce "verde lima vibrante sobre negro, tipografía bold" —lenguaje
visual de e-commerce de moda— a un mercado de tatuadores de Buenos Aires sin
(a) violar los innegociables de marca (nada de neón, nada de degradados, las
obras nunca se tiñen, el acento aparece como máximo una vez por pantalla), (b)
romper la arquitectura de color-como-información de ADR-010, y (c) traer una
tipografía nueva cuando la pareja actual ya está licenciada, embebida y es
parte de la identidad?

## Opciones — color

**A. Mantener el rosa (hue 12°) y sumar el verde solo como refuerzo tipográfico
o de layout.** No cumple lo que pidió el dueño de producto: confirmó
explícitamente que quiere esa paleta, no solo esa estructura.

**B. Reemplazar el hue de `brand` por un verde lima real, dentro del mismo
generador OKLCH.** El acento cambia, pero el mecanismo que lo produce y lo
verifica no se toca.

**C. Agregar un doceavo color "especial" fuera del sistema de familias, con un
hex elegido a mano.** Rompe dos reglas al mismo tiempo: ADR-010 dice que todo
hex sale del generador, y ADR-008 prohíbe cualquier hex fuera de `palette.ts`
por lint. Se descarta de plano.

## Opciones — tipografía

**A. Traer una tercera familia**, un grotesco bold/condensado parecido al de
las capturas. Es lo más fiel a la referencia, y es exactamente lo que el
propio brief del dueño de producto pidió evitar: una copia visual de otra app.
También diluye una decisión de identidad ya tomada (Fraunces + Instrument
Sans, ver `brand-identity`) y agrega peso al bundle sin necesidad.

**B. Extender los cortes estáticos ya generados con pesos que ya existen en las
mismas variable fonts fuente.** Nada nuevo que aprender, nada nuevo que
licenciar, y reutiliza una decisión de peso que la propia marca ya validó (el
logotipo en wght 600).

## Decisión

Opción **B** en los dos casos.

### 1 · Color

`brand` pasa de **hue 12° (rosa)** a **hue 122° (lima ácido)**, calculado con
el mismo `build-palette.mjs`, sin tocar el resto de las diez familias de
estilo ni `accentAlt` (violeta, "esto es tuyo").

El relleno (`vivid`) de `brand` deja de compartir la luminosidad fija 0,62 que
usan las diez familias de estilo, y pasa a resolverse a **L = 0,87**. Es una
excepción deliberada, y es la única: `brand` no es un chip entre iguales como
`line` o `shade` — es el único elemento al que se le permite ser lo más audaz
de la pantalla, una vez. Los roles de texto (`onDark`/`onLight`) siguen la
física de siempre: para pasar 4,5:1 tienen que aclararse, y aclararse les saca
saturación. Por diseño, el lima solo se ve realmente "lima" en el relleno —
nunca en un renglón de texto. Eso es lo que evita que el acento se convierta en
texto verde por todos lados.

`theme.ts` deja de usar el mismo `accentFill` en los dos temas y empieza a
diferenciar por tema — el mismo patrón que `style-colors.ts` ya usa para las
diez familias de estilo, aplicado por primera vez también al acento singular
de marca:

- Oscuro: `accentFill = brandVivid` (el lima real, L alto).
- Claro: `accentFill = brandDeepVivid` (verde oscuro saturado, no el lima —
  el lima real no se distingue del papel).
- `accentContrast` pasa a depender del tema también: tinta (`ink900`) sobre el
  lima en oscuro, papel (`paper100`) sobre el verde oscuro en claro. El campo
  ya existe en el tipo `Theme`; es un cambio de valor, no de forma.

### 2 · Tipografía

Sin familia nueva. Dos cortes estáticos más, generados con
`tools/brand/src/build-fonts.py` a partir de las mismas variable fonts fuente:

- **`Fraunces-SemiBold.ttf`** — `{wght: 600, opsz: 144, SOFT: 0, WONK: 0}`,
  exactamente los ejes que ya usa el logotipo. Se usa **solo** en el rol
  `display` (40px — revelación del gusto, momentos de marca, la propia marca de
  carga). `title` y `titleLg` (24–30px) se quedan en `Fraunces-Regular`: ese
  veredicto ya se probó con el Medium y sigue siendo válido a ese tamaño.
- **`InstrumentSans-Bold.ttf`** — `{wght: 700, wdth: 100}`. Se usa para la
  etiqueta de los botones primarios y las pestañas activas — donde hoy corre
  `sansMedium`. Sigue siendo tamaño `label` (13px): no cambia la escala, cambia
  el peso en un lugar puntual.

**wdth** (ancho) queda fuera de esta propuesta. Instrument Sans declara un eje
de ancho, pero no puedo confirmar su rango real sin bajar el archivo fuente y
mirar su tabla `fvar` — y no voy a inventar un valor de "condensado" sin
verificarlo. Si al generar los cortes el rango da margen real para achicar el
ancho sin perder legibilidad a 13px, se suma ahí; si no, la energía "bold" se
consigue con peso y no con ancho forzado.

### 3 · Lo que no cambia

- El símbolo de marca (dos trazos que se cruzan) — sigue en un solo color,
  ink/paper, sin acento, sin gradiente. Este es un rebrand de paleta y
  tipografía, no de la marca gráfica.
- `accentAlt` (violeta, hue 295°) y las diez familias de estilo.
- Las superficies neutras (`ink900`/`paper100` y su escala) — siguen siendo
  mezclas de tinta y papel, no gris puro ni negro puro, para que la piel se
  siga viendo como piel.
- El límite serif ≥24px / sans ≤20px.

## Por qué así

**Por qué hue 122° y no más lejos de `letter` (130°).** Probé varios puntos
entre 108° y 132°. Toda la cuña 75°–160° ya está ocupada por cuatro familias de
estilo reales; no existe un hue en esa zona que quede "libre". A 122° el texto
del acento (`#718C01` oscuro / `#5F7500` claro) queda visualmente cerca del
texto de `letter` (`#60901A` / `#4F7909`) — es una tensión real, no
imaginaria. La resuelvo recomendando, como tarea de seguimiento de bajo costo,
correr el rango de `letter` de 130° a ~144° en `build-palette.mjs` y
regenerar: es una línea en una tabla, y el generador vuelve a verificar
contraste solo. `letter` no es una decisión de marca —es una de once
asignaciones arbitrarias de hue a estilo— mientras que el acento nuevo sí lo
es. No lo hago en este documento: es un cambio de código, y este documento no
toca tokens.

**Por qué el relleno del acento no comparte la fórmula de las familias de
estilo.** El sistema de estilo depende de que "ninguna familia grite más
fuerte que otra" (ADR-010) — por eso todas comparten croma 0,15 y L 0,62. El
acento de marca tiene el trabajo opuesto: tiene permiso de ser lo más fuerte de
la pantalla, una vez. Encerrarlo en la misma fórmula que un chip de estilo
produce el verde oliva apagado que salió en las primeras pruebas —correcto para
un chip, no para "verde lima vibrante". Subir la L a 0,87 es lo que separa un
lima real (`#BEE800`) de un verde mostaza (`#639900`). Es la misma clase de
excepción que ya existía: el rosa original ya tenía croma 0,19 en vez del 0,15
por defecto, precisamente porque el acento de marca necesita más color que un
chip de estilo.

**Por qué la versión clara no puede ser el mismo lima que la oscura.** Un lima
a L=0,87 mide 1,24:1 contra `paper100` — casi invisible como forma sobre la
página. No es una preferencia estética: es el mismo tipo de error de contraste
invisible a ojo que ya documentó ADR-008 (el acento del brief original medía
2,7:1 y lo encontró un test, no una revisión). Por eso el tema claro usa
`brandDeepVivid`, no `brandVivid` — el rol que existe justo para esto.

**Por qué el lima funciona sobre fotografía de tatuaje real y no solo sobre
moda.** El tono de piel es cálido (rojo-naranja), y el lima (amarillo-verde)
es casi complementario en la rueda de color — se separa con claridad de la piel
y del trabajo en tinta negra sin necesitar brillo ni superposición. No compite
con la obra porque nunca la toca: el acento vive en el cromo alrededor de la
imagen (botones, indicadores, la marca de carga), nunca sobre ella — la regla
de "las obras nunca se tiñen" no cambia con este acento, y es la que más fácil
se rompe por accidente si a alguien se le ocurre poner un halo de lima detrás
de una miniatura.

**Por qué el peso nuevo de Fraunces usa exactamente los ejes del logotipo.** No
es una coincidencia conveniente: es la forma más barata de ganar peso editorial
sin crear una segunda "voz" tipográfica dentro de la misma familia. El momento
más grande de texto en pantalla (`display`) termina pesando lo mismo que la
palabra "MESH" — hay una relación de familia entre el texto más importante y la
marca, que hoy no existe (hoy `display` es más liviano que el propio
logotipo).

## Paleta final — valores reales, verificados contra `contrast.ts`

Corrí `contrastRatio()` de `apps/mobile/src/design-system/contrast.ts`
directamente (no una reimplementación) sobre cada par. Resultados:

| Rol | Tema | Hex | Contra | Ratio | Mínimo | Resultado |
|---|---|---|---|---|---|---|
| `accent` (texto) | oscuro | `#718C01` | `ink800` `#1A1A1D` | 4,51:1 | 4,5 (AA texto) | Pasa |
| `accent` (texto) | claro | `#5F7500` | `paper100` `#F4EFE6` | 4,55:1 | 4,5 (AA texto) | Pasa |
| `accentContrast` sobre `accentFill` | oscuro | `ink900` `#0C0C0E` | `accentFill` `#BEE800` | 13,71:1 | 4,5 (AA texto) | Pasa, con margen amplio |
| `accentContrast` sobre `accentFill` | claro | `paper100` `#F4EFE6` | `accentFill` `#5F7500` | 4,55:1 | 4,5 (AA texto) | Pasa |
| `accentFill` vs superficie | oscuro | `#BEE800` | `ink900` `#0C0C0E` | 13,71:1 | 3,0 (AA gráfico) | Pasa, con margen amplio |
| `accentFill` vs superficie | claro | `#5F7500` | `paper100` `#F4EFE6` | 4,55:1 | 3,0 (AA gráfico) | Pasa |
| *(control)* mismo relleno en los dos temas | — | `#BEE800` | `paper100` `#F4EFE6` | 1,24:1 | 3,0 (AA gráfico) | **Falla** — confirma por qué hace falta diferenciar por tema |

### Tabla de tokens propuesta

| Token (`palette.ts`) | Hex | De dónde sale |
|---|---|---|
| `brandOnDark` | `#718C01` | hue 122°, croma 0,20, resuelto ≥4,5:1 contra `ink800` |
| `brandOnLight` | `#5F7500` | hue 122°, croma 0,20, resuelto ≥4,5:1 contra `paper100` |
| `brandVivid` | `#BEE800` | hue 122°, L=0,87 (excepción de familia), croma al borde del gamut |
| `brandDeepVivid` | `#5F7500` | hue 122°, resuelto hacia abajo hasta pasar `paper100` encima |

| Token (`theme.ts`) | Oscuro | Claro |
|---|---|---|
| `accent` | `#718C01` | `#5F7500` |
| `accentFill` | `#BEE800` | `#5F7500` |
| `accentAltFill` | — | `#5F7500` |
| `accentContrast` | `ink900` `#0C0C0E` | `paper100` `#F4EFE6` |

`brandDeepVivid` y `brandOnLight` dan el mismo hex (`#5F7500`). No es un error:
es la misma convergencia física que ya existe hoy entre `letterOnLight`
(`#4F7909`) y `letterDeepVivid` (`#4E7900`) — a esta zona del círculo de tono,
contra papel cálido, el mínimo para pasar AA y el máximo de croma caen casi en
el mismo punto.

## Principios de energía — qué se traduce y qué no

| Se traduce | Por qué |
|---|---|
| Alto contraste ink900/lima en el único CTA por pantalla | Es la energía que pidieron, aplicada al innegociable de "una vez por pantalla" en vez de en contra de él |
| Tipografía display más pesada (Fraunces SemiBold, opsz 144) | Reutiliza el peso que el logotipo ya valida, no importa una voz nueva |
| Etiquetas de botón en Instrument Sans Bold | Gana peso sin subir de tamaño ni tocar la escala de 20px |
| Confianza en el negro cálido como superficie por defecto | Ya era la decisión del tema oscuro (visual-language.md §4); este acento la hace más evidente, no la inventa |

| No se traduce | Por qué, en una frase |
|---|---|
| Brillo / halo (glow, blur) alrededor del lima o del texto | MESH no usa sombras para dar profundidad — sobre una superficie oscura cálida se ven como suciedad, y un halo es lo mismo con otro nombre |
| Verde como color de fondo o superficie dominante | El acento marca una acción, no pinta la pantalla — "una vez por pantalla" sigue siendo literal |
| Negro puro (#000000) como superficie de trabajo | `ink900` (#0C0C0E) es tinta cálida a propósito, para que la piel se vea como piel; negro puro + neón es exactamente el registro de gaming/cripto que la marca rechaza |
| Degradados lima→negro | Prohibidos en la marca sin excepción, y el único degradado que existe en el producto (la revelación del gusto) ya está resuelto con `accent`/`accentAlt`, no se toca acá |
| Un grotesco condensado nuevo | Ya existe una pareja tipográfica con identidad propia; traerla es copiar la superficie de la referencia, no su energía |
| Color sobre o alrededor de la obra | Las obras nunca se tiñen — la regla no se relaja porque el acento nuevo sea más tentador de usar como halo decorativo |

## Consecuencias

- **`letter` (130°) queda a solo 8° de este acento nuevo.** Recomiendo, como
  tarea de seguimiento antes o junto con la implementación, correr su hue a
  ~144° en `build-palette.mjs` y regenerar. Es una línea de código; el
  generador reverifica el contraste solo.
- **`brand-identity` (skill) y `visual-language.md` van a quedar
  desincronizados** apenas se implemente esto — y `brand-identity` ya está
  desincronizado hoy: describe un sistema de un solo acento (`signal` rojo,
  `#9C2D40`) que el código ya reemplazó por completo con el sistema de once
  familias de ADR-010. Ese arreglo no es parte de este ADR, pero hay que
  encararlo en el mismo momento en que se implemente este rebrand, no después.
- **Los tests de tokens van a fallar en rojo hasta que se actualicen.**
  `theme.test.ts`, `tokens.test.ts` y `style-colors.test.ts` probablemente
  tienen valores esperados hardcodeados contra el rosa actual.
- **Este documento no incluye el pase de movimiento/microinteracciones** que
  el dueño de producto ya adelantó que quiere después. Ese pase entra sobre
  esta paleta, no la reemplaza — nada acá cierra esa puerta: `motion.ts` no se
  tocó, y el techo de 500ms y la ausencia de shadows siguen intactos.
- **Implementación, en orden:** (1) editar `FAMILIES` en `build-palette.mjs`
  (hue de `brand` a 122, `vividL` de excepción a 0,87 — hoy ese campo no existe
  en el generador, hay que agregarlo); (2) correr `npm run brand:palette`; (3)
  actualizar `theme.ts` para diferenciar `accentFill`/`accentContrast` por
  tema; (4) bajar las variable fonts fuente y generar los dos cortes nuevos con
  `build-fonts.py`; (5) registrar las dos familias nuevas en `app/_layout.tsx`
  y usarlas en `typography.ts` solo en `display` y en el label de `Button`;
  (6) correr `npm run brand:palette:check` y la suite de tests de tokens; (7)
  recién ahí, mostrarlo corriendo en los dos temas antes de dar la tarea por
  terminada.

## Cuándo revisitar

Si se corre el hue de `letter` y en el futuro se agrega una categoría nueva a
MESH (ver ADR-010, "cuándo revisitar"), la cuña amarillo-verde del círculo de
tono va a estar todavía más ocupada. En ese momento vale la pena evaluar si
compensa separar el acento de marca del espacio de hue de las familias de
estilo por completo, en vez de convivir con él.
