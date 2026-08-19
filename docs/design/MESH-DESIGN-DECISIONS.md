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

> **Reemplazada por D-010.** Explorar es una pestaña desde el 2026-08-19. Se
> deja escrita porque el razonamiento sigue siendo válido para lo que era Inicio
> entonces: una sola grilla de obra no se parte en dos pestañas.

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

> **Reemplazada por D-010.** El mazo salió de la app de quien busca, así que
> Inicio dejó de tener modos. Lo que esta decisión encontró —que una grilla no
> alimenta el motor de gusto— no dejó de ser cierto: en D-010 pasó de problema a
> costo asumido, y está escrito ahí.

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

## D-010 · No hay mazo ni encajes. Inicio es una grilla de artistas y Explorar es una pestaña.

**Fecha:** 2026-08-19 · **Origen:** decisión de producto. **Reemplaza a D-008 y
a D-009.**

MESH abría con un mazo de obra que se desliza y tenía una pestaña de encajes.
Las dos se van.

**Decidido.** La app de quien busca tiene tres superficies de contenido y
ninguna se desliza para decidir:

- **Inicio** — una grilla de artistas. Cada tarjeta es un carrusel chico de su
  obra, y debajo el nombre, la foto de perfil y la ubicación. Contesta **quién
  tatúa cerca mío**.
- **Explorar** — la grilla de toda la obra de todo el que se haya registrado,
  esté cerca o lejos. Contesta **qué me quiero tatuar**. La referencia es
  Tattodo, no Pinterest: la diferencia es que acá cada obra termina en la
  persona que la hizo, y esa persona está a un mensaje.
- **Chats** — nada más.

**Por qué.** El mazo pedía una decisión por obra antes de dar nada a cambio, y
lo que devolvía —un encaje puntuado— es una promesa que una app con quince
artistas no puede cumplir sin inventar. Una grilla de artistas no promete nada
que no muestre: son las personas que hay, con su trabajo, ordenadas por
cercanía.

**Qué se pierde, y hay que decirlo.** El mazo era la única superficie que
escribía `interactions`, y `interactions` es lo que alimenta el vector de gusto.
Sin mazo, **el motor de gusto y el de matching quedan sin entrada: nada en la
app de quien busca los ejecuta hoy.** Los dos siguen en `packages/domain` con
sus tests verdes, versionados y sin tocar, porque la decisión que se tomó es de
producto y no de arquitectura, y volver a darles una entrada es agregar una
superficie, no reescribir un motor. Lo que **no** se hizo es dejarlos
enchufados a media máquina: un motor de gusto alimentado por nada devolvería
encajes vacíos, y eso sería peor que no tenerlo.

**Reemplaza a D-008** ("Explorar es un verbo, no un lugar"). Aquella decisión
era correcta cuando Inicio era una sola grilla de obra: una segunda pestaña
habría partido la misma superficie en dos. Ahora Inicio y Explorar no son la
misma superficie con otro filtro —una muestra personas cerca, la otra obra de
todos lados— y separarlas es lo que las hace legibles. Se sigue respetando el
límite de cuatro pestañas.

**Reemplaza a D-009** ("Inicio tiene dos modos"). El problema que D-009
resolvía —que la grilla no le enseña nada a MESH— dejó de existir junto con lo
que aprendía.

**Dos cosas que solo aparecieron al mirar la pantalla armada.** La tarjeta de
Inicio llevaba además las tres etiquetas de estilo del artista: en la grilla se
leen como una carta de colores que le compite a la obra, que es justo lo que la
tarjeta vino a mostrar. Salieron de la tarjeta y siguen en el perfil, bajo
"Trabaja", donde hay lugar. Y la pestaña Chats, que era del artista y ahora es
de los dos lados, le decía a quien busca *"vos no podés escribir primero"* —la
regla del artista, invertida— y lo mandaba al mazo de búsquedas. El vacío ahora
depende de la intención.

**Rechazado: dejar el mazo escondido en Perfil.** Una superficie que nadie abre
igual hay que mantenerla, testearla y explicarla. Si el mazo vuelve, vuelve
como decisión, no como resto.

**Rechazado: un botón de me gusta sobre las obras de Explorar.** Es la misma
razón de D-009: cromo flotante sobre la obra, y es exactamente lo que haría que
Explorar se lea como Pinterest.

