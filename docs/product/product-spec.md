# MESH — Especificación de producto (V1)

**Estado:** Borrador para aprobación · **Responsable:** product-architect · **Última actualización:** 2026-08-17

---

## 1. Declaración de producto

MESH ayuda a la gente a descubrir a la persona indicada para hacer realidad una
idea.

El problema: *"Sé lo que quiero, o lo que me gusta, pero no sé quién es la
persona indicada para hacerlo."*

El loop:

```
DESCUBRIR → GUSTO → GENTE → MATCH → ACCIÓN
```

La promesa, en palabras del usuario:

> "Mostranos lo que te gusta. Te ayudamos a descubrir quién puede hacerlo."

## 2. Alcance de V1

| Dimensión | V1 |
|---|---|
| Categoría | Solo tatuajes |
| Mercado | Buenos Aires / CABA, Argentina |
| Oferta | 8–15 artistas reales, curados, con consentimiento |
| Demanda | Cualquiera; sin restricción de quién puede explorar |
| Contacto | WhatsApp e Instagram, fuera de MESH |
| Reservas / pagos | Fuera de alcance |
| Mensajería in-app | Fuera de alcance (ver §12) |
| Reseñas | Fuera de alcance (ver §12) |
| Autogestión de profesionales | Fuera de alcance; los artistas se cargan a mano |
| Locale | `es-AR` primario, `en` secundario |

V1 existe para testear una sola hipótesis:

> La gente descubre tatuadores de manera más efectiva cuando MESH aprende su
> gusto visual y le recomienda profesionales en base a ese gusto.

Todo lo que no ayude a testear eso está fuera de alcance, por más razonable que
suene.

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

## 11. Proyectos

Un proyecto es un brief liviano: título, categoría, descripción, estilos,
ubicación, banda de presupuesto opcional, tiempos opcionales, nota de tamaño
opcional, imágenes de referencia opcionales.

Crear un proyecto produce una lista rankeada de profesionales puntuados contra
el proyecto (ver `matching.md` §5) en lugar de contra el gusto ambiente.

Explícitamente fuera de V1: pujas, subastas, propuestas, presupuestos, escrow,
deadlines, flujos de estado de proyecto. Un proyecto en V1 es una búsqueda mejor
formada, no una publicación de trabajo.

## 12. Omisiones deliberadas, y por qué

| Omitido | Motivo |
|---|---|
| Conversaciones / mensajes in-app | §10 pone el contacto en WhatsApp. Hacer las dos cosas significa construir una superficie de mensajería que nadie pidió, más su carga de moderación, notificaciones y abuso. Revisitar cuando haya evidencia de que la gente quiere salir de WhatsApp. |
| Reseñas y ratings | Con ~12 artistas y sin transacciones, cualquier UI de reseñas queda vacía o falsa. Las dos opciones dañan más la confianza que la ausencia de reseñas. |
| Tabla `availability` de calendario | Los artistas de V1 no van a mantener un calendario. Un calendario desactualizado es peor que ninguno. V1 guarda un estado autodeclarado con marca de frescura y lo oculta cuando envejece. |
| Tabla `ProfessionalProfile` separada | Partir `professionals` 1:1 agrega un join y dos juegos de políticas sin diferencia de comportamiento. La separación que importa —*usuario* vs *profesional*— se conserva. Ver [ADR-003](../decisions/ADR-003-domain-model.md). |
| Tabla `saved_items` | Guardar es una interacción. Modelarlo dos veces invita a que las dos representaciones se contradigan. |
| Panel de administración | 8–15 artistas se cargan desde archivos de contenido versionados y validados por esquema. |
| Notificaciones push | Nada en V1 amerita interrumpir a nadie. |

## 13. Criterios de éxito

V1 está terminado cuando todo lo siguiente es verdadero.

1. Un usuario nuevo llega a ver una obra a segundos del primer arranque, sin
   muro de registro.
2. Puede reaccionar al trabajo por gesto **y** por botón, con deshacer.
3. Sus reacciones mueven un perfil de gusto que puede inspeccionar y editar.
4. Puede ver un resumen de su gusto con un encuadre honesto.
5. Ve profesionales personalizados solo cuando hay señal real.
6. Cada match lleva razones derivadas de términos que aportaron al puntaje.
7. Puede abrir un perfil y recorrer el portfolio con fluidez en un dispositivo
   real.
8. Puede contactar al artista por WhatsApp o Instagram con un mensaje
   precargado, editable y veraz.
9. Puede crear un proyecto y obtener recomendaciones relevantes y explicadas.
10. Puede crear una cuenta durable y conservar su gusto.
11. La autenticación es segura; RLS bloquea todo acceso cruzado entre usuarios,
    demostrado por tests.
12. Toda superficie que depende de la red tiene estados de carga, vacío, error y
    reintento.
13. 8–15 perfiles reales de artistas se cargan de forma confiable y repetible
    desde archivos de contenido.
14. Agregar una segunda categoría no requiere ningún cambio de esquema central.
15. No queda ningún hallazgo crítico de seguridad abierto.
16. No queda ningún callejón sin salida de UX: toda pantalla tiene una forma de
    avanzar y una de volver.

## 14. Preguntas abiertas

| # | Pregunta | Responsable | Necesaria para |
|---|---|---|---|
| Q1 | ¿Mostramos un puntaje numérico o una banda? Recomendación: banda. | product-critic | Fase 10 |
| Q2 | ¿Cuatro pestañas (Descubrir / Matches / Proyectos / Vos) o tres con Proyectos anidado? Recomendación: cuatro, y después medir. | ux-product-designer | Fase 8 |
| Q3 | ¿Auth anónima primero o registro primero? Recomendación: anónima primero. | product-architect | Fase 6 |
| Q4 | ¿Cuántas interacciones decisivas antes de que el gusto esté "listo"? Valor inicial 12. | matching-engineer | Fase 9 |
| Q5 | ¿Es honesto mostrar un precio desde cuando los precios argentinos se mueven con la inflación? Recomendación: mostrar una banda con fecha `priced_at`, u omitirlo. | product-architect | Fase 11 |
