# MESH — Dirección visual 2.0 · EDITORIAL GRID

**Estado:** Seleccionada, sin implementar · **Fecha:** 2026-08-19
**Responsable:** ux-product-designer + design-system-engineer

Este documento **no reemplaza** a [`visual-language.md`](visual-language.md) ni
a [`design-system.md`](design-system.md). La marca, la paleta, la tipografía y
las reglas de tokens siguen valiendo tal como están. Lo que cambia acá es la
**arquitectura de la experiencia**: qué se muestra primero, con cuánta densidad,
cómo se entra a un perfil y cómo se navega.

La selección y las alternativas descartadas están en
[`MESH-DESIGN-DECISIONS.md`](MESH-DESIGN-DECISIONS.md). La investigación que la
sostiene, en [`../research/MESH-2026-UX-RESEARCH.md`](../research/MESH-2026-UX-RESEARCH.md).

---

## 1. El cambio de modelo, en una línea

MESH no es Tinder para profesionales. **La obra es el mecanismo de
descubrimiento; la persona es el destino.**

```
Tinder     PERSONA → deslizar → match
MESH       OBRA → descubrir → explorar → entender → confiar → encajar → PERSONA
```

El swipe se queda. Deja de ser el modelo de navegación.

---

## 2. Los seis principios

**1. El contenido es la interfaz.** La atención va a la imagen, después a la
persona, después a por qué encaja, y recién ahí a la acción. Cualquier elemento
de UI que compita con una obra por la atención está mal. No es nuevo: ya estaba
escrito en `visual-language.md`. Lo que cambia es que ahora hay una regla
operativa que lo hace verificable — ver §7.

**2. Comparar es parte de decidir.** Es la lección de Airbnb y es lo que
corrige el modelo anterior. Una pantalla que muestra una sola opción obliga a
recordar la anterior para elegir, y nadie recuerda bien. Descubrir muestra
varias.

**3. Dos modos, ninguno secundario.** *Mostrame* (no sé qué quiero) y *busco
esto* (sé exactamente qué quiero) conviven en la misma superficie. El segundo no
vive escondido detrás de una lupa.

**4. Entrar, no navegar.** Tocar una obra no abre otra pantalla: abre el mundo
de esa persona, desde donde estaba la obra. La continuidad espacial es la
diferencia entre las dos sensaciones.

**5. Nada se afirma sin sustento.** Toda razón de encaje se rastrea a algo que
la persona hizo. Ningún porcentaje. Ninguna reseña inventada. Ninguna
disponibilidad supuesta.

**6. Agnóstico de categoría por construcción.** Toda decisión se prueba
mentalmente contra: tatuador, fotógrafo, diseñador, videasta, profesional de
estética. Si solo funciona para tatuaje, está mal diseñada.

---

## 3. Qué se toma de cada referencia, y qué no

### Airbnb — la referencia estructural

| Se toma | No se toma |
|---|---|
| Varias opciones por pantalla; comparar es parte de decidir | Su densidad de texto por tarjeta |
| Divulgación progresiva: lo esencial arriba, el detalle bajo demanda | Su tipografía y su cromo |
| Filtros contextuales que no se muestran todos juntos | La barra blanca de CTA persistente |
| La hoja como "más sobre lo que ya estás mirando" | El mapa como superficie principal |
| Arquitectura de confianza: identidad, profundidad de portafolio, transparencia | Reseñas y ratings (MESH no los tiene y no los va a inventar) |

**Lo que hay que decir en voz alta:** se toma la **lógica de producto**, no la
identidad visual. Una MESH que se vea como Airbnb es un fracaso, aunque funcione
como Airbnb.

### Cosmos y Are.na — la cultura

Composición editorial, aire, interfaz callada, contenido primero. Es de donde
sale que MESH tenga momentos serif grandes y márgenes generosos, y que la
navegación sepa correrse. La lección más útil: **una interfaz calma hace que la
gente mire más tiempo cada cosa**, que es lo contrario de lo que optimiza un
feed.

### Pinterest — el descubrimiento visual

