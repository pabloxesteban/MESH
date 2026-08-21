# ADR-032 — Negro real, acento recurrente, un degradado y tipografía más grande

**Estado:** Propuesto · **Fecha:** 2026-08-21 · **Responsable:** brand-designer ·
**Enmienda:** [ADR-031](ADR-031-brand-energy-refresh.md) (acento lima,
tipografía con más peso) y, en la lectura literal de "una vez por pantalla",
[ADR-010](ADR-010-color-system.md) §4 · **Extiende:** el mismo generador OKLCH
de `tools/brand/src/build-palette.mjs` y el mismo test de contraste de
`apps/mobile/src/design-system/contrast.ts` · **No toca:** la marca gráfica
(`visual-language.md` §3), el innegociable 3 de `CLAUDE.md`, ni ningún archivo
de `apps/mobile/src/design-system/tokens/`

## Contexto

ADR-031 ya está implementado — `palette.ts`, `theme.ts` y `typography.ts`
corren hoy con el acento lima (hue 122°) y los dos cortes tipográficos más
pesados. El dueño de producto lo probó en la app y, por segunda vez seguida,
dijo que no alcanza: *"la app no cambió mucho en comparación a las imágenes que
te mandé, quiero un rebranding que se note más en cuanto a colores, letras y
animaciones [...] que se sienta moderno [...] hacelo ver como una empresa de
verdad"*.

Esto no es un pedido nuevo — es el mismo pedido de ADR-031, con la información
de que ADR-031 fue tímido donde tenía que ser audaz. Tres de sus propias
restricciones son, releídas con esa información, exactamente lo que impide que
el cambio se note:

1. El fondo (`ink900 #0C0C0E`) es prácticamente el mismo tono que tenía antes
   del acento — un rebrand de color que no toca el 80% de cada pantalla no se
   siente como rebrand.
2. La regla "el acento aparece como máximo una vez por pantalla" (heredada
   literalmente de antes de que existiera el sistema de once familias, y ya
   discutida una vez en ADR-010 §4) sigue leyéndose como un solo botón por
   pantalla. En las imágenes de referencia el lima aparece en chips activos,
   indicador de tab, bordes de selección, badges y cifras — no una vez, muchas
   veces, como firma.
3. No hay un solo degradado en el sistema, aunque `docs/design/trends-2026.md`
   (investigación ya hecha, del 2026-08-18) lo identifica como la tendencia
   central de 2026 junto con el propio fondo oscuro: *"MESH ya estaba en
   oscuro por la razón correcta [...] y le faltaba justamente la otra mitad"*.
   Esa otra mitad —acentos vívidos y brillos sutiles, "Dark Mode 3.0"— nunca se
   construyó.

Este documento hace esas tres cosas, y empuja la tipografía un escalón más allá
de donde llegó ADR-031, dentro de las mismas herramientas (el mismo solver
OKLCH, el mismo test de contraste, la misma pareja tipográfica).

**Lo que no cambia, porque no es una decisión de estética.** El innegociable 3
de `CLAUDE.md` — nada de rachas, puntos, niveles, urgencia falsa — no está en
discusión. "Moderno y audaz" es sobre cómo se ve la interfaz, no sobre qué
mecánica de producto contiene. `docs/design/trends-2026.md` §4 ya hizo esa
separación con fuentes y no hace falta reabrirla acá. Tampoco cambia que las
obras de los artistas nunca se tiñen: el color se vuelve más audaz *alrededor*
de la obra, nunca sobre ella — esa frontera se vuelve más importante cuanto más
tentador es el acento nuevo, no menos.

## Lo que encontré antes de proponer nada

- **El seguimiento de ADR-031 ya se hizo.** `letter` corre hoy en hue 144°
  (`build-palette.mjs`, `FAMILIES`), no en 130° — la recomendación de ADR-031
  para separarlo del acento de marca (122°) ya está en el código. No hay nada
  pendiente de esa ADR salvo lo que este documento decide ahora.
