# MESH — Registro de decisiones de diseño

**Estado:** Vivo · **Responsable:** ux-product-designer + design-system-engineer

Qué se decidió, qué se descartó y por qué. Una decisión sin su alternativa
rechazada al lado no es un registro: es una declaración.

Las decisiones de arquitectura viven en [`docs/decisions/`](../decisions/). Acá
van las de **diseño** — composición, jerarquía, color, movimiento, densidad.

---

## D-001 · MESH se estructura como marketplace de descubrimiento, no como app de swipe

**Fecha:** 2026-08-19 · **Origen:** el dueño del producto aclaró el modelo.

MESH venía construido con el swipe como modelo de navegación. La aclaración fue
que el swipe es **un** mecanismo de descubrimiento, no el producto: el recorrido
real es DESCUBRIR → EXPLORAR → ENTENDER → CONFIAR → ENCAJAR → CONTACTAR, que es
la forma de Airbnb, no la de Tinder.

**Decidido.** El swipe se conserva —el mazo funciona y la gente lo entiende— y
deja de ser el único camino. Descubrir también se scrollea, se busca, se filtra
y se compara.

**Rechazado: sacar el swipe.** Es el gesto que hace que MESH aprenda el gusto
sin cuestionario, y el vector de gusto es el diferencial del producto. Un
formulario de preferencias produce lo que la gente **dice** que le gusta, que no
es lo que marca.

**Consecuencia incómoda.** La superficie de descubrimiento pasa a tener dos
modos con pesos distintos según a qué vino la persona, y eso es más producto que
el que había. Se asume.

---

## D-002 · Cuatro direcciones visuales, comparadas mirándolas

**Fecha:** 2026-08-19 · **Dónde:** UX Playground → categoría DIRECCIÓN VISUAL.

Se construyeron cuatro direcciones sobre **el mismo fixture** —mismo artista,
mismo gusto, mismas razones— para que lo único que cambiara fuera la decisión de
diseño. Cada una muestra las cinco superficies que definen MESH: descubrir,
perfil, gusto, match y proyecto.

No son cuatro apps. Son viñetas, y cada viñeta lleva escrito **qué está
probando**, para que la evaluación no derive en "¿cuál queda más linda".

| | Apuesta |
|---|---|
| **A · Editorial Dark** | Que MESH se distinga por lo que no tiene. Obra a sangre, serif grande, cero cromo. |
| **B · Warm Gallery** | Que sobre papel el trabajo se lea como obra. Enmarcado, con aire y ficha de sala. |
| **C · Spatial Apple** | Que devolverle a la obra los 56pt de la barra de pestañas cambie la sensación. |
| **D · Creative Minimal** | Que descubrir bien sea comparar muchas rápido, no contemplar de a una. |

### Matriz de evaluación

Los puntajes son **juicio, no medición**. Salen de mirar las cuatro renderizadas
a 390pt de ancho, no de un test con gente — eso todavía no se hizo, y decir lo
contrario sería inventar evidencia.

| Criterio | A | B | C | D |
|---|---|---|---|---|
| Identidad MESH | 9 | 7 | 6 | 6 |
| Calidad visual | 9 | 9 | 7 | 7 |
| Usabilidad | 6 | 7 | 8 | 9 |
| Descubrimiento | 5 | 6 | 6 | 9 |
| Escalabilidad | 6 | 6 | 7 | 9 |
| Encaje con tatuaje | 9 | 6 | 7 | 8 |
| Encaje con categorías futuras | 7 | 8 | 8 | 9 |
| Potencial de animación | 8 | 5 | 9 | 6 |
| Accesibilidad | 7 | 5 | 6 | 6 |
| Performance | 6 | 7 | 7 | 7 |
| Impacto de portafolio | 9 | 8 | 7 | 6 |
| **Total** | **81** | **74** | **78** | **82** |

Que D y A queden a un punto **no es un empate para desempatar a dedo**: es el
resultado real. Son las dos respuestas honestas a la pregunta de qué es
descubrir, y cada una gana en la mitad de los criterios que a MESH le importan.

### Lo que se decidió

**Se selecciona una síntesis con espina dorsal en D, llamada EDITORIAL GRID.**
No es "las cuatro mezcladas": es la estructura de D con lo que cada una de las
otras probó que hace mejor, y cada préstamo está justificado abajo.