**El riesgo, escrito.** Inicio depende de que haya artistas dados de alta cerca
de quien mira. Con quince, casi nadie tiene a alguien "cerca", así que la
ubicación ordena pero no filtra: **nunca se esconde a nadie por distancia**, y
quien no publicó dónde trabaja aparece igual, al final. El día que el catálogo
crezca, filtrar por radio es una decisión nueva y hay que tomarla mirando datos.

---

## D-011 · La obra crece hasta ser el perfil, y el hero es la obra que tocaste

**Fecha:** 2026-08-19 · **Implementa [D-007].** · **Código:**
`apps/mobile/src/features/transitions/`

D-007 decidió construir a mano la transición obra → artista y prototiparla en
el playground antes de tocar producción. Esto es eso, hecho, más tres
decisiones que solo aparecieron al construirla.

**Decidido: el destino se calcula, no se mide.** El rectángulo donde va el hero
sale de `heroRect()`, con las mismas constantes con las que `ProfileScreen`
dibuja el suyo. Medirlo habría sido lo obvio, pero el perfil llega por red y el
hero no existe durante los primeros fotogramas: la obra se quedaría quieta en
su lugar viejo esperando el JSON, que es exactamente la sensación de "se colgó"
que la transición viene a evitar. El precio es un acoplamiento entre dos
archivos, y está pagado con un test que compara las constantes: si el hero
cambia de posición, falla ahí y no en la pantalla.

**Decidido: la obra que se tocó es el hero del perfil, aunque el artista haya
destacado otra.** Es la única forma de que la transición no mienta. Si crece una
obra y arriba aparece otra, la animación dijo "esto es lo que estás abriendo" y
era falso. La obra destacada sigue mandando cuando se llega de cualquier otro
lado —de un chat, de un enlace— y también cuando la obra tocada dejó de estar
publicada entre la grilla y el perfil.

**Decidido: abrir el perfil nunca depende de que la medición salga bien.** Esto
se aprendió rompiéndolo. La primera versión medía con `measureInWindow` y
navegaba adentro de su callback; en el renderer de los tests ese callback no
llega nunca, así que **tocar una obra no hacía nada**. Lo encontró de casualidad
un test de la grilla que ya existía. La versión que quedó mide
sincrónicamente con `getBoundingClientRect` —que existe en la arquitectura nueva
de React Native y en react-native-web, las dos plataformas donde la app corre— y
si no puede medir, abre igual sin animación. La animación es un lujo; llegar al
perfil no. Hay un test que busca ese defecto a propósito.

**El perfil entra con un fundido y no con el deslizamiento nativo.** Un
deslizamiento lateral empujaría la pantalla en una dirección mientras la obra
viaja en otra. Con el fundido, la grilla se disuelve y lo único que se mueve es
la obra.

**Rechazado: la transición de zoom nativa de expo-router.** Ya estaba rechazada
en D-007 —alpha, solo iOS, ~1s de demora declarada en la documentación de
Expo— y nada de lo que apareció al construir cambió eso.

**Rechazado: un elemento compartido de verdad.** Lo que viaja es una **copia**
de la obra dibujada por encima de todo; el original queda tapado por la pantalla
nueva y el hero real aparece recién cuando la copia termina, así que nunca se
ven los dos. La diferencia con un elemento compartido nativo no se puede ver;
la diferencia en fragilidad, sí.

**Rechazado: animar con `transform`.** Sería más barato que animar
`left/top/width/height`, pero con escala no uniforme deforma la imagen y el
radio de las esquinas — y la escala es no uniforme cuando el origen y el destino
no comparten relación de aspecto, que es el caso del carrusel de Inicio. Es una
sola vista durante 280ms: el costo se paga, la deformación no.

**Movimiento reducido:** la obra aparece en su lugar final, sin recorrido. No es
"animar más rápido", es no animar, que es lo que pidió quien configuró el
sistema así.

**La vuelta existe, y no es simétrica.** Al ir, la obra está en pantalla y se
mide; al volver, el destino es una grilla que quedó atrás y pudo scrollearse,
desmontar la tarjeta, o ser otra pestaña. Tres decisiones más:

- **Cada obra visible se anota en un registro mientras está montada.** No se
  guarda su posición: se guarda que sabe medirse. La posición se pregunta en el
  momento de volver, porque la de hace tres segundos ya no sirve. El registro
  está separado por superficie, porque las pestañas quedan montadas todas a la
  vez y la misma obra puede estar en Explorar y en el carrusel de Inicio.
