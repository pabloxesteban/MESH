# MESH — Investigación de UX 2026: marketplace de descubrimiento

**Estado:** Investigación · **Fecha de investigación:** 2026-08-19 ·
**Responsable:** `ux-researcher` · **Destino:** `interaction-designer`,
`design-system-engineer`, auditado por `product-critic`

Este documento **suma** a `docs/research/`. No reemplaza ni contradice
`mobile-patterns.md`, `competitive-analysis.md`, `navigation-research.md` ni
`MESH-UX-STRATEGY.md`. Donde encontré algo que corrige un documento existente,
lo digo en §8 y §9 en vez de reescribirlo por lo bajo.

## Por qué existe

El dueño del producto corrigió el encuadre: **MESH no es "Tinder para
profesionales", es un marketplace de descubrimiento de personas y servicios**.
La obra es el mecanismo de descubrimiento; la persona es el destino. El
recorrido es:

```
DESCUBRIR → EXPLORAR → ENTENDER → CONFIAR → ENCAJAR → CONTACTAR
```

El swipe se conserva, pero deja de ser el modelo de navegación entero. Eso
cambia qué productos son referencia relevante: la familia estructural pasa de
"apps de citas" a "marketplaces de descubrimiento" (Airbnb) y "descubrimiento
visual curado" (Cosmos, Are.na). `competitive-analysis.md` ya había evaluado
esos productos, pero desde el encuadre viejo — este documento los vuelve a
mirar desde el encuadre nuevo, que es más exigente.

## Cómo leer este documento

Cada hallazgo lleva **una** de estas tres etiquetas, que es el pedido explícito
del brief:

| Etiqueta | Qué significa |
|---|---|
| **PATRÓN ESTABLECIDO** | Lleva años, está en las guías de plataforma o en varios productos grandes independientes entre sí, sobrevivió al menos a un ciclo de modas |
| **TENDENCIA** | Se está consolidando, hay evidencia en producto real, todavía puede no cuajar |
| **MODA** | Se ve mucho hoy y hay razones concretas para creer que envejece mal |

Y además: **Recomendación** (Usar / Adaptar / Rechazar), **Riesgo para MESH**, y
**Confianza** (Alta / Media / Baja). Un hallazgo sin "qué hacemos con esto" no
entró.

Jerarquía de fuentes, igual que el resto del directorio: Nivel 1 (guías
oficiales de plataforma, documentación primaria del producto, comunicación
oficial de la compañía) > Nivel 2 (NN/g, Baymard, publicaciones con proceso
editorial) > Nivel 3 (blogs, reportes de tendencias) > Nivel 4 (opinión suelta,
solo termómetro).

---

## 0 · Lo que NO pude verificar

Esto va primero a propósito. Un documento con una fuente inventada es peor que
un documento corto.

- **Mobbin** — `https://mobbin.com/glossary/bottom-sheet` devolvió **HTTP 403**
  el 2026-08-19. No pude leer nada de Mobbin en este ciclo. `mobile-patterns.md`
  cita Mobbin de un ciclo anterior; no lo re-verifiqué y no lo uso acá.
- **Awwwards** — no lo consulté. Es un showcase de trabajo web, en buena parte
  especulativo; para patrones de producto móvil sería Nivel 3/4 y no aporta por
  encima de lo que ya tengo en Nivel 1.
- **Baymard, caso Airbnb** — `https://baymard.com/ux-benchmark/case-studies/airbnb`
  es **de pago**. Lo público dice que revisaron 579 elementos de diseño
  (16 pantallas desktop, 18 de web móvil, 18 de app), última revisión
  **diciembre 2025**, primer benchmark abril 2022. El puntaje y los hallazgos
  concretos están detrás del muro. Uso sus artículos **gratuitos**, que sí leí.
- **HIG de Apple: página "What's new"** — devolvió 404. Reconstruí la
  cronología con los *change logs* de cada página del HIG, que sí son legibles.
- **Material Design 3** — `m3.material.io` es una SPA que no renderiza sin
  JavaScript; el HTML crudo trae solo el título. **No pude leer la guía de
  Material sobre navigation bar en este ciclo.** Todo lo que digo de Android
  acá está sin fuente de plataforma y lo marco como tal.
- **Detalle fino de la UI de Airbnb** (barra de filtros horizontal, panel de
  filtros a pantalla completa, CTA fija de reserva): lo describen fuentes
  Nivel 3 y coincide con lo que Baymard recomienda como patrón general, pero
  **no encontré fuente primaria de Airbnb que lo documente**. Lo trato como
  "patrón de marketplace confirmado por Baymard", no como "así lo hace
  Airbnb".
- **Sheets de altura parcial con fondo Liquid Glass en iOS 26**: apareció en el
  resumen de búsqueda de `developer.apple.com` (sesiones WWDC25), pero la
  página del HIG sobre Sheets que sí leí **no** lo menciona. **No verificado de
  primera mano.**
- **Financiación de Cosmos** ($15M Serie A, enero 2026) y su fundación en 2021:
  fuentes Nivel 3. WWD (Nivel 2) redirigió a un muro de pago. **No verificado.**
  No lo uso para sostener ningún argumento.
- **"Pinterest paralysis"**: el fenómeno está descrito en blogs (Nivel 3/4) sin
  estudio controlado detrás. Uso en su lugar el hallazgo de NN/g sobre scroll
  infinito, que es Nivel 2 y cubre el mismo terreno con más rigor.

---

## 1 · Airbnb — arquitectura de descubrimiento

Airbnb es la referencia estructural correcta para el encuadre nuevo: gente que
ofrece algo, listada, explicada y contactable, descubierta por imagen. Lo que
sigue separa **lógica de producto reutilizable** de **identidad visual de
Airbnb**, que es la parte que MESH no puede tocar.

### 1.1 Cuatro pestañas que son cuatro momentos, no cuatro secciones

**Clasificación: PATRÓN ESTABLECIDO.**

**Qué es.** Airbnb organizó su app en pestañas que corresponden a estados del
recorrido, no a tipos de contenido: **Explore** (descubrir), **Trips**
(lo que ya decidiste), **Messages** (hablar), **Profile** (vos).

