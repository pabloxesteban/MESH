# MESH — acuerdo de trabajo

Leé esto antes de cambiar nada. Es corto a propósito.

## Qué es MESH

MESH ayuda a la gente a descubrir a la persona indicada para hacer realidad una
idea. Muestra **quién trabaja cerca tuyo**, con una muestra de su obra, y
**toda la obra que hay** para buscar ideas. Tatuadores, Buenos Aires / CABA.
El catálogo arranca con 8–15 artistas reales
curados desde `content/artists/`, y **desde la app cualquier artista puede darse
de alta solo** — ver [ADR-013](docs/decisions/ADR-013-artist-self-signup.md),
que documenta qué se pierde al abrirlo y cómo se vuelve a cerrar. El contacto
va por chat propio con los artistas que tienen su perfil reclamado o creado, y
por WhatsApp/Instagram con el resto.

MESH **no** desliza obra para aprender tu gusto ni puntúa encajes: eso existió y
se sacó. Los motores de gusto y matching siguen en `packages/domain`,
versionados y con sus tests, pero hoy **ninguna pantalla de quien busca los
ejecuta** — ver [D-010](docs/design/MESH-DESIGN-DECISIONS.md). Volver a
enchufarlos es una decisión de producto, y se escribe antes de codearla.

## Alcance

Dos cosas que hasta el 2026-08-20 estaban explícitamente afuera y **ya no lo
están**:

- **Turnos.** Ya existen. El artista carga su horario semanal en el Estudio, el
  turno se asigna desde el chat, y en el perfil se ve cuántos huecos le quedan
  esta semana — el número, nunca cuáles. Ver
  [ADR-018](docs/decisions/ADR-018-availability.md). **Pagos y seña siguen
  afuera**: un turno no cuesta nada y no bloquea nada. Cuando haya plata de por
  medio va con su ADR, y con el innegociable 3 encima: una agenda con seña es
  exactamente donde se cuelan la escasez y la urgencia falsas.
- **Guardar obra.** Ya existe: un corazón abajo de cada obra, y una pantalla de
  Guardados. Ver [ADR-016](docs/decisions/ADR-016-saved-items.md) y
  [ADR-017](docs/decisions/ADR-017-saved-ranking.md).
- **Colecciones.** Ya existen: lo guardado se puede agrupar en colecciones
  nombradas por la propia persona, además de la vista implícita de todo lo
  guardado. Una obra puede estar en varias colecciones a la vez — no es una
  carpeta que la saca de otro lado. Enmienda el "sin carpetas ni tableros" de
  ADR-016. Ver [ADR-030](docs/decisions/ADR-030-collections.md).
- **Reseñas.** Ya existen, y con un candado: solo reseña quien tuvo un turno con
  ese artista y ese turno ya pasó. El artista no las escribe, no las edita, no
  las borra y no sabe quién las dejó. Ver
  [ADR-019](docs/decisions/ADR-019-reviews.md).

- **Un asistente que conversa.** Ya existe. Quien no tiene una foto le cuenta la
  idea con sus palabras y el asistente arma el pedido; la persona lo edita y lo
  confirma antes de que exista. Vive en un hilo aparte, **nunca adentro del chat
  con un artista**, y tiene siete reglas duras encima — entre ellas que nunca
  dice un precio, nunca dice una disponibilidad y nunca nombra a un tatuador.
  Ver [ADR-021](docs/decisions/ADR-021-brief-assistant.md), que enmienda el
  innegociable 1.
- **Con qué frecuencia contesta un artista.** Ya existe, calculado al leer de
  sus propias conversaciones, en tres frases de las que una es mala. No es un
  puntaje, no ordena a nadie y no se puede apagar. Ver
  [ADR-022](docs/decisions/ADR-022-reply-habit.md).