Se toma: masonry con relaciones de aspecto variadas, "más como esto",
profundidad de recomendación. Se rechaza: su sistema de tarjetas, su navegación,
su marca, y la densidad de acciones flotando sobre cada imagen.

**Y se toma una lección que Pinterest dio sin querer.** Su propio equipo
describe el rediseño de tableros de 2025 como mover a la gente *"from admiring
their dream styles or spaces to actively achieving them"*. El líder de la
categoría está invirtiendo en cerrar la brecha entre admirar y hacer — una
brecha que MESH no tiene, porque cada obra ya está atada a una persona a la que
se le puede escribir. De ahí sale una regla dura: **ninguna superficie de MESH
termina en una obra; toda superficie termina en una persona.** Una grilla que se
pueda recorrer sin llegar nunca a alguien es Pinterest con otra tipografía.

**El riesgo declarado:** una grilla masonry se parece a Pinterest. La defensa de
MESH no es estructural sino tipográfica y cromática — fondo casi negro, serif
editorial, cero cromo flotante sobre las obras. Si al mirarla igual se lee como
Pinterest, la defensa falló y hay que decirlo, no explicarlo.

### Apple — la interacción espacial

Se toma: contenido que corre por debajo de los controles, hojas contextuales,
transiciones de elemento compartido, y movimiento que comunica jerarquía.

Se rechaza, y las dos con fuente:

- **Material translúcido real.** El contraste sobre vidrio no se puede verificar
  con un test, y en MESH lo que no se puede verificar no se publica. El HIG
  además pide usarlo con moderación y nunca en la capa de contenido.