| Superficie | De dónde sale | Por qué |
|---|---|---|
| Descubrir | **D** | Comparar es parte de decidir. Ocho obras en una pantalla lo permiten; una, no. Es lo que hace Airbnb de verdad. |
| Entrar a un perfil | **C** | La hoja que sube sobre la obra es lo único de las cuatro que produjo la sensación de "entré al mundo de esta persona" en vez de "abrí otra pantalla". |
| Voz y momentos de marca | **A** | La serif grande sobre negro es lo que hace que MESH no sea un directorio. Se usa poco y fuerte: títulos de sección y revelación de gusto. |
| Gusto | **B** | La cartela enmarcada con la frase en serif y los estilos al pie fue, con diferencia, la mejor explicación de las cuatro. |
| Match | **D** | Una fila, sin ceremonia. Un encaje es una respuesta, no un premio. |

### Lo que se descartó, con nombre

**A como dirección completa.** Una obra por pantalla es hermosa y es lenta.
Airbnb no muestra un alojamiento por pantalla y no es por falta de gusto. Lo que
sobrevive de A es su tipografía y su desprecio por el cromo, no su ritmo.

**B como tema base.** El fondo claro hace que la interfaz vuelva a ser visible:
en la viñeta se ven todas las reglas y todos los marcos, que es exactamente lo
contrario de "el trabajo es el diseño". Y contradice una decisión ya escrita en
`ThemeProvider` ("el oscuro es el marco correcto para la fotografía"). Queda
como **hipótesis para un modo claro futuro**, no para V1 — y antes de eso hay
que pasar la paleta de familias por el test de contraste sobre papel, que hoy no
está verificado.

**C como identidad.** Los principios espaciales sí; la estética, no. Aplicada
entera, la dirección se parece a iOS antes que a MESH — y el brief pide
exactamente lo contrario.

**El "94% match".** Aparece en el brief como posibilidad y se rechaza. Un
porcentaje convierte una explicación en un puntaje de juego, y MESH ya decidió
en [ADR-005](../decisions/ADR-005-matching.md) mostrar bandas en palabras
—encaje fuerte, buen encaje— porque un número de dos dígitos afirma una
precisión que el motor no tiene. Hay un test que falla si alguna dirección
muestra un porcentaje.

---

## D-003 · `vivid` no puede usarse como campo grande

**Fecha:** 2026-08-19 · **Origen:** lo encontró el prototipo, no una revisión.

La primera versión de las viñetas usaba el color de familia de estilo (`vivid`,
de `tokens/style-colors.ts`) como relleno completo del lugar donde iría una
obra. Con ocho obras en pantalla, la dirección D se leía como **una carta de
colores**, no como un portafolio — y el prototipo terminaba midiendo la
intensidad del relleno en vez del layout.

**Decidido.** `vivid` está calculado para chips, puntos y barras: superficies
chicas que tienen que distinguirse y sostener texto. Como campo grande, grita.
El sustituto de obra pasó a ser un campo neutro (`surfaceRaised`) con una banda
de 4pt del color de familia al pie: **lo neutro domina, el color identifica.**

**Por qué importa fuera del prototipo.** `Tag filled` usa `vivid` como fondo.
Hoy son etiquetas chicas y está bien. Si alguna vez se propone una superficie
grande teñida por estilo —una cabecera de categoría, un fondo de sección— esta
es la razón documentada para decir que no.

---

## D-004 · La barra de pestañas se queda. La píldora flotante se descarta.

**Fecha:** 2026-08-19 · **Corregido el mismo día, contra fuente.**

La dirección C probó una píldora flotante en lugar de la barra de pestañas, y al
mirarla parecía razonable: tapa menos superficie que una barra fija y el
contenido corre por debajo. La primera versión de esta decisión decía "evaluar
con las pantallas reales".

**La investigación la cerró antes.** Dos cosas, las dos verificadas contra la
fuente y no contra un blog:

1. El HIG de Apple es explícito en la dirección contraria: *"Make sure the tab
   bar is visible when people navigate to different sections of your app. If you
   hide the tab bar, people can forget which area of the app they're in."*
2. El "minimize on scroll" de iOS 26 que circuló como tendencia general está
   condicionado en el propio HIG a **apps con accesorio adjunto**, del tipo del
   MiniPlayer de Music: *"For tab bars with an attached accessory, like the
   MiniPlayer in Music, you can choose to minimize the tab bar…"*. MESH no tiene
   accesorio.

Y lo que no apareció: **ni un solo estudio que compare navegación flotante
contra fija en usabilidad.** Es una decisión de jerarquía visual de Apple, no un
hallazgo. Adoptarla sería seguir una estética creyendo que se sigue evidencia.

**Decidido.** La barra se queda. Lo que sí se recorta para devolverle espacio a
la obra es el **encabezado** de las superficies de descubrimiento, que hoy
duplica lo que la pestaña ya dice.