- **Llevarte tus datos.** Ya existe, pegado arriba de borrar la cuenta: un
  archivo con lo que escribiste y lo que te pasó. Lo que escribieron otros no
  entra — un archivo se reenvía, y esas palabras no son tuyas para abrirlas ahí.
  Ver [ADR-028](docs/decisions/ADR-028-account-export.md).
- **Borrar la cuenta.** Ya existe, desde Perfil, y borra todo: búsquedas,
  fotos, chats, reseñas, el hilo del asistente y el perfil de artista si lo hay.
  Sin período de gracia. Queda un solo registro —un uuid y una fecha— para poder
  demostrar que se cumplió. Ver [ADR-024](docs/decisions/ADR-024-account-deletion.md).
- **Mayoría de edad.** Se pregunta una vez, **sin pedir fecha de nacimiento**, y
  sin esa declaración no se puede cerrar un turno — la puerta vive adentro de
  `schedule_appointment()`. Decir que no, no se guarda: sería un registro de
  menores de edad. Ver [ADR-025](docs/decisions/ADR-025-age-gate.md).
- **Buscar a alguien por nombre.** Ya existe, arriba de Inicio. Sin acentos y
  sin mayúsculas, y **el resultado no se ordena por cercanía** —si escribiste un
  nombre querés ese nombre—. A quien todavía no subió obra también se lo
  encuentra, y la tarjeta lo dice. Ver
  [ADR-029](docs/decisions/ADR-029-search-by-name.md).
- **Avisos.** Ya existen, arriba de Chats: que miramos tu denuncia, que te
  dieron un turno, que te lo cancelaron. **Un aviso no tiene texto** —lleva un
  tipo y una referencia, y la frase la arma i18n— así que no puede inventar
  urgencia. Sin bandeja vacía y sin número. Ver
  [ADR-027](docs/decisions/ADR-027-notifications.md).
- **Denunciar y bloquear.** Ya existen, y el bloqueo **se impone en la base**:
  con un bloqueo activo no se abre un chat, no se escribe en uno ya abierto, no
  llega una propuesta y la búsqueda sale del mazo. Nadie sabe quién lo denunció
  ni quién lo bloqueó. Ver [ADR-023](docs/decisions/ADR-023-moderation.md).

Sigue afuera, sin cambios: abrir a otras categorías o a otras ciudades, y volver
a enchufar el gusto y el matching a una pantalla.

## Innegociables

1. **Explicable antes que ingenioso.** Nada de ML ni LLM en el camino de
   *recomendación*: la función de matching —qué se puntúa, en qué orden se
   muestra, qué razón se da— es determinística, versionada y con tests
   unitarios. **Eso no se toca nunca**, y todo lo que sigue es una excepción
   *antes* del motor, jamás adentro.

   Un modelo puede **ayudar a alguien a decir qué quiere**, siempre del lado
   del servidor y siempre con la salida forzada a una herramienta:

   - **Interpretar lo que la propia persona subió** — clasificar su foto de
     referencia contra la taxonomía real. Vocabulario cerrado, nunca texto
     libre, nunca un slug inventado. Ver
     [ADR-011](docs/decisions/ADR-011-photo-classification.md).
   - **Conversar con ella para armar su pedido**, cuando no hay foto sino una
     idea a medias. Acá **sí hay texto libre**, y por eso viene con las siete
     reglas duras de [ADR-021](docs/decisions/ADR-021-brief-assistant.md), de
     las que estas tres son las que se rompen primero: el asistente **nunca
     dice un precio**, **nunca dice una disponibilidad** y **nunca nombra a un
     artista**. Habla solo con su dueña, en un hilo que nadie más lee, y nada
     de lo que escribe llega a un tercero sin que ella lo haya leído,
     editado y confirmado.

   En los dos casos lo que entra al motor son **slugs de la taxonomía**, como
   un dato más. El motor en sí nunca deja de ser puro.