- **No se intercepta ningún "atrás".** Hay tres —el botón, el gesto de borde de
  iOS, el botón físico de Android— y atajarlos con `beforeRemove` es frágil, y
  pelea con el gesto justo cuando la pantalla ya se movió con el dedo. En vez de
  eso, el perfil **arma** la vuelta mientras está en pantalla y la **suelta al
  desmontarse**, que es lo que pasa con los tres. El desmontaje es la señal.
- **Tres motivos para no animar, y los tres terminan en la navegación de
  siempre:** la tarjeta ya no está montada, está montada pero fuera de la
  ventana, o quedó donde estaba el hero. Una obra que encoge hacia un punto que
  no se ve es peor que ninguna animación — el ojo la sigue hasta la nada.

**El perfil ganó una salida visible.** No la tenía: se abre a pantalla completa
y sin barra, y hasta acá la única forma de volver era el gesto del sistema.
`navigation.md` §6 ya decía que eso es un defecto, y recién se vio al necesitar
un lugar desde donde disparar la vuelta. Es un botón con la palabra "Volver" y
sin ícono, por la misma razón que la barra de pestañas no tiene íconos: MESH no
tiene set propio. En los estados de error no aparece — `ErrorView` ya trae su
salida, y dos "Volver" no son dos salidas, son una pregunta sobre cuál hace qué.

**Lo que no hace, y hay que decirlo.**

- **Al volver se ven dos obras por un instante.** El perfil se funde mientras la
  copia encoge, así que durante ~280ms hay un hero desvaneciéndose arriba y la
  obra viajando hacia su lugar. Coinciden en el fotograma cero, que es lo que
  sostiene la ilusión, pero se separan en el medio. Esconder el hero del perfil
  al salir requeriría saber cuándo empieza el pop, que es justamente lo que se
  decidió no interceptar.
- **Desde el carrusel de Inicio la obra cambia de forma en el camino.** El
  carrusel recorta todo a 4:5 para que la fila quede pareja y el hero respeta la
  forma real. Se ve como que la obra se "desrecorta", que es honesto —está
  mostrando lo que el carrusel tapaba— pero no es continuidad pura.
- **La copia usa el archivo mediano, el hero el grande.** Es a propósito: el
  mediano ya está en caché desde la grilla, y pedir el grande pondría una
  descarga en el camino de la animación. Al terminar hay un cambio de nitidez.

[D-007]: #d-007--la-transición-obra--artista-se-construye-a-mano-no-con-la-api-nativa

---

## D-012 · Desde dónde se mira se ve, se cambia, y nunca filtra

**Fecha:** 2026-08-19 · **Origen:** el
[análisis de Tattoodo](../research/MESH-TATTOODO-TEARDOWN.md) §2.1, que lo marcó
como la deuda más clara de MESH.

Inicio ordenaba por cercanía en silencio. Tomaba el GPS, no lo decía, y no lo
dejaba corregir. Eso falla de dos maneras concretas que nadie puede diagnosticar
desde adentro de la app: quien la abre en el subte queda con la ubicación de la
estación, y quien vive en Palermo pero se tatúa cerca del trabajo en Microcentro
no tiene forma de decirlo.

**Decidido: arriba de la lista dice desde dónde se está midiendo, y desde ahí se
cambia.** Un orden invisible no es un orden, es una caja negra que a veces
acierta.

**Decidido: tres modos, y ninguno es el castigo de los otros.**

| | Ordena por | Muestra kilómetros |
|---|---|---|
| **Mi ubicación** (GPS) | distancia real, `sortByProximity` | **sí** |
| **Un barrio** elegido a mano | cercanía de barrio, `sortByNeighborhood` | **no** |
| **Sin ubicación** | nada — queda el orden del servidor | no |

**Elegir un barrio no da kilómetros, y eso no es una limitación técnica que
haya que resolver.** Los barrios de la taxonomía no tienen coordenadas, y aunque
las tuvieran, el centro de Palermo no es donde está la persona. Ordenar sí se
puede —mismo barrio, misma comuna, misma ciudad, misma área metropolitana— y el
motor para eso ya existía: `proximity()`, puro y con tests. Decir "a 2 km" sería
inventarlo, y el selector lo explica en vez de dejar que se note.

**"Sin ubicación" es una opción de primera clase**, no lo que queda cuando
negás el permiso. Quien no quiere compartir dónde está tiene que poder usar la
app sin que se lo vuelvan a pedir en cada pantalla.

**El GPS elegido sin permiso no finge.** El encabezado dice "sin ubicación" —
que es la verdad— y el aviso de abajo explica qué falta y cómo activarlo. Es el
caso que más se rompe en silencio: el modo dice `device` y la app se comporta
como si supiera dónde está.