**Decidido, y esto no se evalúa:** nada de material translúcido real. El
contraste del texto sobre vidrio depende de la imagen que pase por detrás, y eso
**no se puede verificar con un test** — el barrido de accesibilidad mide
contraste contra un fondo conocido. Coincide con lo que `visual-language.md` ya
decía: sobre superficie oscura cálida, el vidrio esmerilado se lee como
suciedad. El HIG, además, pide usarlo con moderación y **nunca en la capa de
contenido**; MESH es el peor caso posible para eso, porque su contenido es línea
fina de alto detalle sobre fondos que cambian en cada tarjeta.

**Lo que esto le costó a la dirección C:** su idea más vistosa. Lo que sobrevive
de C es lo que de verdad funcionaba — la hoja que sube sobre la obra.

---

## D-005 · El gusto se explica con una frase, no con una visualización

**Fecha:** 2026-08-19 · **Origen:** comparación directa en las cuatro viñetas.

Las cuatro direcciones resolvieron el gusto distinto, a propósito:

| | Cómo | Resultado |
|---|---|---|
| A | Frase en serif + barras con sustento al lado | Se entiende. La barra agrega poco. |
| B | Cartela enmarcada: frase grande, estilos al pie | **La mejor de las cuatro.** |
| C | Bandas apiladas con superposición | Se ve sofisticada y no dice más. Es la peor. |
| D | Tabla: punto de color, estilo, sustento | Honesta, sin ninguna gracia. |

**Decidido.** Gana B, y la lección de C queda escrita: *una visualización que no
explica mejor que una frase es decoración*. El brief lo pedía en §23 y la
comparación lo confirmó.

**Rechazado: la constelación de estilos.** Sigue rechazada, y por la razón de
siempre — MESH no calcula relación entre estilos, así que dibujar cercanía entre
dos sería inventar información. El `TasteMapLab` del playground se queda como
está: EXPERIMENTAL y sin ruta a producción.

---

## D-006 · Antes de implementar, prototipar; el playground no se limpia

**Fecha:** 2026-08-19

Las cuatro direcciones **se quedan en el playground después de elegir**. Borrar
las descartadas dejaría la selección sin nada que la sostenga: dentro de seis
meses, "¿por qué no probamos con fondo claro?" tiene que poder contestarse
abriendo B y mirándola, no releyendo un párrafo.

El test del índice (`playground.test.tsx`) verifica que la tabla de
"construido / sin construir" del código coincida con lo documentado, así que una
dirección que se borre sin actualizar el registro rompe el build.

---

## D-007 · La transición obra → artista se construye a mano, no con la API nativa

**Fecha:** 2026-08-19

La transición de zoom nativa de expo-router parecía el camino corto para la
interacción firma de MESH. No lo es, y ahora está verificado contra la
documentación de Expo:

> *"Zoom transition is an alpha API available on iOS only in Expo SDK 55 and
> later. The API is subject to breaking changes."*

> *"You may experience a noticeable delay (approximately 1 second) when
> navigating to or dismissing screens that use zoom transitions."*

Un segundo entre tocar una obra y ver el perfil rompe los presupuestos de
performance, y una API alpha solo para iOS deja a Android sin la interacción que
define el producto.

**Decidido.** El principio se conserva —continuidad espacial, la obra crece
hasta ser el perfil— y la implementación es propia, con Reanimated, en las dos
plataformas. Se prototipa en el playground antes de tocar producción.

Esto además cierra una pendiente que arrastraban `mobile-patterns.md` y
`MESH-UX-STRATEGY.md` §11, donde la transición nativa figuraba como "adaptar,
confianza media, falta verificar".

---

## D-008 · "Explorar" no es una pestaña

**Fecha:** 2026-08-19 · **Cerraba una pendiente que bloqueaba implementar.**

El recorrido nuevo nombra seis pasos —descubrir, explorar, entender, confiar,
encajar, contactar— y el quinto no existía en el mapa de superficies. La
investigación lo marcó como decisión de producto disfrazada de navegación, y
tenía razón: prototipar sin contestarla habría sido construir sobre una duda.

**Decidido: explorar es un verbo, no un lugar.** Pasa adentro de la grilla
(filtrar, comparar, seguir bajando) y adentro del mundo de una persona
(portafolio, obra relacionada). Una quinta pestaña rompería la regla de cuatro
para nombrar algo que ya está sucediendo en las que hay.

**Rechazado: una pestaña Explorar.** Obligaría a decidir entre "Inicio" y
"Explorar" antes de saber qué se quiere — que es justo el estado en el que está
alguien que abre la app sin saber qué busca.

