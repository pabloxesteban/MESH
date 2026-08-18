# ADR-010 — El color es información: paleta generada y familias de estilo

**Estado:** Aceptado · **Fecha:** 2026-08-18 · **Extiende:** ADR-008 ·
**Reemplaza:** la regla "el acento aparece como máximo una vez por pantalla" de
`visual-language.md` §4, en su lectura literal

## Contexto

MESH arrancó con un sistema de un solo acento: neutros cálidos más un rojo
tinta, usado con moderación. Es una decisión defendible para una galería, y
producía una app que se leía como blanco y negro.

Dos cosas la volvieron insuficiente.

La primera es de producto. MESH ordena el mundo por **estilo**: el vector de
gusto se computa por estilo, el matching pesa el estilo en 0,70, y la pantalla
de gusto muestra una barra por estilo. Con un solo acento, quince estilos se ven
todos iguales y la persona tiene que leer cada etiqueta para saber qué está
mirando.

La segunda es de accesibilidad. El acento del brief (`#9C2D40`) medía ≈2,7:1
sobre la superficie oscura. No lo encontró una revisión visual: lo encontró un
test. Y volvió a pasar dos veces más mientras se elegían valores a ojo.

## Decisión

**1 · La paleta se genera, no se elige.** `tools/brand/src/build-palette.mjs`
define cada familia por su tono en OKLCH y resuelve por búsqueda binaria la
luminosidad exacta a la que ese tono alcanza el contraste que necesita contra la
superficie donde va a vivir. `palette.ts` es una salida. `npm run
brand:palette:check` corre en CI y falla si el archivo y el generador se
separaron.

**2 · Once familias cromáticas, una por familia de estilo.** Los quince slugs de
la taxonomía se agrupan en diez familias de estilo más la familia de marca. Un
chip turquesa siempre es línea fina.

**3 · Tres roles por familia, más un cuarto condicional.** `onDark` y `onLight`
son texto: se busca la luminosidad que da 4,5:1 contra su fondo. `vivid` es
relleno: luminosidad fija en 0,62 y croma al borde del gamut, verificando que
aguante `ink900` encima con 4,5:1. `deepVivid` cubre las familias cuyo `vivid`
es demasiado luminoso para sostener texto oscuro sobre papel.

**4 · Los colores de estilo no son tokens del tema.** No son roles semánticos.
Se resuelven con `styleColor(slug, theme)` y llegan al render por la prop `tint`
de `Text`, que existe solo para esto y está documentada como tal.

## Por qué así

**Por qué OKLCH y no HSL.** En HSL, dos colores con la misma `L` tienen
luminancias percibidas distintas, así que una paleta "pareja" en HSL no lo es en
pantalla. OKLCH es perceptualmente uniforme: fijar la luminosidad da familias
que pesan lo mismo.

**Por qué tres roles y no uno.** Los roles de texto se resuelven variando la
luminosidad hasta alcanzar el contraste, y aclararse le saca saturación al tono.
Es física. El rol de relleno resuelve el problema al revés: fija la luminosidad
donde el tono rinde más y empuja la croma al máximo, que es toda la diferencia
entre un teal apagado y uno que se ve. Un solo valor para las dos cosas deja la
interfaz lavada o ilegible, y ya dejó las dos.

**Por qué `onDark` se resuelve contra `ink800` y no contra `ink900`.** El texto
de acento vive tanto sobre la superficie base como sobre la elevada, y la
elevada es más clara. Resolver contra la base daba valores que fallaban apenas
subían a una tarjeta — que es donde viven casi todos.

**Por qué la croma se maximiza en cada candidato de luminosidad.** La croma
afecta la luminancia, así que buscar la luminosidad con la croma fija y recién
después empujar al borde del gamut movía el contraste y erraba el objetivo. Dos
familias fallaban por 0,04.

## Contrapartidas

- **El color solo nunca alcanza.** Toda etiqueta de estilo dice el estilo en
  palabras. Quien no distingue los tonos pierde velocidad, no información. Esto
  es una restricción permanente sobre cómo se usa el sistema, no una nota.
- **Más superficie que mantener.** Once familias por cuatro roles por dos temas.
  Se compensa con que está generado: agregar una familia es una línea en
  `FAMILIES` y un `npm run brand:palette`.
- **Riesgo de carnaval.** Once colores mal usados es una app de juguete. Lo
  contiene la disciplina de §4: un color de estilo aparece solo donde ese estilo
  está siendo nombrado, nunca como decoración.
- **La regla de "un acento por pantalla" se vuelve más difícil de auditar**,
  porque ahora hay que distinguir acento de marca de color de estilo. Se aceptó
  reescribiendo la regla en vez de dejarla contradicha por el código.

## Cuándo revisitar

Cuando MESH agregue una segunda categoría. Las familias hoy están atadas a la
taxonomía de tatuaje; una categoría nueva va a necesitar su propio mapa de
slug → familia, y ahí hay que decidir si las familias se comparten entre
categorías o si cada una trae las suyas. El generador ya es agnóstico: lo que
está atado a tatuaje es `STYLE_FAMILY`, y vive en un solo archivo.