- **`expo-linear-gradient` ya está instalado y sin usar.** Está en
  `apps/mobile/package.json` (`~57.0.1`, alineado con el SDK) y en
  `package-lock.json`, pero no aparece importado en ningún componente de
  `apps/mobile/src`. Proponer un degradado no agrega una dependencia nueva —
  usa una que ya está en el bundle, esperando.
- **`role="display"` ya es una pantalla real, no solo la revelación del gusto
  futura.** Corre hoy en `IntentScreen.tsx` (la primera pregunta que ve
  cualquier persona nueva: "¿ofrecés o buscás?"), en `ProfileScreen.tsx`, en
  `AgeScreen.tsx` y en `StudioScreen.tsx`. Esto importa porque significa que
  subir el tamaño de `display` y agregar el degradado de héroe **se ve en el
  primer minuto de cualquier persona nueva**, no en una pantalla detrás de una
  compuerta de producto.
- **La pantalla de "revelación del gusto" en sí sigue sin existir en el
  código** — solo hay tokens de movimiento (`reveal`, `STAGGER`) y menciones en
  la documentación. `CLAUDE.md` (D-010) es explícito: el motor de gusto está
  versionado pero "hoy ninguna pantalla de quien busca lo ejecuta", y volver a
  enchufarlo es una decisión de producto aparte. Este documento no la toma. Lo
  que sí hace es dejar el primitivo de degradado listo para esa pantalla el día
  que D-010 se revise, y mientras tanto lo aplica a algo que **sí** existe hoy.
- **No hay un utilitario de alfa en el design system.** `overlayScrim` es un
  color sólido (`ink900`/`ink900` en los dos temas), no una versión translúcida
  de otro token. Para el degradado hace falta un patrón nuevo: un string de
  hex con sufijo de alfa construido en runtime a partir de un token existente
  (`` `${palette.brandVivid}47` ``), nunca un hex nuevo escrito a mano. Es la
  misma disciplina de ADR-008, aplicada a un caso que hasta ahora no existía.