**Rechazado: separar Descubrir de Buscar.** Misma razón, y además contradice el
principio de que ningún modo es secundario.

---

## D-009 · Inicio tiene dos modos, y el default sale de un dato

**Fecha:** 2026-08-19 · **Origen:** un problema que apareció al implementar.

Al llevar EDITORIAL GRID a la pantalla apareció algo que ninguna viñeta podía
mostrar: **la grilla no alimenta el motor de gusto.** Tocar una obra es mirarla,
no opinar sobre ella. Sin `interactions` no hay vector de gusto; sin vector no
hay encajes. El mazo es la única superficie que le enseña algo a MESH.

Reemplazar el mazo por la grilla habría dejado al producto sin su diferencial
en la primera pantalla, y nadie lo habría notado hasta ver que los encajes
nunca aparecen.

**Decidido.** Inicio tiene dos modos y ninguno es secundario:

- **De a una** — el mazo. Se decide, y MESH aprende.
- **Grilla** — se recorre y se compara.

**Con cuál abre lo decide un dato:** menos de `READY_MIN_INTERACTIONS`
decisiones → el mazo, porque es lo único que puede sacar a MESH de no
conocerte; a partir de ahí → la grilla, porque ya puede comparar por vos. El
control está siempre a la vista y la elección manual manda sobre el default.

**Rechazado: un botón de me gusta sobre cada obra de la grilla.** Resolvería el
problema del gusto y rompería el principio que sostiene toda la dirección — cero
cromo flotante sobre las obras. Es también lo que haría que la grilla se lea
como Pinterest.

**Rechazado: preguntar en qué modo querés abrir.** Una preferencia más que
configurar, para algo que la app puede saber sola.

**El riesgo, escrito:** el control de modo es cromo, y el default que cambia
solo puede sorprender — alguien que eligió grilla ayer y hoy encuentra el mazo
cree que la app se rompió. Por eso el mazo lleva una línea que dice por qué está
ahí, y desaparece apenas la persona elige a mano.

---

## Pendiente, y dicho como pendiente

Nada de esto está implementado en las pantallas de producción todavía. Lo que
existe hoy es: la investigación, las cuatro direcciones, la comparación y la
selección. El orden que fijó el brief —AUDITAR → INVESTIGAR → PROTOTIPAR →
COMPARAR → SELECCIONAR → IMPLEMENTAR → PROBAR → PULIR— va por "seleccionar".

Lo que falta, en orden:

1. Extender los tokens con lo que EDITORIAL GRID necesita y hoy no existe:
   variantes de tarjeta, variantes de hoja, tratamiento de imagen, elevación.
2. Sistema de tarjetas semánticas (§13 del brief): hero, editorial, compacta,
   horizontal, match, perfil, portafolio.
3. Transición obra → artista con elemento compartido, prototipada en el
   playground antes de tocar producción.
4. ~~Rehacer Descubrir con la grilla de D.~~ **Hecho** — ver D-009. Falta la
   transición desde la grilla, que hoy es una navegación común.
5. Rehacer Perfil con la hoja de C.
6. Reemplazar la explicación de gusto por la cartela de B.
7. Volver a pasar el barrido de accesibilidad y el de tipografía dinámica —
   la densidad de D usa tipografía chica y eso hay que verificarlo en el tamaño
   accesible más grande, no suponerlo.

### Los dos bloqueadores, cerrados

**ADR-007** quedó marcado como reemplazado en su parte de pestañas, con una nota
arriba de todo que dice qué de él sobrevive (Expo Router, deep links, cuatro y
no seis) y qué no (la barra Descubrir/Matches/Proyectos/Vos).
`docs/architecture/navigation.md` se reescribió con la barra que existe.

**"Explorar"** se cerró en D-008: es un verbo, no un lugar.

### Lo que la implementación dejó pendiente

- **La transición obra → artista sigue siendo una navegación común.** Tocar una
  obra en la grilla abre el perfil, pero no crece desde donde estaba. Es la
  interacción firma y todavía no existe; se prototipa en el playground antes de
  tocar producción (D-007).
- **El masonry todavía no se ve escalonado**, y no es un bug: las fotos fixture
  tienen todas la misma relación de aspecto, así que las dos columnas quedan
  alineadas. Con obra real se escalona solo. El reparto por altura acumulada sí
  está implementado y testeado.
- **El filtro por estilo filtra lo que bajó, no el catálogo.** Con pocos
  artistas alcanza; cuando el catálogo crezca hay que empujarlo al RPC.