**Evidencia.** Comunicación oficial de Airbnb, 2025 Summer Release,
**13 de mayo de 2025**: Explore es "an all-new homepage to discover homes in
popular destinations, experiences that fit your schedule, and services around
the world"; Trips es "an advanced travel itinerary"; Messages es "a revamped
messaging platform with photo and video sharing". En el 2026 Summer Release
(**20 de mayo de 2026**) el homepage se reorganizó con "tabs for All, Homes,
Experiences, and Services" — o sea, la segmentación por *tipo de oferta* bajó
un nivel, adentro de Explore, en vez de subir a la barra de pestañas.
Nivel 1 ([2025](https://news.airbnb.com/airbnb-2025-summer-release/),
[2026](https://news.airbnb.com/airbnb-2026-summer-release/)).

**Fortaleza.** Cuando Airbnb pasó de un producto (alojamiento) a tres (más
servicios y experiencias), **no agregó pestañas**: agregó un nivel adentro de
Explore. La barra siguió siendo un mapa del recorrido.

**Debilidad.** Trips solo tiene sentido cuando hay reservas. En un producto sin
transacción, el equivalente de Trips está vacío casi siempre — y una pestaña
vacía crónica es peor que no tenerla.

**Aplicación a MESH.** Es exactamente la estructura que MESH ya tiene:
**Inicio** (descubrir) · **Búsqueda** (dirigido) · **Matches** (lo que encajó,
con los hilos de chat) · **Perfil** (vos). Coincide sin haber copiado. Y da el
argumento que faltaba para lo que viene: cuando MESH sume una segunda categoría
después de tatuajes, **la categoría entra adentro de Inicio, no como pestaña**.
Es la misma jugada que hizo Airbnb con Homes/Experiences/Services.

**Riesgo para MESH.** Bajo. Es arquitectura de información, no lenguaje visual.
El riesgo real es el inverso: usar esto para justificar una quinta pestaña.
`CLAUDE.md` dice cuatro y ninguna más, y Airbnb refuerza esa regla, no la
relaja.

**Recomendación: Usar** — como confirmación de la estructura existente y como
regla escrita para el crecimiento futuro de categorías.
**Confianza: Alta.**

### 1.2 Filtros progresivos: pocos arriba, el resto en una hoja, con conteo

**Clasificación: PATRÓN ESTABLECIDO.**

**Qué es.** En móvil: un disparador de filtros siempre visible; los filtros se
abren en un cajón a pantalla completa o en una hoja inferior; los resultados se
aplican con un botón explícito que dice cuántos resultados quedan.

**Evidencia (Nivel 2, y es la más sólida de esta sección).**
Baymard, *What Is an Ecommerce Filter? UI Best Practices*: en móvil recomiendan
"full-screen drawer or bottom sheet with a sticky, always-visible filter
trigger button" y un botón explícito de tipo "Show X Results" para evitar
refrescos desorientadores. Y el hallazgo más fuerte: mostrar el conteo de
resultados al lado de cada opción (`Blue (34)`) es "one of the single
highest-impact improvements you can make to a filter UI". Reportan además que
~14% de los sitios no permiten selección múltiple y ~20% no mantienen visibles
los filtros aplicados.
[Baymard — Ecommerce Filter UI](https://baymard.com/learn/ecommerce-filter-ui).

NN/g llegó a la misma conclusión estructural **once años antes**: el patrón de
"bandeja" (*tray*) sobre los resultados existe para que la persona vea "how
their selections affect the results set without switching screens", y "instant
results are an important part of the process" porque permite darse cuenta al
toque de que aplicó un filtro equivocado o demasiado restrictivo.
Kathryn Whitenton, **26 de julio de 2015**,
[NN/g — Mobile Faceted Search with a Tray](https://www.nngroup.com/articles/mobile-faceted-search/).
**Es de 2015, y lo uso igual**: el patrón sigue siendo el que Baymard recomienda
en 2026, con una fuente independiente. Esa convergencia a once años de distancia
es justamente lo que separa un PATRÓN ESTABLECIDO de una TENDENCIA.

**Debilidad.** El conteo en vivo tiene un costo: cada cambio de filtro es una
consulta. Con 8–15 artistas en CABA es trivial; con 500 no lo es.

**Aplicación a MESH.** MESH hoy no tiene filtros y **está bien que no los
tenga** — con una docena de artistas, filtrar es una operación sin sentido.
Pero cuando el catálogo crezca lo suficiente para justificarlos, el diseño ya
está decidido por evidencia:

1. Hoja inferior con *detents* (`mobile-patterns.md` ya lo aprobó), no pantalla
   nueva.
2. Botón de aplicar que dice el número: **"Ver 7 artistas"**, no "Aplicar".
3. Conteo por opción cuando el conteo sea barato de calcular.
4. Filtros aplicados visibles **después** de cerrar la hoja, y removibles de a
   uno.

**Riesgo para MESH.** Medio, y no es de UI: es de producto. Un panel de filtros
rico es la forma más rápida de convertir MESH en un directorio con buscador —
que es exactamente lo que `product-critic` marca como el fracaso de MESH. El
filtro tiene que quedar subordinado al gusto aprendido, nunca reemplazarlo.
**Regla concreta: los filtros no entran hasta que el catálogo de una ciudad
pase de ~40 profesionales.** Antes de eso son fricción sin decisión detrás.

**Recomendación: Adaptar, con umbral** — diseño definido, implementación
diferida hasta que el catálogo lo justifique.
**Confianza: Alta** en el patrón; **Media** en el umbral de 40, que es un juicio
mío, no un número de la evidencia.

### 1.3 Página de detalle: la CTA no se pierde al hacer scroll

**Clasificación: PATRÓN ESTABLECIDO.**

**Qué es.** En una página de detalle larga, el resumen del ítem y la acción
principal se fijan (arriba o abajo) para que la persona nunca quede a diez
pantallazos de la única cosa que tiene que poder hacer.

**Evidencia.** Baymard, *Product Page UX Best Practices* (actualizado
**18 de marzo de 2026**, publicado originalmente 24 de octubre de 2023): el
razonamiento es que "more product information is virtually always better", lo
que produce el problema de que "users can sometimes end up very far away from
the core context of the product... and the 'Buy' button". Y el dato de contexto:
solo **48%** de los sitios desktop y **38%** de los móviles alcanzan un
desempeño "decent" o mejor en la página de detalle, sobre 30.000+ evaluaciones
manuales.
[Baymard — Product Page UX Best Practices](https://baymard.com/blog/current-state-ecommerce-product-page-ux).

Apple lo dice desde el otro lado, en el HIG de *Toolbars* (Nivel 1): "Use the
`.prominent` style for key actions such as Done or Submit. This separates and
tints the action so there's a clear focal point. **Only specify one primary
action.**"
[Apple HIG — Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars).

**Aplicación a MESH.** El perfil de artista (`product-spec.md` §9) es
exactamente una página de detalle larga: obra a sangre, identidad, portfolio,
sobre, estilos, precios, redes, y al final **"Hablá con {nombre}"**. Hoy esa
CTA vive al final del scroll. La recomendación concreta: **una barra fija
inferior con la CTA de contacto, que aparece cuando la obra principal sale de
vista.** Una sola acción — no una fila de tres botones, porque Apple es
explícito en que solo hay una acción primaria.

Detalle que importa: la CTA fija **no puede aparecer desde el frame cero**. Si
aparece antes de que la persona haya visto obra, MESH está pidiendo contactar a
alguien que todavía no entendió. La barra tiene que entrar en ENTENDER, no en
EXPLORAR.

**Riesgo para MESH.** Medio. Una CTA persistente es la frontera entre "está a
mano" y "te está apurando". La mitigación es que sea **una sola**, que **no
tenga urgencia** ("Hablá con Camila", no "Reservá ahora — pocos lugares"), y
que **nunca lleve contador ni escasez**. `CLAUDE.md` §3 lo prohíbe.

**Recomendación: Adaptar** — barra fija inferior en el perfil de artista, una
sola acción, aparición diferida por scroll, sin urgencia.
**Confianza: Alta.**

### 1.4 Divulgación progresiva del detalle, no de la decisión

**Clasificación: PATRÓN ESTABLECIDO.**

**Evidencia.** Apple, HIG de *Sheets* (Nivel 1): "In an iPhone app, consider
supporting the medium detent to allow progressive disclosure of the sheet's
content." Y el límite del patrón, en la misma página: "For complex or prolonged
user flows, consider alternatives to sheets."
[Apple HIG — Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets).

NN/g pone el límite todavía más duro: las hojas inferiores son para
interacciones breves, **no** para mostrar detalles de producto ni contenido
complejo, y no deberían reemplazar la navegación normal entre pantallas.
Page Laubheimer, **11 de junio de 2023**,
[NN/g — Bottom Sheets](https://www.nngroup.com/articles/bottom-sheet/).

**Aplicación a MESH.** Confirma la línea que `mobile-patterns.md` ya trazó y la
hace más precisa. Hoja inferior: qué significa "fine-line", el "¿por qué esta
persona?", filtros (cuando existan). Pantalla completa: contacto, alta de
artista, armado de una búsqueda. La regla en una frase: **la hoja explica, la
pantalla decide.**

**Riesgo para MESH.** Bajo. Es componente de plataforma.

**Recomendación: Usar** — sin cambios respecto de lo ya documentado, con la
regla "la hoja explica, la pantalla decide" agregada como criterio.
**Confianza: Alta.**

### 1.5 Señales de confianza: lo que Airbnb hace y MESH NO puede hacer

**Clasificación: TENDENCIA — y para MESH, Rechazar.**

**Qué es.** Airbnb resolvió el volumen de reseñas sintetizándolas con IA. Del
2026 Summer Release, textual: *"Airbnb has over one billion guest and host
reviews. Now you don't have to read through them all."* Los "AI review
highlights" sintetizan reseñas destacando "location, amenities,
family-friendliness, and more"; una vista de comparación con IA resume cada
casa guardada en la wishlist.
Nivel 1, **20 de mayo de 2026**,
[Airbnb 2026 Summer Release](https://news.airbnb.com/airbnb-2026-summer-release/).

**Por qué NO va a MESH, y es doble.** Primero, MESH no tiene reseñas —
`product-spec.md` §2 las deja fuera de alcance. Segundo, y más de fondo: aunque
las tuviera, un resumen generado por modelo es texto libre sobre una persona
real, y `CLAUDE.md` §2 lo prohíbe de forma innegociable ("nada de reseñas,
testimonios... inventados"). Un resumen de IA sobre un artista es una frase que
MESH no puede sostener con evidencia línea por línea.

**Lo que sí se aprende.** El problema que Airbnb resolvió mal para MESH es real
y MESH lo va a tener: **un portfolio de 40 piezas es tan poco navegable como mil
reseñas.** La respuesta de MESH no puede ser resumir; tiene que ser **ordenar
con la señal que ya tiene**. El motor de gusto de `packages/domain` sabe qué
estilos lee fuerte en esta persona. Ordenar el portfolio de un artista poniendo
primero **las piezas del estilo que esta persona ya marcó** es determinístico,
explicable, no inventa nada, y resuelve el mismo problema.

**Riesgo para MESH.** Alto si se copia; nulo si se adapta como digo arriba. El
riesgo del orden personalizado es que la persona no entienda por qué ve lo que
ve — se mitiga con una línea honesta encima de la grilla: *"Ordenado por lo que
venís marcando"*, con la opción de volver al orden del artista.

**Recomendación: Rechazar** la síntesis por IA. **Adaptar** el problema: orden
del portfolio por gusto, determinístico, etiquetado y reversible.
**Confianza: Alta.**

### 1.6 Qué de Airbnb es identidad visual y NO se toca

Esto es la parte del pedido que más importa proteger.

| De Airbnb | Reutilizable como lógica | Prohibido copiar |
|---|---|---|
| Pestañas = momentos del recorrido | **Sí** — es arquitectura de información | — |
| Hoja de filtros + botón con conteo | **Sí** — es patrón de marketplace, confirmado por Baymard y NN/g | La segmentación con tira horizontal de íconos de categoría en la cabecera. Eso es la firma visual de Airbnb desde 2022 |
| CTA fija en detalle | **Sí** — una acción, sin urgencia | La tarjeta de reserva con precio, calendario y desglose. MESH no tiene precio ni reserva; imitar esa caja sería inventar |
| Divulgación progresiva | **Sí** | — |
| — | — | El sistema de íconos "curved, bold, full of personality" y la tipografía **Cereal**. MESH tiene su propio sistema — ADR-008 / ADR-010 y `docs/design/visual-language.md` |
| — | — | Los badges de "Superhost" / "Huésped favorito". Son escasez social sobre personas reales, sin datos que los sostengan en MESH |
| — | — | Resúmenes generados por IA sobre una persona (§1.5) |

Y una nota de proceso: `competitive-analysis.md` ya había marcado el calendario
de disponibilidad de Airbnb como "cosa que ya mataste". **Esta investigación no
lo revive.** El encuadre de marketplace no reabre esa puerta: Airbnb es
referencia de *arquitectura de descubrimiento*, no de gestión de agenda.

---

## 2 · Apple / iOS 26 — qué cambió de verdad

Esta es la sección donde más fácil es repetir blogs. Fui a la fuente: leí el HIG
vivo (`developer.apple.com`, copyright 2026) vía su API de documentación,
porque las páginas HTML son SPA y no se pueden leer sin JavaScript. **Todo lo
que va entre comillas acá está citado textual del HIG oficial.** Lo que no pude
verificar lo digo.

### 2.0 La cronología, reconstruida de los change logs

La página "What's new" del HIG da 404. Pero cada página del HIG trae su propio
change log, y de ahí sale la cronología real:

| Fecha | Qué dice el change log de *Tab bars* |
|---|---|
| **28 de julio de 2025** | "Added guidance for Liquid Glass." |
| **16 de diciembre de 2025** | "Updated guidance for Liquid Glass." |
| **8 de junio de 2026** | "Updated terminology and art." |

Traducción: **Liquid Glass entró al HIG en julio de 2025, se corrigió en
diciembre de 2025, y en junio de 2026 (WWDC26) hubo un ajuste de terminología y
arte, no una refundación.** El sistema de iOS 26 sigue siendo el sistema vigente
en agosto de 2026. Cualquier blog que hable de "el nuevo lenguaje de 2026" como
si fuera algo distinto de Liquid Glass está estirando el ciclo de noticias.

### 2.1 Navegación flotante — qué dice Apple exactamente

**Clasificación: PATRÓN ESTABLECIDO en su forma, TENDENCIA en su adopción por
apps de terceros.**

**Lo verificado, textual del HIG, sección iOS de *Tab bars*:**

> "A tab bar floats above content at the bottom of the screen. Its items rest on
> a [Liquid Glass] background that allows content beneath to peek through."

Y la regla que **no** cambió, del mismo documento:

> "Make sure the tab bar is visible when people navigate to different sections
> of your app. If you hide the tab bar, people can forget which area of the app
> they're in."

[Apple HIG — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars). Nivel 1.

**El malentendido más común, corregido.** Muchos blogs afirman que en iOS 26 la
tab bar "se minimiza al hacer scroll". El HIG condiciona ese comportamiento:

> "**For tab bars with an attached accessory, like the MiniPlayer in Music,**
> you can choose to minimize the tab bar and move the accessory inline with it
> when a person scrolls down. A person can exit the minimized state by tapping a
> tab or scrolling to the top of the view."

O sea: **minimizar al scrollear es una función de las apps que tienen un
accesorio persistente sobre la barra** (un reproductor), no un comportamiento
por defecto ni una recomendación general. Apple no dice "minimizá tu tab bar
para dar aire". Dice lo contrario: mantenela visible.

**Aplicación a MESH.** MESH no tiene accesorio persistente. **No implementar
minimize-on-scroll.** El mazo de Inicio es de a una tarjeta por diseño, no hay
scroll largo que lo justifique, y en las superficies que sí scrollean (perfil de
artista, matches) esconder la barra le quitaría a la persona el mapa de dónde
está — que es exactamente contra lo que advierte el HIG.

**Lo que sí vale adoptar: la separación de capas.** De la página de *Materials*,
textual:

> "Liquid Glass forms a distinct functional layer for controls and navigation
> elements — like tab bars and sidebars — that floats above the content layer,
> establishing a clear visual hierarchy between functional elements and content."

Y de la sesión de WWDC25 *Get to know the new design system* (Nivel 1, Apple):
"Liquid Glass defines a new functional layer in the UI, floating above your
content to bring structure and clarity, **without ever stealing focus**."
[WWDC25 — Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/).

Eso es una idea de jerarquía, no un efecto: **la obra es contenido; la barra es
control; nunca compiten.** Es exactamente la jerarquía absoluta que
`product-spec.md` §6 ya declaró para la tarjeta de descubrimiento (obra →
artista → estilo → contexto → controles). Coincidencia, no préstamo.

**Riesgo para MESH.** Bajo si se toma la jerarquía; **alto si se toma el
material**. Ver §2.4.

**Recomendación: Adaptar la jerarquía de capas. Rechazar
minimize-on-scroll.**
**Confianza: Alta** — es cita textual de Nivel 1.

### 2.2 Continuidad espacial: el sheet nace de donde lo tocaste

**Clasificación: TENDENCIA.**

**Lo verificado.** De WWDC25 sesión 356, textual: sobre el Action Sheet, *"It
used to appear at the bottom of the screen, no matter where the action came
from. Now, it springs from the action itself, which serves as the source for the
action sheet."*

Y sobre las transiciones: *"Scroll edge effects reinforce that boundary,
replacing hard dividers with subtle blur to reduce clutter and keep UI
legible."*

El HIG de *Toolbars* dice lo mismo en formato de regla: "Reduce the use of
toolbar backgrounds and tinted controls... use a scroll edge effect when
necessary to distinguish the toolbar area from the content area."

**Por qué importa.** Es el mismo principio que MESH ya persigue con la
transición de elemento compartido: *este panel salió de ese botón*, *esta
pantalla es esa miniatura, más grande*. Apple lo convirtió en comportamiento de
sistema en vez de efecto opcional.

**La contrapartida técnica, y es dura.** MESH corre en Expo SDK 57. La
transición de zoom nativa de iOS está documentada por Expo como:

> "Zoom transition is an **alpha** API available on **iOS only** in Expo SDK 55
> and later."

Requiere **iOS 18+**, funciona **solo con el Stack navigator** del router, se
implementa con `Link.AppleZoom` / `Link.AppleZoomTarget`, y — el dato que
decide el asunto — la documentación lista entre sus limitaciones un
**"noticeable delay (approximately 1 second) when navigating to or dismissing
screens"**, además de recomendar evitarla junto con headers de navegación.
Modificado **2 de abril de 2026**.
[Expo — Zoom transition](https://docs.expo.dev/router/advanced/zoom-transition/). Nivel 1.

**Esto corrige `mobile-patterns.md`.** Ese documento dejó la transición de
elemento compartido en "Adaptar, confianza Media, falta verificar estabilidad".
Ya está verificado: **un segundo de demora al abrir el perfil de un artista es
inaceptable** en el camino más caliente del producto. `docs/architecture/system-architecture.md`
tiene presupuestos de performance; un segundo de latencia percibida por
decoración los quiebra sin discusión.

**Aplicación a MESH.** Rechazar la API nativa de zoom para el camino
mazo → perfil mientras siga en alpha y con esa latencia. Conseguir la
continuidad espacial con lo que MESH ya tiene y ya controla: Reanimated 4.5 +
Gesture Handler 2.32. Una transición propia de ~250–300ms bajo el techo de
500ms que ya impone `tokens/motion.ts`, con `prefers-reduced-motion`
reemplazando transformación por fundido corto. Es menos "nativo" y es
mensurablemente mejor.

**Riesgo para MESH.** Bajo con la implementación propia. Alto con la API alpha.

**Recomendación: Adaptar el principio, Rechazar la implementación nativa por
ahora.** Re-evaluar cuando la API salga de alpha y la demora esté resuelta.
**Confianza: Alta** — la limitación está en la documentación oficial de Expo, no
es inferencia.

### 2.3 Búsqueda como pestaña dedicada

**Clasificación: PATRÓN ESTABLECIDO.**

**Lo verificado.** HIG de *Searching*, textual: "If search is important, give it
a primary position in your app or view... **In apps that use tab bars, like
Photos and Apple TV, search is a dedicated tab.**" Y el HIG de *Tab bars*: "A
tab bar can include a dedicated search tab at the trailing end."
[Apple HIG — Searching](https://developer.apple.com/design/human-interface-guidelines/searching). Nivel 1.

De WWDC25 356: "iOS now includes a dedicated Search tab at the bottom, making it
quicker to access and easier to reach."

**Aplicación a MESH.** Valida la pestaña **Búsqueda** de `CLAUDE.md` — que en
MESH no es un campo de texto sino subir fotos de algo que te gusta (ADR-011).
Dos consecuencias concretas:

1. **Búsqueda va última entre las cuatro**, en el borde de arranque del pulgar,
   que es donde Apple la pone. Hoy `CLAUDE.md` la lista segunda. Es una nota
   para `interaction-designer`, no una orden — con cuatro pestañas la diferencia
   es chica.
2. El HIG advierte: "Take privacy into consideration before displaying search
   history. People might not appreciate having their search history appear where
   others might see it." **Las fotos de referencia que alguien sube a Búsqueda
   son ese caso.** Si MESH muestra búsquedas recientes con miniaturas de las
   fotos subidas, tiene que haber una forma de borrarlas. Esto toca ADR-011 y no
   lo vi cubierto ahí.

**Riesgo para MESH.** Bajo. El punto 2 es un hallazgo de privacidad accionable,
no un riesgo de diseño.

**Recomendación: Usar.** Y abrir el punto de borrado de historial como pregunta
para `supabase-security` y ADR-011.
**Confianza: Alta.**

### 2.4 Materiales translúcidos — el hallazgo más importante de esta sección

**Clasificación: MODA cuando se usa como estética. PATRÓN ESTABLECIDO cuando se
usa como capa funcional. La diferencia no es de grado.**

**Lo que dice Apple, textual, y hay que leerlo entero:**

> "**Don't use Liquid Glass in the content layer.** Liquid Glass works best when
> it provides a clear distinction between interactive elements and content, and
> including it in the content layer can result in unnecessary complexity and a
> confusing visual hierarchy."

> "**Use Liquid Glass effects sparingly.** Standard components from system
> frameworks pick up the appearance and behavior of this material automatically.
> If you apply Liquid Glass effects to a custom control, do so sparingly. Liquid
> Glass seeks to bring attention to the underlying content, and overusing this
> material in multiple custom controls can provide a subpar user experience by
> distracting from that content."

> "**Only use clear Liquid Glass for components that appear over visually rich
> backgrounds.**" — y para esos casos: "If the underlying content is bright,
> consider adding a dark dimming layer of 35% opacity."

[Apple HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/materials). Nivel 1.

**Y el dato que casi nadie cita, del mismo párrafo:**

> "The appearance of these variants can differ in response to certain system
> settings, like if people choose **a preferred look for Liquid Glass in their
> device's settings**, or turn on accessibility settings that reduce
> transparency or increase contrast in the interface."

Apple documenta que existe una **preferencia de usuario para atenuar Liquid
Glass**, además de las de accesibilidad. Eso es Nivel 1 y es verificable. Que
esa preferencia se haya agregado *como respuesta a una reacción negativa* lo
reportan fuentes Nivel 3 — [TechSpot](https://www.techspot.com/news/109517-performance-design-complaints-mount-after-ios-26-liquid.html),
[Gulf News sobre el control "Tinted" en iOS 26.1 beta](https://gulfnews.com/technology/companies/apple-yields-tinted-control-in-ios-261-beta-4-tones-down-liquid-glass-after-backlash-1.500315176) —
y un hilo en los foros de desarrolladores de Apple titulado
["iOS 26 UI transparency causes readability and accessibility issues"](https://developer.apple.com/forums/thread/811219),
que es Nivel 4 alojado en un sitio Nivel 1: sirve de termómetro, no de
evidencia. **No presento la relación causal como establecida.** Lo establecido
es que la preferencia existe.

**Por qué esto es lo más importante para MESH.** MESH es una app donde **el
contenido es imagen de alto detalle sobre fondo cambiante** — tatuajes, línea
fina, negro sobre piel. Es el peor caso posible para material translúcido. Y la
regla de Apple sobre lo mismo, del HIG de *Tab bars*, es directa:

> "Avoid applying a similar color to tab labels and content layer backgrounds.
> **If your app already has bright, colorful content in the content layer,
> prefer a monochromatic appearance for tab bars**, or choose an accent color
> with sufficient visual differentiation."

**Aplicación a MESH.**

- **Cero translucidez en la capa de contenido.** La tarjeta de obra, la grilla
  de portfolio, la banda de encaje: opacos. No es preferencia estética, es la
  regla explícita de Apple.
- **En la barra de pestañas y en la barra de CTA del perfil**, si se adopta
  translucidez, tiene que ser la variante *regular*, con contraste probado
  contra una obra clara y una oscura, y con `prefers-reduced-transparency`
  colapsando a opaco. Eso es un token, no un valor suelto — va a
  `design-system-engineer`, no a la pantalla.
- El estilo "vidrio" **nunca** entra al lenguaje de marca de MESH. ADR-010
  define el sistema de color; `visual-language.md` define la voz visual. Un
  material que cambia según lo que hay detrás es lo contrario de un sistema de
  color determinístico.

**Riesgo para MESH.** **Alto**, y de los dos lados. Copiar Liquid Glass como
estética le da a MESH la cara de "app de iOS 26 de 2026", que es exactamente el
tipo de fecha de vencimiento que `CLAUDE.md` no quiere. Ignorar la capa
funcional le da a MESH controles que compiten con la obra.

**Recomendación: Rechazar** el material como lenguaje visual.
**Adaptar** la separación capa funcional / capa de contenido, que es la idea
detrás y no tiene vencimiento.
**Confianza: Alta.**

### 2.5 Formas concéntricas

**Clasificación: TENDENCIA.**

De WWDC25 356, textual: *"We use three shape types to build concentric layouts:
fixed shapes have a constant corner radius. Capsules use a radius that's half
the height of the container. And concentric shapes calculate their radius by
subtracting padding from the parent's."*

**Aplicación a MESH.** La regla del radio concéntrico (`radio hijo = radio padre
− padding`) es geometría, no moda, y arregla un defecto visual real: una imagen
con esquinas redondeadas adentro de una tarjeta con esquinas redondeadas se ve
mal cuando los radios no están relacionados. Es un cambio chico y de bajo riesgo
en `tokens/radius.ts`: exponer un helper `concentric(parentRadius, padding)` en
vez de una escala de radios sueltos.

**Riesgo para MESH.** Muy bajo. Es matemática de layout, sin firma visual.

**Recomendación: Adaptar** — helper en el design system, sin tocar pantallas.
**Confianza: Media** — el principio es sólido; que MESH tenga hoy el problema
que resuelve no lo verifiqué leyendo el código de tokens.

---

## 3 · Cosmos / Are.na — composición editorial e interfaces calmas

### 3.1 Coleccionar como acto deliberado, no como like descartable

**Clasificación: PATRÓN ESTABLECIDO** (Are.na existe desde hace más de una
década con el mismo modelo).

**Evidencia, Nivel 1 — la propia página de Are.na:** se describe como "a place
to save content, create collections over time and connect ideas. Privately or
with other people", y su declaración más filosa: **"We are the only social media
company whose only customers are the people who use it."** El modelo es
suscripción, sin publicidad ni feed algorítmico; declaran la intención de
convertirse en *public benefit corporation* para blindar la misión.
[Are.na — About](https://www.are.na/about).

**Evidencia, Nivel 1 — descripción propia de Cosmos en la App Store:** "Your
space for inspiration. Cosmos is where inspiration lives — built for curated
discovery, saving ideas, and sharing with collaborators and friends." Entre las
funciones que lista: **"Search by color, keyword, or image"**, "Save anything in
one tap", **"Shape your profile and share your taste"**, y —esto es
notable— **"Hide AI content and keep your feed human"**. Versión 2.49.0,
calificación 4,7/5 sobre ~4.700 valoraciones.
[Cosmos en la App Store](https://apps.apple.com/us/app/cosmos-search-discover/id1577975475).
*(La fecha de la versión figura como "8 de agosto" sin año visible en lo que
pude leer.)*

**Por qué importa.** Dos productos independientes, con modelos de negocio
distintos, llegaron a la misma conclusión: **el valor está en que guardar
signifique algo.** Are.na lo hace sacando el algoritmo. Cosmos lo hace sacando
likes, comentarios y publicidad, y agregando un filtro explícito contra
contenido generado por IA.

**Aplicación a MESH.** MESH ya distingue *me gusta* de *guardar* — y esta
evidencia dice que esa distinción es el activo, no un detalle. Recomendación
concreta y chica:

- **Guardar tiene que tener un destino visible.** Hoy "Tu gusto" muestra estilos
  inferidos; lo guardado debería poder verse **como colección de obras**, no
  solo como vector agregado. Es la diferencia entre "MESH te dice qué te gusta"
  y "MESH te devuelve lo que elegiste". Ambas cosas, no una.
- **Guardar no debe alimentar el ranking con el mismo peso que un me gusta sin
  decirlo.** NN/g encontró que la gente espera que su actividad directa
  (guardados, compras, perfil) pese más que el mero navegar, y que le molesta
  que el navegar le sesgue las recomendaciones.
  [NN/g — Individualized Recommendations](https://www.nngroup.com/articles/recommendation-expectations/).
  Esto es verificable contra `docs/product/matching.md`: si guardar pesa más que
  me gusta, la interfaz tiene que poder decirlo.

**Riesgo para MESH.** Bajo, con **una** advertencia grande: una vista de
colección es la puerta de entrada al fracaso que `product-critic` §3 ya nombró —
"si una feature se queda en *qué me gusta* y nunca llega a una persona, es
Pinterest". Mitigación estructural: **en la vista de guardados, cada obra
muestra a su autor y lleva a su perfil.** La colección no es un tablero de
imágenes; es una lista de gente ordenada por obra.

**Recomendación: Adaptar** — vista de guardados con autoría siempre presente.
**Confianza: Alta** en el patrón; **Media** en la prioridad para V1, que le
corresponde decidir a `product-thinking`.

### 3.2 Interfaz calma

**Clasificación: MODA en su versión de reporte de tendencias. PATRÓN
ESTABLECIDO en su versión de producto.**

**Ojo con esta.** Busqué "calm interfaces 2026" y lo que volvió fueron blogs de
agencia y listas de tendencias — Nivel 3, con afirmaciones del tipo "el UI calmo
reemplazó a lo bold and loud de principios de los 2020". **No cito ninguno como
evidencia** porque no hay estudio ni producto medido detrás; es la clase de
afirmación que este directorio ya se cansó de marcar como agencia hablando de sí
misma.

Lo que **sí** es evidencia son Are.na y Cosmos: dos productos que llevan años
enviando, con modelos de negocio que dependen de que la calma sea real (Are.na
cobra suscripción; Cosmos no tiene publicidad). Un producto que se sostiene
económicamente sin vender atención es una prueba más fuerte que cualquier
reporte de tendencias.

**Aplicación a MESH.** MESH ya está de este lado — `product-spec.md` §6 prohíbe
explícitamente confeti, parallax, partículas, "¡estás on fire!" y contadores de
tarjetas. Este hallazgo no agrega una feature: **agrega el argumento de por qué
esa restricción no es austeridad sino posicionamiento**, con dos productos
reales que lo demuestran comercialmente.

**Riesgo para MESH.** El riesgo es de proceso: "interfaz calma" es una frase lo
bastante vaga como para justificar cualquier cosa. La versión operativa para
MESH ya existe y es medible: techo de 500ms en `tokens/motion.ts` impuesto por
test, hápticos solo en acciones decisivas, sin insignias en pestañas (ADR-007).

**Recomendación: Usar** como refuerzo argumental. **Rechazar** cualquier
propuesta que invoque "calm UI" sin traducirse a una restricción testeable.
**Confianza: Media** — alta sobre los dos productos, baja sobre la categoría.

### 3.3 "Hide AI content and keep your feed human"

**Clasificación: TENDENCIA.**

Es una sola función de un solo producto, así que no la sobrevendo. Pero es la
función que Cosmos eligió poner en su descripción de App Store, y en 2026 eso es
una señal de posicionamiento fuerte.

**Aplicación a MESH.** MESH lista artistas reales con obra real. Con
autogestión abierta (ADR-013), **nada impide hoy que alguien suba un portfolio
generado**. Eso no es un problema de UI, es un problema de confianza — y la
confianza es un escalón explícito del recorrido nuevo (CONFIAR). Cosmos muestra
que hay un público que valora la garantía lo suficiente como para que sea
argumento de venta.

**Recomendación: Adaptar como pregunta abierta, no como feature.** Le
corresponde a `product-thinking` y a ADR-013: ¿MESH declara algo sobre obra
generada? Si no puede verificarlo, no puede afirmarlo — `CLAUDE.md` §2. Callarse
es una opción legítima; afirmar sin verificar no.
**Confianza: Baja** — un producto, sin evidencia de impacto.

---

## 4 · Pinterest — qué sirve y qué haría que MESH se vea como Pinterest

### 4.1 Masonry

**Clasificación: PATRÓN ESTABLECIDO como layout. MODA como identidad.**

`2026-trends.md` ya registró masonry con fuente Nivel 3. No agrego fuente nueva
porque no hace falta: el layout de altura variable tiene décadas y no está en
discusión. Lo que agrego es el límite, que sí es evidencia.

NN/g: si se usan grillas de imágenes para navegar, la persona ve del orden de
**4 ítems a la vez**, lo que va contra la pauta de mantener visibles todas las
opciones de navegación para que pueda reconocer en vez de recordar.
[NN/g — Mobile Navigation: Image Grids or Text Lists?](https://www.nngroup.com/articles/image-vs-list-mobile-navigation/). Nivel 2.

**Aplicación a MESH.** Masonry sirve para **el portfolio de un artista** —
donde el objetivo es "mirá el cuerpo de obra de esta persona" y ver 4 a la vez
está bien. **No sirve** para elegir entre artistas, que es una tarea de decisión
donde comparar importa. La grilla de portfolio de `product-spec.md` §9 es el
lugar correcto y el único.

**Riesgo para MESH.** Alto y visual. Masonry a ancho completo, con relación de
aspecto libre y scroll infinito **es** la firma de Pinterest. La diferencia
tiene que ser estructural, no de paleta: en MESH toda grilla de obra pertenece
a **una** persona nombrada arriba, con su CTA de contacto al alcance. Una grilla
masonry de obra de artistas mezclados, sin autoría visible en cada celda, es
Pinterest y hay que rechazarla.

**Recomendación: Adaptar, acotado al portfolio de un artista.**
**Confianza: Alta.**

### 4.2 Scroll infinito

**Clasificación: PATRÓN ESTABLECIDO, y para MESH mayormente Rechazar.**

NN/g: el scroll infinito por listas largas de ítems homogéneos baja el costo de
interacción para **navegar**, pero "is not a good choice for websites that
support goal-oriented finding tasks". Y el problema conductual concreto:
"repeatedly scrolling to review all available options is tiring, and people
often stop once they see an item that looks close enough to what they want".
[NN/g — Infinite Scrolling Is Not for Every Website](https://www.nngroup.com/articles/infinite-scrolling/) ·
[NN/g — Infinite Scrolling: When to Use It, When to Avoid It](https://www.nngroup.com/articles/infinite-scrolling-tips/). Nivel 2.

**Aplicación a MESH.** Esto cierra una discusión que `2026-trends.md` §4 dejó
abierta con BeReal como contraejemplo: **el mazo de MESH tiene que tener fondo,
y ahora hay evidencia de por qué**. Elegir a un profesional es una tarea
dirigida, no navegación ociosa; el scroll infinito la sabotea de forma
documentada. Lo mismo aplica a Matches: es una lista corta, rankeada y
explicada — un final es correcto.

**Riesgo para MESH.** Ninguno por rechazarlo. El riesgo es adoptarlo por
costumbre.

**Recomendación: Rechazar** en descubrimiento y en matches. Aceptable solo
dentro del portfolio de un artista, que sí es navegación.
**Confianza: Alta.**

### 4.3 Búsqueda visual y refinamiento — el patrón que MESH necesita, con el motor equivocado

**Clasificación: TENDENCIA.**

**Evidencia, Nivel 1 — sala de prensa de Pinterest, 5 de mayo de 2025.**
Pinterest agregó: generación automática de términos a partir de la imagen ("the
words they can use to figure out what they like about the image"), con un
"animated glow" marcando los objetos seleccionables; una **barra de
refinamiento** para acotar por estilo, color, ocasión y calce ("similar outfits
but more y2k"); y acceso a "Search image" con toque prolongado sobre cualquier
Pin. Corre sobre Visual Language Models y modelos de embedding multimodales, y
el encuadre de Pinterest es que la gente estaba "limited by not having the right
words".
[Pinterest — Introducing new visual search features](https://newsroom.pinterest.com/news/introducing-new-visual-search-features/).

**Por qué es exactamente el problema de MESH.** "No tengo las palabras para
decir lo que me gusta" es, literalmente, la razón por la que existe la pestaña
Búsqueda de MESH (ADR-011) y por la que el gusto se aprende de decisiones
visuales en vez de un formulario.

**Y acá está el límite duro.** El *refinamiento* de Pinterest es texto libre
generado por modelo. MESH no puede: `CLAUDE.md` §1 permite un modelo **solo**
para clasificar la foto que la propia persona subió, **contra la taxonomía
cerrada de estilos, del lado del servidor, sin texto libre y sin slugs
inventados**. El resultado entra al motor determinístico como un dato más.

**Aplicación a MESH — y es una propuesta concreta.** La barra de refinamiento
de Pinterest **sí** se puede hacer con vocabulario cerrado, y sería mejor que la
de Pinterest en lo que a MESH le importa: **honesta**. Después de clasificar una
foto subida, en vez de mostrar solo el resultado, mostrar los estilos detectados
como **chips ajustables de la taxonomía real** — *"Leemos: Fine Line ·
Botanical. ¿Le agregás Blackwork? ¿Sacás Botanical?"*. Cada chip es un slug
existente; ninguno es texto generado; la persona corrige al clasificador en vez
de aceptarlo. Y el motor de matching sigue siendo puro, porque lo que recibe es
una lista de slugs.

Eso es divulgación progresiva (§1.4), es corrección explícita del sistema — que
es la guía #4 de NN/g para contenido recomendado, "allow users to fine-tune
suggestions" — y no cruza ninguna línea de `CLAUDE.md`.

**Riesgo para MESH.** Medio. Si los chips se ven como una tira horizontal de
píldoras con glow sobre la foto, MESH se ve como Pinterest. La forma tiene que
salir de ADR-008/ADR-010, no de acá; lo que aporta esta investigación es **el
modelo de interacción** (clasificar → mostrar → dejar corregir), no la forma.

**Recomendación: Adaptar** — refinamiento por chips de taxonomía cerrada en la
pestaña Búsqueda. Entregar a `interaction-designer`.
**Confianza: Alta** en el problema y en la viabilidad; **Media** en que sea
prioridad para V1.

### 4.4 "Más ideas" / de admirar a hacer

**Clasificación: TENDENCIA, y es la validación más fuerte de la tesis de MESH
que encontré en toda esta investigación.**

**Evidencia, Nivel 1 — Pinterest, 27 de octubre de 2025.** Los tableros se
reorganizaron en tres solapas: **"Make it yours"** (moda y algo de decoración),
**"More ideas"** (el resto), y **"All saves"**. Vicky Gkiza, VP de Product
Management, describe el objetivo como convertir el tablero en un "personal
shopping assistant, powered by AI, to help users move **from admiring their
dream styles or spaces to actively achieving them**".
[Pinterest — Boards get AI-powered upgrade](https://newsroom.pinterest.com/news/pinterest-boards-get-ai-powered-upgrade-for-personalized-experience/).

**Leelo dos veces.** Pinterest —el producto de descubrimiento visual más grande
del mundo, con más de una década de ventaja— está usando su lanzamiento de
producto de 2025 para intentar cerrar la brecha entre *admirar* y *hacer*.
`competitive-analysis.md` ya lo había dicho por intuición: "Pinterest resuelve
inspiración y falla en conexión humana". Ahora hay evidencia de primera mano de
que **Pinterest está de acuerdo**.

**Por qué MESH está mejor parado.** MESH no tiene que agregar una capa de IA
sobre un tablero para llegar del gusto a la acción: **la obra ya está unida a
una persona contactable desde el primer frame**. La brecha que Pinterest está
gastando plata en cerrar, MESH no la tiene por construcción.

**Aplicación a MESH.** Ninguna feature nueva — y eso es el hallazgo. Es
munición para `product-critic` cuando alguien proponga "tableros" o "colecciones
temáticas": el líder de esa categoría está pagando el costo de haberlas hecho
primero. La regla operativa que se desprende: **ninguna superficie de MESH puede
terminar en una obra. Toda superficie termina en una persona.**

**Riesgo para MESH.** El riesgo es de lectura: alguien podría concluir "entonces
copiemos More ideas". No. More ideas es recomendación de más contenido, que es
el bucle que MESH está tratando de cortar.

**Recomendación: Usar** como principio de arquitectura, escrito.
**Confianza: Alta.**

---

## 5 · Navegación móvil 2026 — ¿hay evidencia de que lo flotante funcione mejor?

**Respuesta corta: no la encontré. Lo que encontré es que Apple hizo flotante su
tab bar por razones de jerarquía visual, y que mantuvo intacta la regla de
persistencia.**

### 5.1 La barra permanente sigue ganando, y la fuente es la misma que cambió el aspecto

**Clasificación: PATRÓN ESTABLECIDO.**

Ya está en §2.1 con cita textual, pero acá está el punto directo del brief.

Lo que cambió en iOS 26: la barra **flota** sobre el contenido y usa un material
translúcido. Lo que **no** cambió: "Make sure the tab bar is visible when people
navigate to different sections of your app." La única excepción que el HIG
admite es la cobertura por un modal, "because a modal is temporary and
self-contained". Y minimizarla al scrollear está condicionado a tener un
accesorio adjunto.

Busqué específicamente estudios comparando barra flotante contra barra fija.
**No encontré ninguno.** Lo que devolvió la búsqueda fueron blogs de agencia
(Nivel 3) repitiendo el argumento del alcance del pulgar, que es sobre
*posición* (abajo vs. arriba), no sobre *flotación*. Ese argumento ya está
cubierto en `navigation-research.md` y no aporta nada nuevo.

**Conclusión honesta: la navegación flotante en iOS 26 es una decisión de
jerarquía visual de Apple, no un hallazgo de usabilidad.** No hay evidencia
pública de que mejore el desempeño. Adoptarla en una app de terceros por
estética es, en 2026, seguir a la plataforma; adoptarla creyendo que mide mejor
es inventar un resultado.

**Y una corrección al pasar, sobre una creencia muy repetida.** NN/g, en su
artículo de hojas inferiores, advierte contra asumir que la posición inferior
mejora el alcance: sostiene que la **zona media** de la pantalla es la más
accesible a través de los distintos modos de agarre.
[NN/g — Bottom Sheets](https://www.nngroup.com/articles/bottom-sheet/), Page
Laubheimer, 11 de junio de 2023. Esto **no** invalida las pestañas inferiores
—que ganan por convención de plataforma y por consistencia, no solo por
ergonomía— pero sí matiza el argumento tal como está escrito hoy en
`navigation-research.md`, que lo presenta como si el alcance fuera la razón
completa. Ver §9.

**Aplicación a MESH.** Cero cambios estructurales. Cuatro pestañas, siempre
visibles, sin minimizar, sin ocultar, sin insignias (ADR-007 ya lo prohíbe y
Apple lo permitiría — MESH es más estricto que la plataforma acá, y con razón:
la insignia es carnada de interacción). Si `design-system-engineer` quiere darle
a la barra separación de la capa de contenido, que lo haga por **contraste y
elevación tokenizados**, no por translucidez (§2.4).

**Riesgo para MESH.** Bajo.

**Recomendación: Usar lo que ya existe, sin cambios.**
**Confianza: Alta.**

### 5.2 Navegación contextual

**Clasificación: MODA.**

La idea de que las pestañas cambien según el contexto o la intención aparece en
reportes de tendencias, pero no la encontré en ninguna guía de plataforma ni en
ningún producto grande enviado. Al contrario: el HIG es explícito en la
dirección opuesta — "Don't disable or hide tab bar buttons, even when their
content is unavailable. Having tab bar buttons available in some cases but not
others makes your app's interface appear unstable and unpredictable."

**Aplicación a MESH.** Rechazar. Y hay un caso concreto donde la tentación va a
aparecer: `CLAUDE.md` dice que al registrarse se pregunta si la persona ofrece
un servicio o está buscando, y que **eso no es un rol excluyente**. La solución
tentadora es cambiar las pestañas según la respuesta. Apple dice que no, y tiene
razón: una barra que cambia es una barra que hay que volver a aprender. "Tu
estudio" vive adentro de Perfil, que es exactamente donde `CLAUDE.md` ya lo
puso.

**Recomendación: Rechazar.**
**Confianza: Alta** — respaldada por cita textual de Nivel 1.

---

## 6 · Marketplaces de servicios creativos — confianza sin reseñas

**Advertencia de calidad de fuentes, y es importante.** Esta es la sección más
débil del documento. Busqué evidencia sobre cómo los marketplaces de servicios
creativos construyen confianza sin reseñas, y lo que volvió fueron
mayoritariamente blogs de proveedores de verificación de identidad — Nivel 3,
con interés comercial directo en la respuesta. **No cito ninguno como
evidencia.** Lo que sigue se apoya en Nivel 1/2 sobre el mecanismo general
(recomendación explicable) más razonamiento propio marcado como tal.

### 6.1 "Por qué esta persona" — la explicación es la señal de confianza

**Clasificación: PATRÓN ESTABLECIDO.**

**Evidencia, Nivel 2.** NN/g, *UX Guidelines for Recommended Content*, Aurora
Harley, **4 de noviembre de 2018**. La guía #2 es la que importa: **declarar
claramente la fuente del dato.** Etiquetas del tipo "Based on Your Past History"
o "Related to Items You've Purchased" en vez de descripciones vagas; encontraron
que un "and more" dejaba a la gente sin entender qué otros datos se estaban
usando. Guía #3: separar categorías de recomendación en vez de mezclarlas.
Guía #4: dejar corregir.
[NN/g — UX Guidelines for Recommended Content](https://www.nngroup.com/articles/recommendation-guidelines/).

**Es de 2018 y lo uso igual**, con el criterio del brief: el patrón sigue
claramente vigente — es la misma exigencia de transparencia que la regulación
europea está por convertir en obligación (§7.4), ocho años después.

Complemento, del mismo grupo: la gente quiere que su actividad **directa**
(compras, guardados, datos de perfil) pese más que el mero navegar, y le molesta
que el navegar le sesgue las recomendaciones.
[NN/g — Individualized Recommendations](https://www.nngroup.com/articles/recommendation-expectations/).

**Aplicación a MESH.** MESH ya está por delante de esta guía. `product-spec.md`
§8 exige que las razones se generen **solo a partir de términos que aportaron**,
ordenadas por aporte real, con tope de tres, y prohíbe "Nuestra IA cree que esto
te va a encantar". La banda Fuerte/Bueno/Posible en vez de un porcentaje de dos
decimales es, además, más honesta que lo que NN/g llega a pedir.

Lo único que la evidencia agrega, y es chico pero real: **NN/g pide que se
declare la fuente del dato, y las razones de MESH ya la declaran** ("Marcaste
varios trabajos de Fine Line" — dice qué hiciste, no solo qué concluimos). Eso
está bien. Lo que **no** está resuelto es el hallazgo sobre peso: si en
`matching.md` guardar pesa distinto que me gusta, la interfaz debería poder
decirlo cuando alguien pregunte. Hoy la razón dice "Marcaste" y "Guardaste" como
si fueran equivalentes.

**Riesgo para MESH.** Bajo. Es un ajuste de copy sobre un motor que ya es
correcto.

**Recomendación: Usar** — validación de lo construido, con una pregunta para
`matching-system`: ¿las razones deberían reflejar el peso relativo de guardar
vs. me gusta?
**Confianza: Alta.**

### 6.2 Confianza sin reseñas: lo que MESH ya tiene y no está usando como señal

**Clasificación: razonamiento propio, no hallazgo de fuente. Lo marco así a
propósito.**

No encontré fuente Nivel 1/2 que estudie confianza en marketplaces creativos sin
reseñas. Lo que sigue es deducción a partir del inventario de MESH, y hay que
tratarla como hipótesis para prototipar y medir, no como evidencia.

MESH ya tiene, sin agregar nada, señales que son verificables:

| Señal | Ya existe en | Por qué es honesta |
|---|---|---|
| Volumen y consistencia de obra real | portfolio, `content/artists/` | Es evidencia directa, no un juicio de terceros |
| Perfil reclamado por su dueño | ADR-013 | Verificable de forma binaria: reclamado o no |
| El artista responde por el chat propio | ADR-012 | Es un hecho del sistema, no una promesa |
| Disponibilidad solo si es fresca (<45 días) | `product-spec.md` §9 | Es la única señal de actividad que MESH puede sostener |
| Las secciones vacías no se renderizan | `product-spec.md` §9 | La ausencia de relleno **es** una señal de confianza |

**La recomendación concreta.** La distinción entre **perfil reclamado** y
**perfil curado sin dueño** hoy solo cambia el canal de contacto (chat propio
vs. WhatsApp/Instagram). Debería ser **visible como estado**, no solo como
consecuencia. No un badge de prestigio — un hecho: *"Camila administra este
perfil en MESH"* contra *"Perfil armado por MESH con obra pública. Camila
todavía no lo reclamó."*

La segunda frase es incómoda y hay que escribirla igual. Es exactamente el tipo
de honestidad que `CLAUDE.md` §2 exige, y le dice a la persona algo real sobre
qué esperar del contacto.

**Riesgo para MESH. Alto, y hay que decirlo.** Cualquier marca de "reclamado"
puede leerse como jerarquía —"este artista es mejor"— cuando lo único que dice
es "este artista tiene la app". Con 8–15 artistas, eso puede aplastar
injustamente a la mitad del catálogo. **Mitigación obligatoria: el estado del
perfil no puede entrar al puntaje de matching.** Si entra, MESH está rankeando
por adopción de producto y llamándolo gusto, que es indefendible.

**Recomendación: Adaptar, con auditoría de `product-critic` antes de
construir.** No es una feature de UI, es una decisión de producto con
consecuencias de equidad.
**Confianza: Baja** — es razonamiento propio sin evidencia externa, y lo marco
así para que nadie lo cite después como si fuera investigación.

---

## 7 · Anti-patrones — qué NO hacer, con la razón

Cada uno con la razón concreta, no "porque no queda bien".

### 7.1 Barra de pestañas que se minimiza al scrollear
**Por qué no.** El HIG lo condiciona a apps con accesorio adjunto (MiniPlayer) y
al mismo tiempo exige mantener la barra visible para que la gente no olvide en
qué área está. MESH no tiene accesorio. Copiarlo es tomar la excepción por la
regla. **Fuente:** [Apple HIG — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars).

### 7.2 Material translúcido en la capa de contenido
**Por qué no.** Apple es literal: "Don't use Liquid Glass in the content layer."
Y para MESH el costo es peor que para la app promedio: el contenido es línea
fina de alto detalle, el peor caso para blur. **Fuente:**
[Apple HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/materials).

### 7.3 Resumir con IA lo que dijo o hizo una persona real
**Por qué no.** `CLAUDE.md` §2, innegociable. Airbnb puede hacerlo porque tiene
mil millones de reseñas y una tolerancia al error que MESH no tiene con 8–15
artistas: un resumen equivocado sobre uno de ellos es 7% del catálogo mal
representado. **Fuente:** [Airbnb 2026 Summer Release](https://news.airbnb.com/airbnb-2026-summer-release/) — como ejemplo de lo que no se copia.

### 7.4 Cualquier cosa que empuje tiempo en pantalla
**Por qué no.** Además de estar prohibido por `CLAUDE.md` §3, se está volviendo
ilegal en el mercado que fija el estándar. El Parlamento Europeo tiene en su
*legislative train* la **Digital Fairness Act**, prevista para 2026, que apunta
explícitamente a *dark patterns*, marketing de influencers, **diseño adictivo** y
**prácticas de personalización injustas**, con atención particular a menores.
[Parlamento Europeo — Digital Fairness Act](https://www.europarl.europa.eu/legislative-train/theme-protecting-our-democracy-upholding-our-values/file-digital-fairness-act) (Nivel 1) ·
[EPRS — Regulating dark patterns in the EU: Towards digital fairness (2025)](https://www.europarl.europa.eu/RegData/etudes/ATAG/2025/767191/EPRS_ATA(2025)767191_EN.pdf).
MESH no vende en la UE hoy, pero la regulación europea es el piso que después
copia todo el mundo. **La postura de MESH deja de ser solo ética y pasa a ser
también anticipación regulatoria.**

### 7.5 Scroll infinito en descubrimiento o en matches
**Por qué no.** NN/g: no sirve para tareas dirigidas de búsqueda, y la gente
"often stop once they see an item that looks close enough". Elegir profesional
es una tarea dirigida. **Fuente:**
[NN/g — Infinite Scrolling](https://www.nngroup.com/articles/infinite-scrolling/).

### 7.6 Grilla masonry de obra de artistas mezclados sin autoría
**Por qué no.** Es la firma de Pinterest y rompe la regla de arquitectura de
§4.4: toda superficie de MESH termina en una persona. Una celda sin autor es una
celda que no lleva a ningún lado.

### 7.7 Hoja inferior para contenido complejo o para reemplazar navegación
**Por qué no.** NN/g es explícito: reservar para interacciones breves, no usar
para detalles de producto ni contenido que requiera tiempo, no apilar hojas, no
reemplazar la navegación normal entre pantallas. Y siempre botón de cerrar
visible, no solo el tirador — por lectores de pantalla y teclado. **Fuente:**
[NN/g — Bottom Sheets](https://www.nngroup.com/articles/bottom-sheet/).

### 7.8 Transición nativa de zoom en el camino mazo → perfil
**Por qué no.** API en alpha, iOS 18+ solamente, y con **~1 segundo de demora
documentado** por Expo. Es el camino más caliente del producto. **Fuente:**
[Expo — Zoom transition](https://docs.expo.dev/router/advanced/zoom-transition/).

### 7.9 CTA persistente que aparece antes de que la persona haya visto obra
**Por qué no.** Convierte "está a mano" en "te está apurando". La barra de
contacto entra en ENTENDER, después de la obra principal, no en el frame cero.

### 7.10 Barra de pestañas que cambia según el rol
**Por qué no.** El HIG: "Having tab bar buttons available in some cases but not
others makes your app's interface appear unstable and unpredictable." Y
`CLAUDE.md` es explícito en que ofrecer/buscar **no es un rol excluyente**.

### 7.11 Marcar "reclamado" de una forma que parezca prestigio
**Por qué no.** Con un catálogo chico, un badge que en realidad mide adopción de
producto se lee como calidad. Si además entrara al matching, MESH estaría
rankeando por adopción y llamándolo gusto. Ver §6.2.

---

## 8 · Qué contradice esto de lo que MESH ya decidió

La sección más valiosa, según el brief. Cuatro cosas reales.

### 8.1 CONTRADICCIÓN — ADR-007 describe pestañas que ya no son las de `CLAUDE.md`

**ADR-007** (estado: *Propuesto*, 2026-08-17) decide cuatro pestañas:
**Descubrir · Matches · Proyectos · Vos**, y argumenta explícitamente contra
esconder el punto de entrada dirigido.

**`CLAUDE.md`** (raíz, con ADRs del 2026-08-19) declara cuatro pestañas:
**Inicio · Búsqueda · Matches · Perfil**.

No son las mismas. "Proyectos" desapareció y apareció "Búsqueda" (subir fotos,
ADR-011). Y `navigation-research.md` ya había anotado una **tercera** versión
distinta en `docs/architecture/navigation.md`.

**Por qué importa para esta investigación.** El argumento central de ADR-007 —
que el usuario dirigido merece un punto de entrada de primera clase en la barra
— **sigue siendo válido**, y la evidencia de Apple lo refuerza: "In apps that
use tab bars, like Photos and Apple TV, search is a dedicated tab" (§2.3). O
sea, la sustitución de Proyectos por Búsqueda **honra** el razonamiento de
ADR-007 aunque cambie el nombre. Pero el ADR no lo dice, y alguien que lo lea
hoy va a implementar la barra equivocada.

**Qué hacer.** No es alcance de esta investigación arreglarlo. Queda anotado
para `product-architect`: ADR-007 necesita ser superseded o actualizado, y
`docs/architecture/navigation.md` necesita alinearse. Son **tres** documentos
describiendo tres barras distintas.

### 8.2 CONTRADICCIÓN — `mobile-patterns.md` deja abierta una transición que la evidencia ya cierra

`mobile-patterns.md` §"Transición de elemento compartido" recomienda **Adaptar**
con confianza Media, diciendo "falta verificar que la versión estable del SDK 57
soporte esto sin inestabilidad".

**Ya está verificado, y la respuesta es no** (§2.2): la API sigue en **alpha**,
es solo iOS, requiere iOS 18+, solo Stack, y Expo documenta **~1 segundo de
demora**. `MESH-UX-STRATEGY.md` §11 arrastra la misma pendiente.

**Qué cambia.** El objetivo (continuidad espacial mazo → perfil) sigue siendo
correcto y sigue siendo prioridad. **El medio cambia**: implementación propia
con Reanimated 4.5, no la API nativa. `mobile-patterns.md` debería registrar la
verificación en un ciclo futuro; este documento la deja escrita mientras tanto.

### 8.3 MATIZ — el argumento del pulgar en `navigation-research.md` está incompleto

`navigation-research.md` sostiene las pestañas inferiores sobre el argumento del
alcance del pulgar, con fuente Nivel 2/3. NN/g, en cambio, advierte contra
asumir que la posición inferior mejora el alcance, y sostiene que la **zona
media** de la pantalla es la más accesible según el modo de agarre
([NN/g — Bottom Sheets](https://www.nngroup.com/articles/bottom-sheet/), 2023).

**No cambia la decisión.** Las pestañas inferiores siguen siendo correctas — por
convención de plataforma y por el HIG, que es Nivel 1 y no depende del argumento
ergonómico. **Cambia la justificación**: apoyarse solo en el pulgar es apoyarse
en la pata más débil.

**Dónde muerde de verdad.** En la zona media. Si el contenido decisivo de una
hoja inferior (los chips de refinamiento de §4.3, la explicación de "¿por qué
esta persona?") queda pegado al borde de abajo porque "ahí llega el pulgar",
puede estar en peor lugar que un poco más arriba. Es una nota para
`interaction-designer` al ajustar los *detents*.

### 8.4 TENSIÓN NO RESUELTA — el encuadre nuevo empuja contra el mazo, y hay que decirlo

El brief dice que "el swipe se conserva pero deja de ser el modelo de navegación
entero", y que MESH es estructuralmente más cercano a Airbnb. Pero:

- `CLAUDE.md` describe **Inicio** como "el mazo. Donde la app abre y **donde se
  pasa el tiempo**."
- Airbnb no tiene mazo. Tiene una superficie de exploración con listas, filtros
  y un mapa.
- Y el recorrido nuevo agrega un escalón —**EXPLORAR**— que el recorrido viejo
  de `MESH-UX-STRATEGY.md` §2 no tiene. Ese recorrido va de "me gusta esto"
  directo a "¿quién lo hizo?".

**La pregunta que esta investigación no puede responder, y que no voy a fingir
que resuelve:** ¿EXPLORAR es una superficie nueva (una grilla de obra
navegable, además del mazo) o es un modo dentro de Inicio?

Lo que la evidencia **sí** dice, y acota la respuesta:

1. Si es una grilla, **no puede ser scroll infinito** (§4.2) ni masonry de
   artistas mezclados sin autoría (§4.1, §7.6).
2. El HIG advierte que las grillas de imágenes son malas para navegar porque se
   ven ~4 ítems a la vez (§4.1) — o sea, una grilla de EXPLORAR sirve para
   *mirar*, no para *elegir*.
3. Cualquier superficie nueva compite por lugar en una barra que ya está llena.
   ADR-007 lo dijo primero: "cualquier quinta superficie tiene que desplazar a
   una de estas, no sumarse."

**Recomendación de proceso, no de diseño:** esto va a `product-thinking` y
`product-critic` **antes** de que `interaction-designer` prototipe nada. Es una
decisión de producto disfrazada de decisión de navegación, y prototipar primero
sería resolverla por accidente.

---

## 9 · Tabla resumen

| # | Hallazgo | Clasif. | Recom. | Riesgo | Conf. |
|---|---|---|---|---|---|
| 1.1 | Pestañas = momentos del recorrido; categorías adentro, no como pestaña | ESTABLECIDO | Usar | Bajo | Alta |
| 1.2 | Filtros en hoja + botón con conteo de resultados | ESTABLECIDO | Adaptar (umbral ~40 profesionales) | Medio | Alta / Media |
| 1.3 | CTA fija en el perfil, una sola acción, aparición diferida | ESTABLECIDO | Adaptar | Medio | Alta |
| 1.4 | La hoja explica, la pantalla decide | ESTABLECIDO | Usar | Bajo | Alta |
| 1.5 | Síntesis de reseñas por IA | TENDENCIA | **Rechazar** / adaptar el problema (orden de portfolio por gusto) | Alto | Alta |
| 2.1 | Barra flotante: adoptar la jerarquía de capas, no el minimize-on-scroll | ESTABLECIDO | Adaptar / Rechazar | Bajo | Alta |
| 2.2 | Continuidad espacial: principio sí, API nativa de zoom no | TENDENCIA | Adaptar / **Rechazar** implementación | Bajo | Alta |
| 2.3 | Búsqueda como pestaña dedicada + borrado de historial | ESTABLECIDO | Usar | Bajo | Alta |
| 2.4 | Material translúcido: solo capa funcional, nunca contenido | MODA / ESTABLECIDO | **Rechazar** estética / Adaptar jerarquía | **Alto** | Alta |
| 2.5 | Radios concéntricos | TENDENCIA | Adaptar (token) | Muy bajo | Media |
| 3.1 | Guardar como acto deliberado, con destino visible y autoría | ESTABLECIDO | Adaptar | Bajo | Alta / Media |
| 3.2 | Interfaz calma | MODA / ESTABLECIDO | Usar como argumento, rechazar sin restricción testeable | Bajo | Media |
| 3.3 | Postura sobre obra generada por IA | TENDENCIA | Pregunta abierta para ADR-013 | — | Baja |
| 4.1 | Masonry solo en el portfolio de un artista | ESTABLECIDO / MODA | Adaptar, acotado | Alto | Alta |
| 4.2 | Scroll infinito | ESTABLECIDO | **Rechazar** en mazo y matches | — | Alta |
| 4.3 | Refinamiento por chips de taxonomía cerrada en Búsqueda | TENDENCIA | Adaptar | Medio | Alta / Media |
| 4.4 | Toda superficie termina en una persona | TENDENCIA | Usar como principio escrito | — | Alta |
| 5.1 | Barra permanente, sin evidencia a favor de lo flotante | ESTABLECIDO | Usar sin cambios | Bajo | Alta |
| 5.2 | Navegación contextual / por rol | MODA | **Rechazar** | — | Alta |
| 6.1 | Razones que declaran la fuente del dato | ESTABLECIDO | Usar (ya construido) | Bajo | Alta |
| 6.2 | Estado del perfil (reclamado / sin dueño) como hecho visible | razonamiento propio | Adaptar, con auditoría previa | **Alto** | **Baja** |

---

## 10 · Qué entregar, y a quién

**A `interaction-designer`:**
- Barra de CTA fija en el perfil, con la regla de aparición diferida (§1.3).
- Transición mazo → perfil con Reanimated propio, no API nativa (§2.2).
- Chips de refinamiento de taxonomía cerrada en Búsqueda (§4.3).
- Nota sobre zona media al elegir *detents* de hoja (§8.3).

**A `design-system-engineer`:**
- Token de separación capa funcional / capa de contenido, por contraste y
  elevación, **no** por translucidez (§2.4).
- Helper de radio concéntrico (§2.5).
- Si alguna vez se adopta translucidez en la barra: variante *regular*, con
  `prefers-reduced-transparency` colapsando a opaco, probado contra obra clara y
  obra oscura.

**A `product-critic`:**
- §6.2 completo — el estado del perfil no puede entrar al matching.
- §8.4 — resolver qué es EXPLORAR antes de que se prototipe.

**A `product-architect`:**
- §8.1 — tres documentos describen tres barras de pestañas distintas.

**A `matching-system`:**
- §6.1 — ¿las razones deberían reflejar que guardar pesa distinto que me gusta?
- §1.5 — orden del portfolio por gusto, determinístico y reversible.

**A `supabase-security` / ADR-011:**
- §2.3 — borrado del historial de fotos de referencia subidas.

---

## 11 · Fuentes

**Nivel 1 — plataforma y comunicación primaria del producto**

| Fuente | Fecha | URL |
|---|---|---|
| Apple HIG — Tab bars (change log: 8 jun 2026) | consultado 2026-08-19 | https://developer.apple.com/design/human-interface-guidelines/tab-bars |
| Apple HIG — Sheets | consultado 2026-08-19 | https://developer.apple.com/design/human-interface-guidelines/sheets |
| Apple HIG — Materials | consultado 2026-08-19 | https://developer.apple.com/design/human-interface-guidelines/materials |
| Apple HIG — Toolbars | consultado 2026-08-19 | https://developer.apple.com/design/human-interface-guidelines/toolbars |
| Apple HIG — Searching | consultado 2026-08-19 | https://developer.apple.com/design/human-interface-guidelines/searching |
| Apple HIG — Designing for iOS | consultado 2026-08-19 | https://developer.apple.com/design/human-interface-guidelines/designing-for-ios |
| WWDC25 — Get to know the new design system (sesión 356) | WWDC 2025 | https://developer.apple.com/videos/play/wwdc2025/356/ |
| Expo — Zoom transition (alpha, iOS 18+, Stack, ~1s de demora) | mod. 2026-04-02 | https://docs.expo.dev/router/advanced/zoom-transition/ |
| Airbnb — 2025 Summer Release | 2025-05-13 | https://news.airbnb.com/airbnb-2025-summer-release/ |
| Airbnb — 2026 Summer Release | 2026-05-20 | https://news.airbnb.com/airbnb-2026-summer-release/ |
| Pinterest — Introducing new visual search features | 2025-05-05 | https://newsroom.pinterest.com/news/introducing-new-visual-search-features/ |
| Pinterest — Boards get AI-powered upgrade | 2025-10-27 | https://newsroom.pinterest.com/news/pinterest-boards-get-ai-powered-upgrade-for-personalized-experience/ |
| Are.na — About | consultado 2026-08-19 | https://www.are.na/about |
| Cosmos — App Store (descripción propia, v2.49.0) | consultado 2026-08-19 | https://apps.apple.com/us/app/cosmos-search-discover/id1577975475 |
| Parlamento Europeo — Digital Fairness Act (legislative train) | consultado 2026-08-19 | https://www.europarl.europa.eu/legislative-train/theme-protecting-our-democracy-upholding-our-values/file-digital-fairness-act |
| EPRS — Regulating dark patterns in the EU: Towards digital fairness | 2025 | https://www.europarl.europa.eu/RegData/etudes/ATAG/2025/767191/EPRS_ATA(2025)767191_EN.pdf |

**Nivel 2 — investigación de UX con proceso**

| Fuente | Autor / Fecha | URL |
|---|---|---|
| NN/g — Bottom Sheets: Definition and UX Guidelines | Page Laubheimer, 2023-06-11 | https://www.nngroup.com/articles/bottom-sheet/ |
| NN/g — Mobile Faceted Search with a Tray | Kathryn Whitenton, 2015-07-26 | https://www.nngroup.com/articles/mobile-faceted-search/ |
| NN/g — UX Guidelines for Recommended Content | Aurora Harley, 2018-11-04 | https://www.nngroup.com/articles/recommendation-guidelines/ |
| NN/g — Individualized Recommendations: Users' Expectations & Assumptions | consultado 2026-08-19 | https://www.nngroup.com/articles/recommendation-expectations/ |
| NN/g — Infinite Scrolling Is Not for Every Website | consultado 2026-08-19 | https://www.nngroup.com/articles/infinite-scrolling/ |
| NN/g — Infinite Scrolling: When to Use It, When to Avoid It | consultado 2026-08-19 | https://www.nngroup.com/articles/infinite-scrolling-tips/ |
| NN/g — Mobile Navigation: Image Grids or Text Lists? | consultado 2026-08-19 | https://www.nngroup.com/articles/image-vs-list-mobile-navigation/ |
| Baymard — Ecommerce Filter UI: Best Practices | consultado 2026-08-19 | https://baymard.com/learn/ecommerce-filter-ui |
| Baymard — Product Page UX Best Practices | act. 2026-03-18 (orig. 2023-10-24) | https://baymard.com/blog/current-state-ecommerce-product-page-ux |
| Baymard — Airbnb UX case study (**de pago**, solo metadatos leídos) | últ. revisión dic 2025 | https://baymard.com/ux-benchmark/case-studies/airbnb |

**Nivel 3/4 — usados solo como termómetro, nunca como evidencia**

| Fuente | Para qué la uso | URL |
|---|---|---|
| TechSpot — quejas de rendimiento y diseño tras Liquid Glass | termómetro de recepción (§2.4) | https://www.techspot.com/news/109517-performance-design-complaints-mount-after-ios-26-liquid.html |
| Gulf News — control "Tinted" en iOS 26.1 beta | termómetro; el HIG confirma que la preferencia existe | https://gulfnews.com/technology/companies/apple-yields-tinted-control-in-ios-261-beta-4-tones-down-liquid-glass-after-backlash-1.500315176 |
| Foros de desarrolladores de Apple — hilo sobre transparencia y legibilidad | Nivel 4 alojado en sitio Nivel 1; termómetro | https://developer.apple.com/forums/thread/811219 |

**Consultadas y no legibles**

| Fuente | Qué pasó |
|---|---|
| Mobbin — glosario | HTTP 403 |
| Apple HIG — What's new | HTTP 404 (cronología reconstruida de los change logs) |
| Material Design 3 — Navigation bar | SPA sin render server-side; HTML crudo solo trae el título |
| Baymard — caso Airbnb | de pago |
| WWD — nota sobre Cosmos | redirección a muro de pago |
| Parlamento Europeo — legislative train (fetch directo) | render vacío; usado vía resultado de búsqueda del mismo dominio oficial |

---

**Próximo ciclo, si hay uno.** Lo que quedó sin investigar y vale la pena:
cómo comunican los productos editoriales que apareció algo nuevo sin
notificación carnada (`interaction-research.md` ya lo dejó pendiente y sigue
pendiente); y evidencia real —no blogs de proveedores— sobre confianza en
marketplaces de servicios sin sistema de reseñas, que es el hueco más grande de
este documento (§6).
