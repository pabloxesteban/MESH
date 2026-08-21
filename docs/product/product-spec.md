# MESH — Especificación de producto (V1)

**Estado:** Borrador para aprobación · **Responsable:** product-architect · **Última actualización:** 2026-08-21

> **La tesis cambió el 2026-08-21.** Las secciones §1, §2, §11 y §13 están
> actualizadas; **§6, §7 y §8 describen un producto que ya no existe** —el mazo
> de obra, el gusto aprendido y la pantalla de encajes se desenchufaron el
> 2026-08-19 ([D-010](../design/MESH-DESIGN-DECISIONS.md))— y se conservan como
> registro de lo que se construyó y por qué. Leelas sabiendo eso. Ver
> [ADR-031](../decisions/ADR-031-request-first.md) y
> [por-que-mesh.md](por-que-mesh.md).

---

## 1. Declaración de producto

MESH ayuda a la gente a descubrir a la persona indicada para hacer realidad una
idea.

El problema: *"Tengo medio pensado lo que quiero. Le escribo a ocho tatuadores,
seis me dejan en visto, y ninguno me dice un precio hasta la tercera
respuesta."*

No es un problema de descubrimiento —Instagram lo resuelve mejor que nosotros y
va a seguir haciéndolo— es un problema de **coordinación y de información**. Un
feed no lo puede resolver porque un feed no tiene la forma de un pedido.

El loop:

```
CONTÁS LA IDEA → SE VUELVE UN PEDIDO → LE LLEGA A QUIEN LA PUEDE HACER → TE CONTESTAN CON UN PRECIO
```

La promesa, en palabras del usuario:

> "Contá tu idea una vez. Te contestan los que la pueden hacer, con precio."

> **Qué decía hasta el 2026-08-21.** El loop era
> `DESCUBRIR → GUSTO → GENTE → MATCH → ACCIÓN`, y la promesa *"mostranos lo que
> te gusta, te ayudamos a descubrir quién puede hacerlo"*. Se desenchufó el
> 2026-08-19 con D-010 y el documento tardó dos días en enterarse — el
> diagnóstico de eso está en [por-que-mesh.md §1](por-que-mesh.md).

## 2. Alcance de V1

| Dimensión | V1 |
|---|---|
| Categoría | Solo tatuajes |
| Mercado | Buenos Aires / CABA, Argentina |
| Oferta | Arranca con 8–15 artistas reales curados, con consentimiento; desde 2026-08-19 cualquier artista puede darse de alta solo ([ADR-013](../decisions/ADR-013-artist-self-signup.md)) |
| Demanda | Cualquiera; sin restricción de quién puede explorar. Una búsqueda se abre para que los tatuadores la vean ([ADR-014](../decisions/ADR-014-two-sided.md)); desde 2026-08-21 **no hay default**: se contesta o no se publica ([ADR-031](../decisions/ADR-031-request-first.md)) |
| Contacto | Chat propio adentro de MESH ([ADR-012](../decisions/ADR-012-chat.md)); WhatsApp e Instagram para los perfiles sin dueño |
| Turnos | Adentro desde 2026-08-20 ([ADR-018](../decisions/ADR-018-availability.md)). **Pagos y seña siguen afuera** |
| Mensajería in-app | Adentro de V1 desde 2026-08-19 ([ADR-012](../decisions/ADR-012-chat.md)) |
| Reseñas | Adentro desde 2026-08-20, y solo colgadas de un turno que ocurrió ([ADR-019](../decisions/ADR-019-reviews.md)) |
| Autogestión de profesionales | Adentro: alta propia, estilos, ubicación del estudio y portafolio desde la app ([ADR-013](../decisions/ADR-013-artist-self-signup.md)) |
| Locale | `es-AR` primario, `en` secundario |

V1 existe para testear una sola hipótesis:

> Decir lo que querés tatuarte cuesta **una sola vez**, y la respuesta incluye
> **un precio**. Eso vale lo suficiente como para dejar Instagram.