- **La investigación sobre variable fonts en Expo/RN se hizo de nuevo, no se
  asumió.** El comentario en `typography.ts` y `build-fonts.py` ya afirmaba que
  React Native no expone los ejes de una variable font — confirmé que sigue
  siendo así en agosto de 2026: `fontVariationSettings` tiene una propuesta
  activa y sin resolver en `react-native-community/discussions-and-proposals`
  (issues #829 y #976), y la documentación de Expo sigue recomendando fuentes
  estáticas para soporte completo en iOS/Android — variable funciona en web,
  no de forma confiable en nativo. **Cortes estáticos siguen siendo la única
  opción real**, igual que en ADR-031.
- **`Fraunces-SemiBold.ttf` ya se generó con `opsz: 144`** — el extremo superior
  del eje de tamaño óptico de Fraunces, pensado para texto bastante más grande
  que los 40px que usa hoy `display`. Subir el tamaño de `display` no es
  forzar la fuente a hacer algo nuevo: es acercar el tamaño real al tamaño para
  el que ese corte ya se instanció.
- **Corrí `contrastRatio()` de `contrast.ts` directamente** (no una
  reimplementación, igual que ADR-031) para verificar cada valor nuevo de este
  documento — ver la tabla al final.

## Problema

¿Cómo se hace que el rebrand **se note** —fondo, acento recurrente, un
degradado real, tipografía más grande— sin cruzar a negro puro + neón
(el registro de gaming/cripto que la marca ya rechazó explícitamente), sin que
el acento se vuelva ruido decorativo, sin tocar la obra de los artistas, y sin
salir del mismo mecanismo verificable (solver OKLCH, test de contraste) que ya
evitó dos veces un color que se ve bien y mide 2,6:1?

## Opciones — fondo

**A. Dejar `ink900` como superficie por defecto y subir la saturación de otra
cosa.** Es la opción que ya se probó en ADR-031 y es exactamente lo que el
dueño de producto dijo que no alcanza. Se descarta por evidencia directa.

**B. Reemplazar `ink900` por negro puro (`#000000`) como superficie por
defecto.** Es lo que ADR-031 rechazó explícitamente ("el registro de
gaming/cripto que la marca rechaza") y esa razón sigue siendo válida: un negro
sin ninguna calidez, en una app que muestra piel y tinta negra real, aplana la
fotografía y empuja el sistema hacia el anti-patrón que `visual-language.md` §2
pone del lado de "No somos" (Cripto, Startup de IA).

**C. Agregar `ink950` — un neutro nuevo entre `ink900` y `black`, mucho más
cerca de negro real, que conserva la misma dirección de matiz que el resto de
la escala — y usarlo como superficie por defecto del tema oscuro.** `black`
(`#000000`, ya existe, sin usar como superficie por defecto — hoy es
`surfaceSunken`) queda intacto y reservado para el hueco más profundo, que es
el rol que ya tenía.

## Decisión — fondo

Opción **C**.

`ink950 = #040406` — continúa la misma proporción de canal que ya tiene
`ink900` (`#0C0C0E`: R=G, B levemente más alto) escalada hacia abajo, en vez de
saltar a un negro acromático. Pasa a ser `surface` en el tema oscuro.
`surfaceRaised` se queda en `ink800` sin cambios: la tarjeta salta más —de
`#040406` a `#1A1A1D`— que antes —de `#0C0C0E` a `#1A1A1D`—, así que la
elevación se **nota más**, no menos. `surfaceSunken` se queda en `black`
(`#000000`) sin cambios: sigue siendo el hueco más profundo, un nivel completo
por debajo de la superficie base.

Orden final de la escala oscura, de más profundo a más elevado:
`surfaceSunken (black, #000000)` < `surface (ink950, #040406)` <
`surfaceRaised (ink800, #1A1A1D)`. Es la misma relación de tres niveles que ya
existía, corrida un escalón entero hacia el negro real.

El tema claro no cambia: "OLED real" es un concepto de superficie oscura, y
`paper100` sigue siendo la superficie por defecto de ese tema.

## Opciones — regla del acento

**A. Dejar la regla de ADR-010 tal cual** ("el acento aparece como máximo una
vez por pantalla"). Es, literalmente, la regla que el dueño de producto señaló
como parte de por qué el cambio no se nota: en las imágenes de referencia el
acento vive en varios lugares de sistema a la vez.

**B. Borrar el límite por completo.** Sin ningún tope, el acento se convierte
en decoración disponible para cualquier cosa, que es exactamente el "carnaval"
que ADR-010 ya identificó como riesgo del sistema de once familias. Se
descarta: resolver "no se nota" con "en todos lados" no es una regla, es
ausencia de regla.

**C. Partir el acento en dos registros con criterios distintos: uno recurrente
(estado/identidad) y uno que sigue limitado a uno por pantalla
(acción/protagonismo).** Cada aparición tiene que responder una pregunta real
("¿qué está seleccionado, activo, o es un número que importa?"), nunca
decorar, y nunca tocar la obra.

## Decisión — regla del acento

Opción **C**. La regla de `visual-language.md` §4 ("el acento aparece como
máximo una vez por pantalla") queda reemplazada por dos reglas:

### 1 · Acento de estado — recurrente, sin tope de cantidad

Marca **qué está seleccionado, activo, o es una cifra que importa** —nunca
decoración, nunca relleno de página. Puede haber varios a la vez en la misma
pantalla, porque cada uno responde una pregunta distinta. Ejemplos concretos de
MESH:

| Dónde | Qué lleva el acento |
|---|---|
| Tab activo de la barra inferior | Ícono y label en `accent` (texto), no `accentFill` — es un ícono chico, no un relleno |
| Chip de filtro seleccionado (p. ej. un estilo elegido como filtro, no listado) | Borde en `accentFill`, label en `accent` |
| Borde de foco de un `Input` con el teclado abierto | `accentFill` como `borderColor`, reemplazando el foco neutro de hoy |
| Cifra destacada de sistema — huecos libres esta semana (ADR-018), "N guardados" en una colección (ADR-030) | El número en `accent` (texto), nunca el resto de la oración |
| Badge de un aviso sin leer (ADR-027) | Punto o contador pequeño en `accentFill` |
| Punto activo de un paginador o carrusel | `accentFill` |

Nunca en: fondo de una tarjeta completa, halo o borde alrededor de una
miniatura de obra, texto de párrafo, o como reemplazo del color de una familia
de estilo (`line`, `shade`, `dot`...) — esas siguen siendo suyas, el acento no
les gana por encima.

### 2 · Acento de acción — sigue siendo único por pantalla

El **único** botón/CTA primario de la pantalla —la siguiente acción más
importante que se puede tomar ahora mismo— sigue siendo el único elemento con
permiso de llevar `accentFill` como relleno grande con `accentContrast`
encima. Esta es la parte de la regla vieja que no se negocia: si dos botones
compitieran por relleno de acento a la vez, ninguno se leería como "el"
siguiente paso. `Button` primary y su `labelBold` (ADR-031) siguen siendo la
única combinación con ese permiso.

**La frontera que no se mueve, dicho una vez más porque es la que más fácil se
rompe con un acento más disponible:** ninguna de las dos reglas autoriza tocar
la obra. Ni un halo detrás de una miniatura, ni un borde de color sobre una
foto, ni un velo teñido. `visual-language.md` §4 ya lo dice y sigue intacto:
"las obras nunca se tiñen, ni se superponen con un color de marca, ni reciben
un borde de color."

## Opciones — degradado

**A. No agregar ninguno.** Es lo que hace ADR-031 hoy, y el propio reporte de
tendencias (`trends-2026.md`) ya identificó el degradado cinematográfico como
la pieza que falta junto con el fondo. Insistir en cero degradados mientras se
pide "que se note" es la misma inconsistencia que el fondo sin cambiar.

**B. Un degradado de marca completo —lima a negro, o lima a violeta— aplicado
como fondo de pantalla o de tarjetas.** Es lo que `visual-language.md` prohíbe
sin excepción ("Degradados en la marca") y lo que ADR-031 ya descartó
("Degradados lima→negro: Prohibidos en la marca sin excepción"). Se descarta
de plano: la marca gráfica y sus superficies de sistema no llevan degradado,
un hero puntual sí puede.

**C. Un degradado de héroe, puntual y acotado: acento al borde de un área
chica, apagándose a transparente antes de tocar el contenido de abajo — el
patrón que el propio reporte de tendencias recomienda ("acento fuerte contra
fondo neutro, un gradiente en el hero que se apaga hacia el contenido
limpio").** Nunca sobre una tarjeta, nunca sobre una miniatura, nunca como
fondo permanente de una pantalla completa.

## Decisión — degradado

Opción **C**. Se agrega un primitivo de dos temas, `heroGlow`, construido
sobre tokens existentes (nunca un hex nuevo):

```ts
// theme.ts — PROPUESTO, no implementado en este documento
readonly heroGlow: {
  readonly colors: readonly [string, string]
  readonly locations: readonly [number, number]
}
```

```ts
darkTheme.heroGlow = {
  colors: [`${palette.brandVivid}47`, 'transparent'],   // 28% → 0%
  locations: [0, 0.55],
}
lightTheme.heroGlow = {
  colors: [`${palette.brandDeepVivid}29`, 'transparent'], // 16% → 0%
  locations: [0, 0.55],
}
```

`'transparent'` es la palabra reservada de React Native, no un hex — no
necesita vivir en `palette.ts`. El sufijo de alfa (`47` = 28%, `29` = 16%) se
concatena en runtime sobre un token ya existente, nunca se escribe un hex
nuevo a mano.

**Dónde se usa hoy, sin esperar a que exista la pantalla de gusto:**
`IntentScreen.tsx` — la primera pregunta que ve cualquier persona nueva
("¿ofrecés o buscás?"). Un `LinearGradient` de `expo-linear-gradient`,
posicionado en absoluto detrás del `Text role="display"`, ocupando
aproximadamente el 45% superior de la pantalla, `pointerEvents="none"`, con
dirección de arriba hacia abajo (`start: {x:0,y:0}`, `end: {x:0,y:1}`). El
degradado se apaga por completo antes de llegar a las dos tarjetas de elección
—nunca las toca, nunca compite con su texto.

**Dónde se usa después, condicionado a D-010:** el encabezado de la pantalla de
revelación del gusto, cuando (y si) esa pantalla se construya —
`trends-2026.md` ya la señaló como el lugar correcto— y las barras por estilo
de esa misma pantalla, con un degradado corto de cada `vivid` de familia hacia
transparente en el borde de avance de la barra mientras crece. Este documento
no reabre D-010: deja el primitivo listo, no la pantalla.

**Por qué 28% en oscuro y 16% en claro, no un número más alto.** Verificado
contra `contrastRatio()`: el pico del degradado (el punto más saturado, en
`location: 0`) tiene que convivir con el título `display` que se dibuja
encima, así que se buscó el alfa más alto que deja el contraste del texto
claramente por encima del mínimo, no apenas encima de él. En oscuro, 28% dejó
`textPrimary` en 9,18:1 contra el punto más intenso del degradado —el doble
del mínimo de 4,5:1, margen para variación real de pantalla—, mientras que 50%
ya cae a 4,47:1 y no pasa. En claro, un lima oscuro sobre papel se ve más
apagado por naturaleza (no hay negro de fondo contra el que "prender"), así
que ahí el techo es más bajo: 16% da 13,91:1, de sobra.

## Opciones — tipografía

**A. Traer el eje óptico de Fraunces como variable font en tiempo de
ejecución**, para que `display` escale de forma continua en vez de con cortes
fijos. Investigado y descartado: `fontVariationSettings` en React Native sigue
sin soporte confiable en nativo en agosto de 2026 (propuesta activa y sin
resolver en `react-native-community/discussions-and-proposals` #829 y #976;
funciona en web, no de forma consistente en iOS/Android), y la documentación
de Expo sigue recomendando cortes estáticos para soporte completo en las dos
plataformas nativas. Forzarlo sería repetir el error que el brief original ya
dejó una vez con un color a ojo: una promesa que no se sostiene en todos los
dispositivos.

**B. Quedarse con `display` en 40/44 y mover la audacia a otro lado
(color, degradado).** Es insistir en la misma escala que ya se probó
insuficiente. Se descarta.

**C. Subir `display` a un tamaño más grande, con tracking más ajustado,
dentro del mismo corte estático ya generado (`Fraunces-SemiBold`, sin generar
un archivo nuevo).**

## Decisión — tipografía

Opción **C**.

`display`: **40/44 → 48/52**, `letterSpacing`: **-0,4 → -0,8**.

No hace falta correr `build-fonts.py` de nuevo: `Fraunces-SemiBold.ttf` ya se
instanció con `opsz: 144`, el extremo del eje óptico de Fraunces, pensado para
texto bastante más grande que 40px. Subir el tamaño a 48px acerca el tamaño de
uso al tamaño para el que el corte ya está optimizado, en vez de alejarlo — es
un cambio de dos números en `typography.ts`, no una fuente nueva.

`titleLg` (nombre del artista en el perfil, títulos de pantalla): tracking
**-0,2 → -0,35**. Solo el tracking — tamaño (30px) y peso (`Fraunces-Regular`)
se quedan igual. El veredicto de ADR-031 sobre un peso mayor a 24-30px
(Medium probado y descartado en `build-fonts.py`) sigue vigente y no se
reabre acá: esto es tracking, no peso.

`title` (24px, el piso de la escala serif) se queda exactamente igual —
tamaño, tracking y peso. Es el escalón más chico donde la serif todavía puede
vivir (`visual-language.md` §5: "la serif nunca por debajo de 24px"); ajustar
ahí es el lugar con menos margen para error de legibilidad y el que menos se
nota en una pantalla completa.

**Advertencia honesta, como la que ya escribió ADR-031 sobre el Medium a
24px:** -0,8 de tracking a 48px es una decisión razonada (duplica la relación
proporcional que ya tenía `display`, de ≈-1% a ≈-1,7%, un salto moderado para
un serif editorial y no agresivo como el de un grotesco condensado) pero no
está mirada en specimen todavía. Antes de dar el valor por final, correr
`npm run brand:specimen` con el tamaño y el tracking nuevos — el mismo paso
que ya usó ADR-031 para descartar el Medium a 24px.

**Sobre `labelBold` (ADR-031):** no cambia de tamaño ni de fuente. Lo que
cambia es dónde se usa: la regla nueva del acento (arriba) extiende `labelBold`
al label del tab activo y al de un chip seleccionado, además del botón
primario — el peso tipográfico refuerza el mismo lugar donde ya aparece el
color, en vez de vivir en un solo botón. No hace falta generar
`InstrumentSans-Bold.ttf` de nuevo: ya existe.

## Paleta y tipografía — valores reales, verificados

Corrí `contrastRatio()` de `apps/mobile/src/design-system/contrast.ts`
directamente sobre cada par nuevo o modificado.

| Rol | Tema | Hex / valor | Contra | Ratio | Mínimo | Resultado |
|---|---|---|---|---|---|---|
| `surface` (nuevo `ink950`) | oscuro | `#040406` | `black` `#000000` | 1,03:1 | — (visualmente fundido a propósito) | — |
| `textPrimary` vs `surface` | oscuro | `paper100` `#F4EFE6` | `ink950` `#040406` | 17,89:1 | 4,5 (AA texto) | Pasa (antes 17,06:1 contra `ink900`) |
| `textSecondary` vs `surface` | oscuro | `paper300` `#C9C2B6` | `ink950` `#040406` | 11,58:1 | 4,5 | Pasa |
| `textTertiary` vs `surface` | oscuro | `paper400` `#B3ABA0` | `ink950` `#040406` | 9,02:1 | 4,5 | Pasa |
| `accent` (texto) vs `surface` | oscuro | `#718C01` | `ink950` `#040406` | 5,32:1 | 4,5 | Pasa (antes 5,08:1 contra `ink900`) |
| `accentFill` vs `surface` | oscuro | `#BEE800` | `ink950` `#040406` | 14,37:1 | 3,0 (AA gráfico) | Pasa, con margen amplio |
| `borderStrong` vs `surface` | oscuro | `ink400` `#6F6D74` | `ink950` `#040406` | 4,01:1 | 3,0 (AA gráfico) | Pasa |
| `accentFill` vs `surfaceRaised` (foco / borde de chip) | oscuro | `#BEE800` | `ink800` `#1A1A1D` | 12,18:1 | 3,0 (AA gráfico) | Pasa, con margen amplio |
| `heroGlow` pico (28%) vs `textPrimary` encima | oscuro | blend `#384404` | `paper100` `#F4EFE6` | 9,18:1 | 4,5 (AA texto) | Pasa, el doble del mínimo |
| *(control)* `heroGlow` al 50% | oscuro | blend `#617603` | `paper100` `#F4EFE6` | 4,47:1 | 4,5 | **Falla** — confirma por qué el techo es 28%, no más |
| `heroGlow` pico (16%) vs `textPrimary` encima | claro | blend `#DCDBC1` | `ink900` `#0C0C0E` | 13,91:1 | 4,5 (AA texto) | Pasa, con margen amplio |

### Tabla de tokens propuesta

| Token (`palette.ts`, agregar a `NEUTROS`) | Hex | De dónde sale |
|---|---|---|
| `ink950` | `#040406` | Misma proporción de canal que `ink900` (R=G, B levemente mayor), escalada hacia `black` sin llegar a acromático |

| Token (`theme.ts`, dark) | Antes (ADR-031) | Ahora (ADR-032) |
|---|---|---|
| `surface` | `ink900` `#0C0C0E` | `ink950` `#040406` |
| `surfaceRaised` | `ink800` `#1A1A1D` | *(sin cambio)* |
| `surfaceSunken` | `black` `#000000` | *(sin cambio)* |
| `heroGlow` | — (no existía) | `{ colors: ['#BEE80047', 'transparent'], locations: [0, 0.55] }` |

| Token (`theme.ts`, light) | Antes | Ahora |
|---|---|---|
| `heroGlow` | — (no existía) | `{ colors: ['#5F750029', 'transparent'], locations: [0, 0.55] }` |

| Token (`typography.ts`) | Antes (ADR-031) | Ahora (ADR-032) |
|---|---|---|
| `display` — tamaño / interlínea | 40 / 44 | 48 / 52 |
| `display` — tracking | -0,4 | -0,8 (sujeto a specimen) |
| `titleLg` — tracking | -0,2 | -0,35 |
| `title`, `bodyLg`, `body`, `label`, `labelBold`, `micro` | — | *(sin cambio)* |

## Por qué así

**Por qué `ink950` y no negro puro como superficie de trabajo.** El propio
ADR-031 ya hizo este análisis y la razón sigue viva: negro puro + acento
saturado es la combinación exacta de gaming y cripto que `visual-language.md`
§2 pone del lado de "No somos". `ink950` da el mismo efecto perceptual —a
`1,03:1` de `black`, la diferencia es invisible a ojo en cualquier pantalla de
consumo— sin cruzar esa línea de identidad, y sin sacarle el trabajo a `black`
como el hueco más profundo del sistema, que es el rol que ya tenía.

**Por qué no fue necesario re-anclar el generador de familias de estilo
(`build-palette.mjs`, `INK800`).** El ancla para resolver `onDark` sigue siendo
`ink800`, el fondo más exigente donde vive un chip — eso no cambió, porque
`surfaceRaised` sigue siendo `ink800`. Bajar `surface` no mueve esa ancla: la
hace, si acaso, más conservadora de lo estrictamente necesario (ahora hay más
margen entre `surface` y `surfaceRaised` del que había), lo cual es seguro, no
un error.

**Por qué partir la regla del acento en dos, en vez de borrarla.** Un límite
que no distingue "acción" de "identidad" fuerza una falsa elección: o el
acento se ve una sola vez y el rebrand no se nota, o aparece en todos lados y
dos botones compiten por ser "el" siguiente paso. Separar los dos trabajos dejó
que las dos cosas fueran ciertas a la vez, la misma jugada que ADR-010 ya usó
para separar el acento de marca de los colores de estilo.

**Por qué el degradado se ancla en `IntentScreen` y no en la revelación del
gusto.** La revelación del gusto es la aplicación más vistosa, pero también la
que menos gente ve hoy: la pantalla no existe en el código, y construirla
depende de reabrir D-010, que este documento no toca. `IntentScreen` ya usa
`role="display"`, ya es lo primero que ve cualquier persona nueva, y ya existe.
Anclar ahí el ejemplo principal es la diferencia entre un rebrand que se
prueba en una demo y uno que se nota en el primer minuto real de cualquier
usuario.

**Por qué el techo del degradado se fijó en el doble del mínimo AA y no en el
borde.** El control lo dice solo: al 50% de opacidad el pico del degradado ya
hace caer a `textPrimary` por debajo de 4,5:1 — 4,47:1, una décima de margen
que cualquier variación de pantalla real (brillo, calibración, un panel LCD en
vez de OLED) se come. Fijar el techo en 9:1 en vez de en 4,5:1 exacto es la
misma disciplina que ya usa el resto del sistema: no diseñar al borde de lo
que un test acepta.

**Por qué `display` sube de tamaño en vez de sumar un corte de peso nuevo.**
Un peso mayor que `Fraunces-SemiBold` (wght 600) rompería la relación que
ADR-031 ya construyó a propósito: el texto más grande de la pantalla pesa
exactamente lo mismo que el logotipo. Subir el tamaño en vez del peso conserva
esa relación de familia y, además, acerca el uso real al tamaño para el que
`opsz: 144` fue pensado — dos razones apuntando para el mismo lado, no una
coincidencia forzada.

## Consecuencias

- **Los tests de tokens van a fallar en rojo hasta que se actualicen.**
  `theme.test.ts` tiene `TEXT_PAIRS`/`GRAPHIC_PAIRS` que leen `theme.surface`
  dinámicamente, así que el propio test se re-verifica solo contra el valor
  nuevo — no hace falta tocar sus expectativas, pero sí correrlo. Cualquier
  test que compare `darkTheme.surface` contra un literal `'#0C0C0E'` hardcodeado
  sí va a romper y hay que corregirlo a mano.
- **`palette.ts` necesita una línea nueva en el bloque `NEUTROS` de
  `build-palette.mjs`** (`ink950: '#040406'`) y correr `npm run brand:palette`
  — el archivo es generado, no se edita a mano.
- **`heroGlow` es tipo nuevo en la interfaz `Theme`.** Hay que agregarlo a
  `theme.ts` en los dos temas a la vez — un componente que lo consuma en un
  solo tema no está terminado, la misma regla que ya vale para cualquier otro
  token.
- **El sufijo de alfa en runtime puede necesitar una excepción de lint
  puntual.** Si `no-restricted-syntax` interpreta el template string
  `` `${palette.brandVivid}47` `` como un literal hex (no debería, pero no se
  verificó corriendo el linter real todavía), la resolución correcta es una
  excepción en línea documentada en ese archivo puntual — nunca aflojar la
  regla en general.
- **`display` a 48px en `IntentScreen`, `ProfileScreen`, `AgeScreen` y
  `StudioScreen` a la vez.** Las cuatro pantallas comparten el rol, así que
  las cuatro cambian de tamaño juntas. Vale la pena mirar las cuatro en los dos
  temas antes de dar la tarea por terminada, no solo `IntentScreen`.
- **`visual-language.md` §4 y la skill `brand-identity` quedan todavía más
  desincronizados.** Ya lo estaban desde ADR-031 (la skill sigue describiendo
  un sistema de un solo acento `signal` rojo que el código reemplazó por
  completo). Este documento suma la regla nueva del acento, `ink950` y el
  degradado a esa deuda. Sigue sin ser parte de este ADR, pero crece cada vez
  que se pospone — encararla junto con la implementación de este documento, no
  después de una tercera ronda.
- **El pase de movimiento/animaciones sigue afuera, otra vez a propósito.** El
  dueño de producto mencionó "animaciones" en el mismo pedido; este documento
  no lo toca — ni `motion.ts`, ni los resortes, ni los hápticos. `motion.ts`
  tiene hoy un comentario (`PRESS_SCALE`) que cita la regla vieja del acento
  ("el acento aparece como máximo una vez por pantalla") como justificación de
  por qué el efecto de presión es exclusivo del botón `primary` — ese
  comentario queda desactualizado por la regla nueva de este documento y hay
  que corregirlo en el mismo momento en que se implemente esto, aunque el
  comportamiento que describe (el efecto de presión sigue siendo solo del
  botón `primary`, que sigue siendo el único con relleno grande) no cambia.
- **Implementación, en orden:** (1) agregar `ink950` a `NEUTROS` en
  `build-palette.mjs` y correr `npm run brand:palette`; (2) actualizar
  `theme.ts`: `surface` del tema oscuro a `ink950`, agregar `heroGlow` en los
  dos temas; (3) actualizar `typography.ts`: `display` a 48/52/-0,8, `titleLg`
  a tracking -0,35; (4) correr `npm run brand:specimen` y mirar `display` y
  `titleLg` renderizados antes de dar el tracking por final; (5) implementar
  `HeroGlow` como primitivo de `design-system/components/`, usado en
  `IntentScreen.tsx` primero; (6) extender el uso de `accentFill`/`accent` al
  tab activo, chips seleccionados, foco de `Input`, cifras destacadas y
  paginadores, con `labelBold` donde corresponda; (7) corregir el comentario
  de `PRESS_SCALE` en `motion.ts`; (8) correr `npm run brand:palette:check` y
  la suite completa de tests de tokens y accesibilidad; (9) recién ahí,
  mostrarlo corriendo en los dos temas, en las cuatro pantallas que usan
  `display`, antes de dar la tarea por terminada.

## Cuándo revisitar

Si D-010 se revisa y la pantalla de revelación del gusto se construye,
`heroGlow` y el degradado de barras por estilo ya están definidos acá — esa
implementación no necesita un ADR nuevo, solo ejecutar lo que ya está decidido.
Si en ese momento la pantalla necesita un pico de opacidad distinto al de
`IntentScreen` (por ejemplo, porque conviven varias barras coloreadas al mismo
tiempo y el degradado de héroe interactúa con ellas), eso sí es una decisión
nueva y hay que volver a correr `contrastRatio()` contra el fondo real de esa
pantalla, no asumir que el mismo 28% sigue siendo seguro.