**La ubicación ordena y nunca filtra.** Está dicho arriba del selector, porque
es lo que más se malinterpreta de un control de ubicación: en casi todas las
apps, elegir un lugar filtra. Con quince artistas, filtrar por zona vaciaría la
pantalla. Hay un test que lo verifica en los tres modos.

**La preferencia es del dispositivo, no de la cuenta.** Vive en el
almacenamiento local (ADR-009). El GPS es del dispositivo por definición, y el
barrio desde el que mirás depende de dónde estés, no de quién sos.

**Y se cayó el radio de búsqueda.** Al buscar dónde poner esto apareció que
`search_radius_km` se guardaba, se leía a sí mismo, y **ninguna consulta lo
usaba** desde D-010. Su texto además prometía "filtramos por distancia real",
que D-010 había vuelto falso. Un control que no hace lo que dice es peor que la
ausencia del control: enseña a desconfiar de los que sí funcionan. Se fue la
columna, el campo del cliente y el control.

**Rechazado: un selector de ciudad como el de la competencia.** Tattoodo pone
"Bondi Beach, NSW, Australia" y una lista de ciudades para explorar. MESH es
CABA en V1; una lista de ciudades donde no hay nadie sería una promesa vacía.
El barrio es la unidad que importa acá.

**Rechazado: pedir el barrio en el onboarding.** Es una pregunta más antes de
ver nada, para algo que la app puede resolver sola con el GPS y que se corrige
en dos toques el día que haga falta.

**El riesgo, escrito.** Un control de ubicación invita a esperar que filtre. Si
alguien elige "Boedo" y ve a alguien de La Plata al final de la lista, puede
leerlo como un error en vez de como la decisión que es. Por eso está dicho en el
selector y no solo en este documento — y si igual se malinterpreta, la respuesta
es mejorar el texto, no empezar a filtrar.

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
3. ~~Transición obra → artista con elemento compartido, prototipada en el
   playground antes de tocar producción.~~ **Hecha** — D-011.
4. ~~Rehacer Descubrir con la grilla de D.~~ **Hecho** — hoy es la pestaña
   Explorar (D-010), con la transición obra → artista (D-011).
5. Rehacer Perfil con la hoja de C.
6. ~~Reemplazar la explicación de gusto por la cartela de B.~~ **Sin objeto por
   ahora:** no hay pantalla de gusto (D-010).
7. Volver a pasar el barrido de accesibilidad y el de tipografía dinámica —
   la densidad de D usa tipografía chica y eso hay que verificarlo en el tamaño
   accesible más grande, no suponerlo.

### Los dos bloqueadores, cerrados

**ADR-007** quedó marcado como reemplazado en su parte de pestañas, con una nota
arriba de todo que dice qué de él sobrevive (Expo Router, deep links, cuatro y
no seis) y qué no (la barra Descubrir/Matches/Proyectos/Vos).
`docs/architecture/navigation.md` se reescribió con la barra que existe.

**"Explorar"** se cerró en D-008 y se volvió a abrir en D-010: hoy es una
pestaña, porque Inicio dejó de ser una grilla de obra.

### Lo que la implementación dejó pendiente

- ~~**La transición obra → artista sigue siendo una navegación común.**~~
  **Hecha** — ver D-011. Queda sin hacer la vuelta: salir del perfil sigue
  siendo la navegación de siempre.
- **El masonry todavía no se ve escalonado**, y no es un bug: las fotos fixture
  tienen todas la misma relación de aspecto, así que las dos columnas quedan
  alineadas. Con obra real se escalona solo. El reparto por altura acumulada sí
  está implementado y testeado.
- **El filtro por estilo filtra lo que bajó, no el catálogo.** Con pocos
  artistas alcanza; cuando el catálogo crezca hay que empujarlo al RPC.
- **Inicio baja hasta 100 artistas en una página.** El orden por cercanía vive
  en `packages/domain` para poder testearlo, y para ordenar hay que tener todo.
  Con quince artistas sobra; con quinientos hay que decidir entre bajar el orden
  a SQL —y perder los tests unitarios— o paginar por una grilla espacial.
- **Inicio no tiene filtro por estilo.** Explorar sí. Si aparece la necesidad,
  el dato existe: `professional_styles` está ahí, solo que el RPC de la grilla
  dejó de bajarlo cuando la tarjeta dejó de mostrarlo.