Todo lo que no ayude a testear eso está fuera de alcance, por más razonable que
suene.

**Cómo se falsea**, que importa más que cómo se confirma. La hipótesis muere si
la gente prefiere mirar fotos y escribir por su cuenta, o si los artistas no
quieren dar un precio sin ver a la persona — y las dos se prueban con veinte
conversaciones, no con código. Ver
[por-que-mesh.md §5](por-que-mesh.md).

> **Qué decía hasta el 2026-08-21.** *"La gente descubre tatuadores de manera
> más efectiva cuando MESH aprende su gusto visual y le recomienda
> profesionales en base a ese gusto."* Ver ADR-031.

## 3. Usuarios

**Quien busca** (primario). Quiere un tatuaje, o tiene curiosidad. Dos estados
mentales:

- *Exploratorio* — "Me gustan estas cosas pero todavía no sé qué quiero, y
  mucho menos quién." Entra por **Descubrir**.
- *Dirigido* — "Sé lo que quiero. Encontrame a alguien que lo haga." Entra por
  **Proyectos** o por búsqueda. Nunca se lo debe forzar a pasar por el
  onboarding.

**El artista** (secundario en V1). No usa la app en V1. Recibe un WhatsApp de
alguien que ya conoce su trabajo, le gusta, y puede decir por qué. Su métrica
de éxito es la calidad del contacto entrante, no el volumen.

## 4. Puntos de entrada

### A. Descubrir
Explorar trabajo visual. Me gusta, paso, guardar, inspeccionar, abrir un perfil,
ver quién está detrás de una pieza. El gusto se acumula en silencio.

### B. Crear un proyecto
Describir lo que querés. Categoría, descripción, estilos, referencias,
presupuesto, tiempos, tamaño, notas — todo opcional más allá de título y
categoría. MESH recomienda profesionales.

Ambos puntos de entrada convergen en el mismo lugar: una lista de gente,
rankeada y explicada, y una forma de hablarles.

## 5. Onboarding

**Principio: la primera pregunta es visual, no un formulario.**

1. Apertura en frío sobre la propuesta de valor — una pantalla editorial, una
   línea de texto, una acción. Sin carrusel, sin pedido de permisos, sin muro
   de registro.
2. Directo a una secuencia de gusto: *"Empecemos por lo que te gusta."*
3. La persona reacciona al trabajo. Me gusta / Guardar / Paso, por gesto **o**
   por botón.
4. El progreso se muestra con honestidad y sin presión — un indicador fino, sin
   contadores, sin "¡3 más para desbloquear!".
5. Con señal suficiente (ver `matching.md` §3.4), la revelación del gusto:

   > **Tu gusto**
   > Fine Line · 82%
   > Botanical · 74%
   > Minimal · 61%

   Enmarcado como *lo que inferimos*, nunca como una medición de la persona.
   Copy: "Esto es lo que estamos leyendo de tus elecciones." Toda pantalla de
   gusto tiene una salida para seguir explorando y cambiarlo.
6. Recién entonces, gente.

**La creación de cuenta se posterga.** La persona entra con sesión anónima
desde el primer arranque (auth anónima de Supabase). Se le pide crear una cuenta
real en el primer momento en que eso le sirve para algo — guardar un proyecto, o
recuperar su gusto en otro dispositivo. Justificación y contrapartidas en el
[ADR-002](../decisions/ADR-002-authentication.md).

## 6. Descubrimiento

El descubrimiento es el corazón emocional. La jerarquía visual es absoluta:

1. La obra
2. El artista
3. El estilo
4. El contexto (ubicación, precio desde si el artista lo publicó)
5. Los controles

Una tarjeta de descubrimiento lleva: la obra, el nombre del artista, hasta tres
etiquetas de estilo, la ubicación, un precio desde opcional, y controles de Me
gusta / Paso / Guardar / Ver artista. Tiene que leerse como una pieza de
contenido editorial —una lámina de revista— no como un perfil de app de citas.