2. **Nunca inventar.** Nada de reseñas, testimonios, disponibilidad, precios,
   estadísticas de reservas ni razones de match inventadas. Una razón solo se
   puede mostrar si el término que describe efectivamente aportó al puntaje.

   Desde el 2026-08-20 hay reseñas y disponibilidad **reales**, y la regla no
   cambió: lo prohibido es inventarlas. Una reseña solo existe colgada de un
   turno que ocurrió, el promedio se calcula al leer en vez de guardarse, y un
   perfil sin reseñas lo dice con palabras en vez de dibujar cinco estrellas
   vacías. Los registros de prueba no llevan ninguna.
3. **Nada de dark patterns.** Ni rachas, ni puntos, ni niveles, ni escasez o
   urgencia falsas, ni límites artificiales. Nunca.

   **Sobre notificaciones, la regla es más chica desde el 2026-08-20.** Decía
   "ni notificaciones carnada" y se decidió avisarle al artista cada vez que
   alguien guarda su obra — que es exactamente eso. Está acotado, no borrado:
   una notificación tiene que corresponder a **un hecho real y reciente sobre
   quien la recibe**, tiene que poder apagarse, y no puede inventar urgencia
   ("¡se van a olvidar de vos!") ni fabricar un motivo para volver cuando no
   pasó nada. Ver [ADR-017](docs/decisions/ADR-017-saved-ranking.md), que dice
   qué se ganó y qué se resignó.

   Lo que **sí** sigue prohibido sin excepción en esa línea: rachas, puntos,
   niveles, medallas, y cualquier número cuyo propósito sea que alguien vuelva a
   entrar en vez de informarlo.
4. **RLS en todas las tablas.** Habilitado *y* forzado, con políticas
   explícitas. Agregar una tabla sin políticas rompe el CI.
5. **La service-role key nunca toca el cliente.** Existe solo en `tools/seed` y
   en funciones del lado del servidor.
6. **El swipe nunca es la única forma.** Todo gesto tiene un botón equivalente
   con etiqueta accesible y área táctil de ≥44pt.
7. **El núcleo es agnóstico de categoría.** Nada de columnas, tipos o props
   `tattoo_*` en las entidades centrales. Usá Category / Style / Professional /
   PortfolioItem / Project.
8. **Tokens, no hex.** Nada de colores, espaciados, radios o duraciones crudos
   dentro de las pantallas. Importalos del design system.
9. **Español primero.** El mercado es CABA. Todo string de cara al usuario pasa
   por i18n con `es-AR` como locale de origen.

## Idioma del proyecto

- **Documentación, comentarios y comunicación: español rioplatense** (voseo).
  `docs/`, `.claude/`, mensajes de commit, descripciones de PR.
- **Código: inglés.** Nombres de tablas, columnas, enums, funciones, variables,
  tokens de diseño, slugs de taxonomía, rutas de archivos, nombres de eventos
  de analytics e identificadores de agentes y skills.
- **Strings de UI: `es-AR` como origen**, con `en` como traducción. Nunca al
  revés.

Los slugs (`fine-line`, `blackwork`) son estables y no se traducen nunca; lo
que se traduce es el nombre para mostrar, vía clave de i18n.

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Pantallas, componentes, design system | `apps/mobile/src/` |
| Motores de gusto y matching, taxonomía, tipos, esquemas Zod | `packages/domain/src/` |
| CLI de carga de contenido (service role) | `tools/seed/` |
| Migraciones SQL y políticas RLS | `supabase/migrations/` |
| Edge Functions (única IA del producto) | `supabase/functions/` |
| Tests de base de datos (pgTAP) | `supabase/tests/` |
| Archivos de contenido de artistas | `content/artists/` |
| Decisiones | `docs/decisions/` |

La lógica pura va en `packages/domain` para poder testearla sin simulador y
reutilizarla desde el seeder. Si importa algo de `react-native`, no va ahí.

## Las cuatro pestañas

La app abre en **Inicio**. Cuatro y ninguna más — con seis, la barra pasa a ser
un menú que hay que estudiar en vez de un lugar donde la mano ya sabe ir.