- **Navegación flotante en lugar de la barra.** El propio HIG pide que la barra
  siga visible al navegar, y el "minimize on scroll" de iOS 26 está condicionado
  a apps con accesorio adjunto. Ver
  [D-004](MESH-DESIGN-DECISIONS.md#d-004--la-barra-de-pestañas-se-queda-la-píldora-flotante-se-descarta).

Es el ejemplo más claro de por qué el brief pide extraer principios y no copiar:
los principios espaciales de Apple mejoran MESH; su estética de 2026, aplicada
entera, la haría parecer una app de sistema.

---

## 4. Arquitectura de tarjetas

Una sola tarjeta universal obliga a que todo tenga la misma densidad. Se definen
**variantes semánticas**, con el mismo lenguaje visual y distinta cantidad de
información.

| Variante | Dónde | Qué muestra | Qué NO muestra |
|---|---|---|---|
| **Obra** | Grilla de descubrir | Imagen y nada más | Nombre del artista — aparece al tocar |
| **Obra destacada** | Cabecera de sección | Imagen a sangre, artista sobre velo en el borde inferior | Acciones |
| **Artista compacta** | Resultados, encajes | Miniatura, nombre, barrio, banda, 2 razones | Portafolio |
| **Artista horizontal** | Rieles de "más como esto" | Miniatura y nombre | Razones |
| **Encaje** | Matches | Obra, nombre, banda en palabras, razones con sustento | Porcentaje |
| **Portafolio** | Perfil | Imagen en grilla pareja | Metadatos |
| **Colección** | Guardados | Mosaico de 4 obras y un título | Conteos inflados |

**La decisión más discutible, escrita como tal:** en la grilla de descubrir, la
obra **no lleva el nombre del artista debajo**. Con un pie por obra, la grilla
se convierte en una lista de gente y se descubre por nombre en vez de por
trabajo. El nombre aparece al tocar. Si las métricas muestran que la gente no
llega al perfil, esta es la primera decisión a revisar.

---

## 5. Arquitectura de imagen

- **Relaciones de aspecto variadas.** Una grilla que recorta todo a cuadrado
  miente sobre la obra. El masonry existe para respetar la forma del trabajo.
- **Sin overlays sobre el centro.** El texto sobre una imagen vive en el borde,
  sobre velo de tinta (`overlayScrim`) — nunca sobre el trabajo.
- **El velo tiñe, no colorea.** Tinta con opacidad. Nunca un degradado de color.
- **`vivid` nunca como campo grande.** Ver
  [D-003](MESH-DESIGN-DECISIONS.md#d-003--vivid-no-puede-usarse-como-campo-grande).
- **Carga progresiva, no spinners.** Blurhash → imagen. El esqueleto tiene la
  forma de lo que viene, no de una barra genérica.

---

## 6. Movimiento

Se conservan los tokens que ya existen (`tokens/motion.ts`): techo de 500ms
verificado por test, dos curvas, dos resortes. Lo que se agrega es **qué
comunica cada transición**, que es lo que decide si una animación se publica.

| Transición | Qué comunica | Duración |
|---|---|---|
| Obra → perfil | Continuidad: entraste a esto que estabas mirando | `standard` |
| Hoja que sube | Capa: hay más sobre lo mismo | `standard` |
| Chip seleccionado | Confirmación | `instant` |
| Tarjeta que se va | Causa y efecto del gesto | `spring.deck` |
| Revelación de gusto | Jerarquía: esto importa más que el resto | `reveal` |

**La firma de MESH es obra → artista.** Es la única transición que vale la pena
construir con elemento compartido.

**No se usa la API nativa de zoom de expo-router.** Es alpha, solo iOS 18+, solo
con el Stack propio del router, y su propia documentación advierte de *"a
noticeable delay (approximately 1 second)"* al navegar. Un segundo entre tocar
una obra y ver el perfil rompe el presupuesto, y dejaría a Android sin la
interacción que define el producto. Se construye a mano con Reanimated, en las
dos plataformas, y se prototipa en el playground antes de tocar producción. Ver
[D-007](MESH-DESIGN-DECISIONS.md#d-007--la-transición-obra--artista-se-construye-a-mano-no-con-la-api-nativa).

Con movimiento reducido, toda transformación se reemplaza por un fundido corto
y **nada queda inalcanzable**. Ya está implementado así en `MotionProvider`.

---

## 7. Navegación

**La regla operativa que hace verificable el principio 1:** en la superficie de
descubrimiento, el cromo permanente no puede pasar del 15% del alto de pantalla.
Hoy la barra de pestañas sola se lleva ~56pt de 844 (6,6%) y con el encabezado
se acerca al límite. Cuando se pasa, lo que se saca es el encabezado — no la
barra.

Las cuatro pestañas se quedan, siguen dependiendo de la intención de la persona
(ver [ADR-014](../decisions/ADR-014-two-sided.md)), y **la barra no se convierte
en píldora flotante.**

Esto se investigó y se descartó con fuente, no por gusto: el HIG pide
explícitamente que la barra siga visible al navegar, el "minimize on scroll" de
iOS 26 está condicionado a apps con accesorio adjunto —MESH no tiene—, y no
existe ningún estudio que compare navegación flotante contra fija en
usabilidad. Ver
[D-004](MESH-DESIGN-DECISIONS.md#d-004--la-barra-de-pestañas-se-queda-la-píldora-flotante-se-descarta).

Lo que sí se recorta para devolverle espacio a la obra es el **encabezado** de
las superficies de descubrimiento, que hoy repite lo que la pestaña ya dice.

**Descubrir y Buscar no se separan en dos pestañas.** Son dos modos de la misma
intención, y separarlos obliga a decidir cuál se toca antes de saber qué se
quiere. La búsqueda vive arriba de la grilla, como una fila de filtros que se
desplaza y se abre en hoja.

---

## 8. Búsqueda y filtros

La búsqueda arranca con una pregunta, no con un campo vacío: **"¿Qué estás
buscando?"**. Acepta estilo, zona, persona o descripción, y las sugerencias son
visuales donde se pueda — un estilo se reconoce mucho antes por una foto que por
su nombre.

Los filtros son progresivos: **Estilo · Zona · Precio · Agenda**, en ese orden,
y no se muestran todos a la vez. Cada uno se abre en hoja, se aplica sin salir
de la grilla, y se limpia de un toque. Un filtro aplicado siempre está a la
vista — un filtro activo invisible es la forma más común de que alguien crea que
no hay resultados.

**Vacíos que ayudan.** Nunca "Sin resultados". Siempre qué es cierto y qué
hacer: *"Todavía no hay nadie trabajando ese estilo cerca tuyo. Probá ampliar la
zona, o mirá estilos parecidos."*

---

## 9. Mapa

**No se agrega en V1.** Para descubrir tatuaje, la zona importa pero no es el
mecanismo: nadie elige un tatuador por dónde queda, elige por cómo tatúa y
después mira si le queda cerca. Un mapa como superficie principal invertiría ese
orden.

Lo que ya existe y alcanza: distancia real en kilómetros cuando las dos partes
dieron su ubicación, y radio de búsqueda configurable. Si alguna vez se agrega
un mapa, entra como **contexto secundario** dentro de un perfil, nunca como
pestaña.

---

## 10. Confianza sin reseñas

MESH no tiene reseñas y no las va a inventar. La confianza se construye con lo
que sí es verificable:

- Identidad: perfil reclamado o creado por la persona, con contacto real.
- Profundidad de portafolio: cuánta obra hay, y de qué.
- Transparencia: precio y agenda **solo si el artista los declaró**, con la
  fecha en que los declaró. Un dato viejo se muestra viejo, no se esconde.
- Especialización: los estilos que declara, contrastables con su obra.
- Honestidad sobre lo ficticio: un registro de prueba lleva su insignia y no se
  puede contactar.

Reseñas, proyectos completados y verificación son **post-V1**, y hasta entonces
su ausencia se nota — que es preferible a rellenarla.

---

## 11. Tipografía, color y espaciado

Sin cambios respecto de lo documentado. Se repiten acá las tres reglas que la
nueva densidad pone en riesgo:

1. **La serif nunca por debajo de 24px, la sans nunca por encima de 20px.**
   Verificado por test. La densidad de EDITORIAL GRID tienta a usar serif chica
   para títulos de tarjeta: no se puede.
2. **Nada de hex fuera del design system.** Verificado por lint.
3. **Tipografía dinámica con tope.** Todo texto respeta
   `maxFontSizeMultiplier`, y el barrido lo verifica pantalla por pantalla. La
   densidad es exactamente lo que se rompe en el tamaño accesible más grande,
   así que esto deja de ser trámite.

---

## 12. Accesibilidad

Las reglas existentes no se relajan, y la dirección elegida las tensiona en tres
puntos concretos que hay que vigilar:

| Riesgo que introduce EDITORIAL GRID | Cómo se controla |
|---|---|
| Tipografía chica por densidad | Barrido de tipografía dinámica en el tamaño más grande |
| Obras chicas en masonry → objetivos táctiles chicos | ≥44pt siempre, con `hitSlop` cuando el elemento visual es menor |
| Navegación flotante sobre imagen | Relleno casi opaco, contraste verificable; nunca vidrio |
| El color de familia como único portador de significado | La etiqueta dice el estilo en palabras; el color solo acelera |

Y la que no se negocia: **todo gesto tiene un botón equivalente con etiqueta**.
El swipe del mazo ya lo tiene; la grilla, la hoja y los filtros también tienen
que tenerlo.

---

## 13. Cómo se verifica que esto sea MESH

Preguntas para la revisión final, tomadas del brief y contestables mirando:

- ¿El contenido es el héroe, o lo es la interfaz?
- ¿Se parece a un marketplace genérico? ¿A Tinder? ¿A Pinterest? ¿A Airbnb?
- ¿Se entiende **por qué** alguien encaja, sin un número?
- ¿Se puede navegar sin saber qué se busca? ¿Y buscar sabiendo exactamente qué?
- ¿Se llega rápido a una persona?
- ¿Funcionaría con fotógrafos? ¿Con diseñadores?
- ¿Alguien la volvería a abrir?

La última es la que importa, y la que no se contesta desde acá: se contesta
mirando si alguien vuelve, y **MESH no optimiza tiempo en pantalla**. El éxito
es que la persona se vaya pensando "encontré a alguien", no que se quede una
hora.