Requisitos de interacción:

- Gesto nativo con física de resorte y descarte sensible a la velocidad.
- Confirmación háptica solo en acciones decisivas (me gusta, guardar) — no en
  cada frame ni en cada tarjeta.
- Las 3 imágenes siguientes precargadas; placeholder blurhash antes del decode.
- Todo gesto espejado por un botón con etiqueta.
- Deshacer la última acción (un paso). La gente se equivoca; castigarla por eso
  es un dark pattern.

Explícitamente **no**: pilas de tarjetas en 3D, confeti, parallax, partículas,
mensajes tipo "¡estás on fire!", ni un contador de cuántas tarjetas viste.

## 7. Gusto

Las interacciones mueven un vector de gusto por estilo. Valores, pesos,
normalización, umbrales y decaimiento están especificados en
[`matching.md`](matching.md). Requisitos de producto por encima del algoritmo:

- El gusto es **siempre visible y siempre editable.** La persona puede abrir su
  gusto en cualquier momento y ver qué estilos están leyendo más fuerte.
- El gusto se **explica con evidencia** — tocar un estilo muestra las piezas
  concretas que aportaron a él.
- La señal negativa (los pasos) se usa en el ranking pero **nunca se muestra de
  vuelta** como "no te gusta X". Un paso es evidencia débil y ambigua, y
  presentarla como un juicio sobre el gusto de alguien es incorrecto y
  desagradable.
- Se puede resetear el gusto. Un botón, una confirmación, sin fricción de dark
  pattern.

## 8. Matching

Profesionales rankeados con una explicación cada uno. Algoritmo en
[`matching.md`](matching.md).

Reglas a nivel producto:

- **No se muestra ningún match antes de que haya señal real.** Por debajo del
  umbral, la pestaña Matches muestra un estado vacío genuino — no una lista de
  relleno disfrazada de recomendaciones.
- **La fuerza del match se presenta como banda** — *Fuerte / Bueno / Posible* —
  no como un porcentaje de dos cifras significativas. Con 8–15 artistas en una
  ciudad, un "96%" es una precisión que los datos no sostienen, y va a ser lo
  primero que un usuario escéptico no se crea. El puntaje numérico existe
  internamente y se expone en builds de debug. Ver
  [ADR-005](../decisions/ADR-005-matching.md) para el argumento y las
  condiciones bajo las cuales pasaríamos a porcentajes.
- **Las razones se generan solo a partir de términos que aportaron**, ordenadas
  por su aporte real, con tope de tres. Si no hay una razón honesta, no hay
  match.

Ejemplo:

> **¿Por qué esta persona?**
> ✓ Marcaste varios trabajos de Fine Line
> ✓ Guardaste diseños Botanical
> ✓ Trabaja los dos estilos
> ✓ En CABA *(solo si la ubicación efectivamente discriminó)*

Nunca: "Nuestra IA cree que esto te va a encantar."

## 9. Perfil profesional

El perfil es un portfolio, no un currículum.

```
Obra principal (a sangre)
Identidad — nombre, ubicación, especialidades, disponibilidad si es fresca
Portfolio — grilla visual grande, trabajos destacados primero
Sobre — bio en las palabras del artista
Estilos — etiquetas, tocables hacia descubrimiento
Precios — solo si el artista publicó un rango
Disponibilidad — solo si se actualizó en los últimos 45 días; si no, se oculta
Redes — Instagram
CTA principal — "Hablá con {nombre}"
```

Nada en esta pantalla puede ser inferido ni generado. Si el artista no lo
proveyó, la sección no se renderiza.

## 10. Traspaso al contacto

El contacto sale de MESH. Soportado: WhatsApp
(`https://wa.me/{e164}?text=...`) e Instagram.

El mensaje precargado de WhatsApp se compone **únicamente** con hechos que la
persona efectivamente produjo:

> Hola {nombre}! Te encontré en MESH porque me gustaron tus trabajos de
> {estilos que el usuario efectivamente marcó}.
>
> {título del proyecto, si existe}
> {descripción del proyecto, si existe}

Reglas:

- Los estilos nombrados son los que las propias interacciones sostienen — nada
  más.
- Los detalles del proyecto se citan, nunca se parafrasean ni se adornan.
- Presupuesto, tiempos y datos personales se incluyen **solo** si la persona los
  cargó y confirmó compartirlos.
- El mensaje se le muestra a la persona y es editable antes de enviarse. MESH
  nunca envía nada en nombre de nadie.
- Si el artista no tiene WhatsApp, el CTA es Instagram y el copy cambia — no
  fingimos un canal.

## 11. El pedido

Un pedido es un brief liviano: título, descripción, estilo, rasgos de la
taxonomía ([ADR-020](../decisions/ADR-020-brief.md)), ubicación, imágenes de
referencia opcionales, y presupuesto y tiempos opcionales.

Se arma de dos maneras y ninguna es un formulario: **con una foto**
([ADR-011](../decisions/ADR-011-photo-classification.md)) o **contándolo con
palabras** ([ADR-021](../decisions/ADR-021-brief-assistant.md)). El formulario
largo existió, no se llegaba a él desde ninguna pestaña, y se borró el
2026-08-21.

**Es la puerta de entrada del producto.** Inicio abre con tu pedido y su estado
—sin pedido, cerrado, abierto sin respuestas, o con propuestas— y la grilla de
artistas queda un desplazamiento abajo. Ver
[ADR-031](../decisions/ADR-031-request-first.md).

Al publicarlo se contesta, **obligatoriamente y sin default**, si los tatuadores
lo pueden ver. Con el sí, le llega a quienes hacen ese estilo y pueden
responder con un rango de precio y una cantidad de sesiones. Con el no, queda
guardado y no le llega a nadie — y la pantalla lo dice antes de confirmar, no
después de esperar una semana. La decisión se puede cambiar más tarde.

Explícitamente fuera de V1: pujas, subastas, escrow, deadlines, flujos de estado
de proyecto, y cualquier cosa que ponga plata de por medio.

> **Qué decía hasta el 2026-08-21.** *"Crear un proyecto produce una lista
> rankeada de profesionales puntuados contra el proyecto"*, y *"un proyecto en
> V1 es una búsqueda mejor formada, no una publicación de trabajo"*. Lo primero
> se desenchufó con D-010; lo segundo se dio vuelta con ADR-031: un pedido **es**
> una publicación, con la diferencia de que sale hacia una lista corta de gente
> que hace ese estilo y no hacia un tablón.

## 12. Omisiones deliberadas, y por qué

| Omitido | Motivo |
|---|---|
| ~~Conversaciones / mensajes in-app~~ | **Ya no se omite** (2026-08-19, [ADR-012](../decisions/ADR-012-chat.md)). El chat propio es lo que hace posible que una propuesta con precio llegue a algún lado. |
| ~~Reseñas y ratings~~ | **Ya no se omiten** (2026-08-20, [ADR-019](../decisions/ADR-019-reviews.md)), con el candado de que solo reseña quien tuvo un turno que ya pasó. |
| ~~Tabla `availability` de calendario~~ | **Ya no se omite** (2026-08-20, [ADR-018](../decisions/ADR-018-availability.md)). El artista carga su horario semanal y el perfil muestra cuántos huecos quedan, nunca cuáles. |
| ~~Tabla `saved_items`~~ | **Ya no se omite** (2026-08-19, [ADR-016](../decisions/ADR-016-saved-items.md)). |
| Tabla `ProfessionalProfile` separada | Partir `professionals` 1:1 agrega un join y dos juegos de políticas sin diferencia de comportamiento. La separación que importa —*usuario* vs *profesional*— se conserva. Ver [ADR-003](../decisions/ADR-003-domain-model.md). |
| Panel de administración | 8–15 artistas se cargan desde archivos de contenido versionados y validados por esquema. |
| Notificaciones push | Nada en V1 amerita interrumpir a nadie. |