**Pero no las mismas cuatro para todos.** MESH tiene dos lados, y la barra
depende de a qué vino la persona. Ver
[ADR-014](docs/decisions/ADR-014-two-sided.md).

| | Busca a alguien | Ofrece un servicio |
|---|---|---|
| **Inicio** | La grilla de artistas: un carrusel chico de la obra de cada uno y, debajo, nombre, foto y ubicación. Contesta *quién tatúa cerca mío*. Arriba dice desde dónde se mide y se cambia — GPS, un barrio, o nada ([D-012](docs/design/MESH-DESIGN-DECISIONS.md)). Ordena por cercanía, **nunca filtra por ella**. Y arriba de todo, un campo para **buscar a alguien por nombre**, que es como llega quien ya sabe a quién busca ([ADR-029](docs/decisions/ADR-029-search-by-name.md)). | El mazo de búsquedas de gente. Un tatuador no quiere deslizar obra de otros tatuadores. |
| **Segunda** | **Explorar**: toda la obra de todos los que se registraron, cerca o lejos. Contesta *qué me quiero tatuar*. Desde acá se entra a las dos formas de armar un pedido: **con una foto** ([ADR-011](docs/decisions/ADR-011-photo-classification.md)) o **contándolo con palabras** ([ADR-021](docs/decisions/ADR-021-brief-assistant.md)). | **Estudio**: tu perfil, tus estilos, tu ubicación, tu obra. |
| **Tercera** | **Chats** | **Chats**: nada más. MESH no le recomienda tatuadores a un tatuador. |
| **Cuarta** | **Perfil** | **Perfil** |

Ni Inicio ni Explorar terminan en una obra: **las dos terminan en una persona**,
y esa persona está a un mensaje. Una grilla que se pueda recorrer sin llegar
nunca a alguien sería otra app.

Al registrarse se pregunta una sola vez si la persona ofrece un servicio o está
buscando. Es una preferencia de arranque, **no** un rol excluyente, y se cambia
desde Perfil: una elección de la primera pantalla que no se puede deshacer no
es una preferencia, es una trampa. Elegir "ofrezco" lleva al estudio, donde se
crea el perfil propio o se canjea el código si MESH armó uno; la pregunta por sí
sola no da de alta a nadie.

El estudio no es una pestaña para quien busca: se visita cada tanto, no cada
sesión, y se llega desde Perfil.

**Una búsqueda es privada salvo que su dueña la abra.** Las fotos de referencia
que alguien sube son suyas; que un tatuador las vea es una decisión explícita,
con un interruptor apagado por default. Y un artista nunca escribe primero:
manda interés, y el chat lo abre la persona. Ver
[ADR-012](docs/decisions/ADR-012-chat.md) y
[ADR-014](docs/decisions/ADR-014-two-sided.md).

## Antes de cambiar algo

- **Cambio de esquema** → seguí `.claude/workflows/database-change.md`. Una
  tabla nueva sin políticas RLS y sin test de acceso cruzado entre usuarios no
  está terminada.
- **Feature nueva** → seguí `.claude/workflows/new-feature.md`. Empezá
  preguntando si sirve a DESCUBRIMIENTO, GUSTO, MATCHING, CONFIANZA o ACCIÓN.
  Si no sirve a ninguno, no lo construyas.
- **Cambio de matching** → subí `MATCHING_VERSION`, actualizá
  `docs/product/matching.md`, actualizá los fixtures. Nunca cambies pesos sin
  actualizar la justificación documentada.
- **Decisión arquitectónica** → escribí un ADR en `docs/decisions/`.

## Definición de terminado

Que el código funcione no es estar terminado. Terminado es: la implementación
funciona, los tipos pasan, el lint pasa, los tests pasan, se revisó seguridad,
existen los estados de carga / vacío / error, se consideró accesibilidad, la
documentación está actualizada, no hay regresiones.

## Destino de push

El desarrollo sucede en `claude/mesh-v1-spec-7m86k7` salvo indicación contraria.