## 13. Criterios de éxito

V1 está terminado cuando todo lo siguiente es verdadero.

1. Un usuario nuevo puede empezar un pedido a segundos del primer arranque, sin
   muro de registro.
2. Puede armarlo con una foto **o** contándolo con palabras, y lo que se
   publica es lo que quedó en el campo, no lo que propuso el modelo.
3. Antes de publicarlo contesta, sin default, si los tatuadores lo pueden ver, y
   sabe qué pasa con cada respuesta.
4. Al volver a abrir la app ve **su pedido y su estado** antes que cualquier
   otra cosa, sin que ese estado invente una espera ni un número.
5. Puede cambiar de opinión: abrir un pedido cerrado, o cerrar uno abierto.
6. Un artista que hace ese estilo lo recibe, y puede contestar con un rango de
   precio y una cantidad de sesiones.
7. Quien pidió ve la propuesta con su precio, abre el perfil de quien contestó y
   le escribe, todo sin salir de MESH.
8. Puede además encontrar a alguien por nombre y recorrer quién tatúa cerca
   suyo, con fluidez en un dispositivo real.
9. Puede crear una cuenta durable y conservar su pedido.
10. La autenticación es segura; RLS bloquea todo acceso cruzado entre usuarios,
    demostrado por tests. Un pedido cerrado no lo ve nadie, ni conociendo su
    uuid.
11. Toda superficie que depende de la red tiene estados de carga, vacío, error y
    reintento.
12. 8–15 perfiles reales de artistas se cargan de forma confiable y repetible
    desde archivos de contenido.
13. Agregar una segunda categoría no requiere ningún cambio de esquema central.
14. No queda ningún hallazgo crítico de seguridad abierto.
15. No queda ningún callejón sin salida de UX: toda pantalla tiene una forma de
    avanzar y una de volver.

> **Qué decía hasta el 2026-08-21.** Cinco de los dieciséis criterios eran sobre
> el mazo de obra, el perfil de gusto y las razones de match. Los tres motores
> siguen versionados y testeados en `packages/domain`, pero ninguna pantalla los
> ejecuta desde el 2026-08-19, así que como criterio de "V1 terminado" eran
> imposibles de cumplir sin volver a enchufarlos. Ver ADR-031.

## 14. Preguntas abiertas

| # | Pregunta | Responsable | Necesaria para |
|---|---|---|---|
| ~~Q1~~ | **Resuelta (2026-08-17): banda.** El puntaje numérico queda en `matches.score` y en builds de debug. Ver ADR-005. | product-critic | — |
| ~~Q2~~ | **Resuelta (2026-08-19): cuatro, y distintas según a qué vino la persona.** Ver [ADR-014](../decisions/ADR-014-two-sided.md) y D-010. | ux-product-designer | — |
| ~~Q3~~ | **Resuelta (2026-08-17): anónima primero.** Ya configurada en `supabase/config.toml`. Ver ADR-002. | product-architect | — |
| ~~Q4~~ | **Sin objeto por ahora.** El gusto no se ejecuta desde ninguna pantalla (D-010). Vuelve a estar abierta el día que se decida reenchufarlo. | matching-engineer | — |
| Q5 | ¿Es honesto mostrar un precio desde cuando los precios argentinos se mueven con la inflación? Recomendación: mostrar una banda con fecha `priced_at`, u omitirlo. **Subió de prioridad con ADR-031**: el precio dejó de ser un adorno del perfil y pasó a ser la mitad de la promesa. | product-architect | — |
| Q6 | ¿Los artistas de CABA aceptan dar un rango de precio sobre un pedido, sin ver a la persona? Es el riesgo más grande de la tesis y no se contesta con código. | product-architect | Antes de sumar oferta |
