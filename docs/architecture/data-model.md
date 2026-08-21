# MESH — Modelo de dominio y de datos

**Estado:** Implementado (Fase 4) · **Responsable:** product-architect · **Revisan:** backend-engineer, security-reviewer

---

## 1. Principios

1. **Núcleo agnóstico de categoría.** No existe ninguna columna, valor de enum
   ni tipo `tattoo_*` en el esquema central. Tatuaje es una fila en
   `categories`.
2. **Usuario ≠ Profesional.** Un usuario puede volverse profesional más
   adelante; un profesional también usa MESH como cliente. Los roles no son
   excluyentes y no son una columna en `profiles`.
3. **La media nunca va en Postgres.** `media_assets` guarda referencias y
   metadatos; los bytes viven en Storage.
4. **Todas las tablas tienen RLS habilitado y forzado,** con políticas
   explícitas. Denegar por defecto.
5. **El comportamiento de borrado es explícito en cada clave foránea.** Ningún
   `NO ACTION` por defecto librado al azar.
6. **Claves primarias UUID v4** en todos lados, `gen_random_uuid()`. Los ids
   enteros predecibles filtran el tamaño del catálogo y habilitan enumeración.

## 2. Entidades

### Identidad

**`profiles`** — una fila por usuario de auth, creada por un trigger sobre
`auth.users`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | → `auth.users(id)` ON DELETE CASCADE |
| `display_name` | text NULL | |
| `avatar_media_id` | uuid NULL | → `media_assets` ON DELETE SET NULL |
| `locale` | text NOT NULL DEFAULT `'es-AR'` | |
| `city_location_id` | uuid NULL | → `locations` ON DELETE SET NULL |
| `analytics_opt_in` | boolean NOT NULL DEFAULT true | |
| `created_at`, `updated_at` | timestamptz | |

No guardamos el email — `auth.users` ya lo tiene, y copiar PII a una tabla que
el cliente puede leer es la forma en que se producen las filtraciones.

### Taxonomía (datos de referencia, lectura pública, sin escritura de cliente)

**`categories`** — `id`, `slug` UNIQUE, `name_key`, `sort_order`, `is_active`.

**`styles`** — `id`, `category_id` → `categories` ON DELETE RESTRICT, `slug`,
`name_key`, `description_key`, `aliases text[]`, `sort_order`, `is_active`.
UNIQUE `(category_id, slug)`. `RESTRICT` porque borrar una categoría por debajo
de vectores de gusto vivos tiene que ser imposible por accidente.

**`locations`** — `id`, `country_code`, `admin_area`, `city`, `slug` UNIQUE,
`metro_key`, `lat`, `lng`. `metro_key` agrupa CABA con el Gran Buenos Aires para
el componente de ubicación del matching; La Plata tiene el suyo, porque está a
55 km y tratarla como el mismo lugar sería mentirle a alguien sobre cuánto tiene
que viajar.

Granularidad: ciudad. **Un barrio no es una ubicación.** Poner "Palermo" en la
columna `city` sería llamar ciudad a algo que no lo es; el día que queramos
mostrar el barrio va a ser una columna nueva. `lat`/`lng` quedan en NULL: la
columna existe, pero V1 no compara distancias —compara `metro_key`— y no vamos a
escribir coordenadas que no verificamos.

`name_key`/`description_key` son claves de i18n, no strings visibles — así la
taxonomía no queda con forma de inglés dentro de la base.

### Oferta

**`professionals`**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `owner_user_id` | uuid NULL | → `profiles` ON DELETE SET NULL. NULL = curado, sin reclamar |
| `category_id` | uuid NOT NULL | → `categories` ON DELETE RESTRICT |
| `slug` | citext UNIQUE NOT NULL | deep links: `mesh://artist/{slug}` |
| `display_name` | text NOT NULL | |
| `bio` | text NULL | en palabras del artista |
| `location_id` | uuid NULL | → `locations` ON DELETE SET NULL |
| `travels` | boolean NOT NULL DEFAULT false | guest spots |
| `price_min_cents`, `price_max_cents` | integer NULL | CHECK min ≤ max |
| `price_currency` | char(3) NULL | ISO-4217 |
| `priced_at` | date NULL | requerido si hay precio |
| `availability_status` | `availability_status` NULL | `open`/`limited`/`waitlist`/`closed` |
| `availability_updated_at` | date NULL | requerido si hay estado |
| `instagram_handle` | text NULL | handle pelado, CHECK de formato |
| `whatsapp_e164` | text NULL | CHECK `^\+[1-9]\d{7,14}$` |
| `avatar_media_id`, `hero_media_id` | uuid NULL | → `media_assets` ON DELETE SET NULL |
| `studio_lat`, `studio_lng` | double precision NULL | GPS real del estudio, provisto por el dueño vía `set_studio_location()`. Display-only — ver §"Ubicación real" abajo |
| `is_published` | boolean NOT NULL DEFAULT false | |
| `is_fixture` | boolean NOT NULL DEFAULT false | |
| `claimed_at` | timestamptz NULL | |
| `created_at`, `updated_at` | timestamptz | |

Restricciones, todas verificadas con un test de rechazo en
`supabase/tests/10_constraints.sql`:

- **precio completo o ausente**: las cuatro columnas de precio van juntas, con
  `min ≤ max`. Un precio sin fecha no es información;
- **disponibilidad completa o ausente**, por la misma razón;
- **un publicado es contactable**: al menos un canal cuando `is_published` — un
  profesional publicado al que no se puede contactar es un callejón sin salida;
- **reclamado ⟺ tiene dueño**: `claimed_at` y `owner_user_id` son nulos los dos
  o ninguno;
- formato de `instagram_handle` (handle pelado, nunca una URL) y de
  `whatsapp_e164`;
- **`studio_lat`/`studio_lng` completos o ausentes**, y cada uno dentro de su
  rango geográfico válido.

> **Ubicación real, aparte del barrio.** `location_id` sigue siendo la unidad
> del matching (`match/2`, por comuna). `studio_lat`/`studio_lng` es otra
> cosa: coordenadas reales, autoprovistas por el artista, que solo sirven
> para mostrar una distancia en la pantalla de Matches — nunca entran al
> puntaje. Solo se escriben vía `set_studio_location()` (SECURITY DEFINER,
> owner-scoped, sin política de UPDATE general sobre la tabla). Ver
> `supabase/migrations/20260818000400_studio_location.sql` y
> `docs/product/matching.md` §4.1.

> **Desvío respecto del brief.** El brief lista `Professional` y
> `ProfessionalProfile` como entidades separadas. Una partición 1:1 agrega un
> join, un segundo juego de políticas y una clase de bugs de "falta la fila de
> perfil", y no aporta nada en V1. La separación que sí importa —un *usuario* no
> es un *profesional*— se conserva vía `owner_user_id` nullable. Ver
> [ADR-003](../decisions/ADR-003-domain-model.md).

**`professional_styles`** — PK `(professional_id, style_id)`, `proficiency`
numeric CHECK `> 0 AND <= 1`, `is_primary` boolean. Un artista tiene como mucho
3 estilos primarios: si todo es primario, nada lo es. No se puede expresar con
un CHECK (mira otras filas) ni con un índice único (no cuenta), así que lo impone
un trigger AFTER por fila — que alcanza porque el invariante es monótono.

**`media_assets`** — `id`, `bucket`, `path` (UNIQUE junto con bucket),
`mime_type`, `width`, `height`, `byte_size`, `blurhash`, `checksum`,
`owner_user_id` NULL (se setea para subidas de usuario, NULL para contenido
curado), `created_at`.

`bucket` está acotado por CHECK a `portfolio` / `references` / `avatars`, y
`mime_type` a JPEG / PNG / WebP / AVIF — **sin SVG**, que es un documento
ejecutable servido desde nuestro dominio. `owner_user_id` cascadea al borrar la
cuenta y no hace SET NULL: dejar huérfana una imagen privada la convertiría en
media "curada", legible por cualquiera.

**`portfolio_items`** — `id`, `professional_id` → CASCADE, `media_id` →
RESTRICT (nunca dejar huérfana una referencia de imagen), `caption` NULL, `year`
NULL, `is_featured`, `sort_order`, `is_fixture`, `created_at`. UNIQUE sobre
`media_id`: dos piezas apuntando al mismo archivo serían dos tarjetas idénticas
en el mazo.

**`portfolio_item_styles`** — PK `(portfolio_item_id, style_id)`, `weight`
numeric CHECK `> 0 AND <= 1`. Los pesos suman 1 por pieza; impuesto por el
validador del seed y verificado por un test de base de datos, no por un trigger
(un trigger tendría que dispararse en el último insert del conjunto, lo que es
frágil).

### Demanda

**`interactions`** — todo el registro de comportamiento.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL | → `profiles` ON DELETE CASCADE |
| `portfolio_item_id` | uuid NOT NULL | → `portfolio_items` ON DELETE CASCADE |
| `verdict` | `interaction_verdict` NOT NULL | `like` \| `pass` |
| `is_saved` | boolean NOT NULL DEFAULT false | |
| `source` | `interaction_source` NOT NULL | `discover` \| `search` \| `profile` |
| `created_at`, `updated_at` | timestamptz | |

UNIQUE `(user_id, portfolio_item_id)` — estado actual, no un log. Deshacer es un
update o un delete; el gusto es una función pura de estas filas.
CHECK `NOT (is_saved AND verdict = 'pass')`.

> **Desvío respecto del brief.** No hay tabla `saved_items` — guardar es
> `is_saved = true`. Dos representaciones del mismo hecho se van a contradecir.

**`taste_profiles`** — PK `(user_id, category_id)`. `vector jsonb`
(`{style_slug: score}`), `aversion jsonb`, `decisive_count int`, `is_ready
boolean`, `algo_version text`, `computed_at timestamptz`. Un caché de un valor
derivable, conservado para continuidad entre dispositivos y para análisis.

**`projects`** — `id`, `user_id` → CASCADE, `category_id` → RESTRICT, `title`,
`description` NULL, `location_id` NULL, `budget_min_cents`/`budget_max_cents`
NULL, `budget_currency` NULL, `timing` enum NULL
(`asap`/`weeks`/`months`/`flexible`), `size_note` NULL, `status` enum
(`draft`/`active`/`archived`), timestamps.

**`project_styles`** — PK `(project_id, style_id)`, `weight` numeric.

**`project_references`** — PK `(project_id, media_id)`, `sort_order`. La media
va en el bucket privado `references`, propiedad del usuario.

**`matches`** — `id`, `user_id` → CASCADE, `professional_id` → CASCADE,
`project_id` NULL → CASCADE, `score` numeric, `band` enum, `components jsonb`,
`reasons jsonb`, `matching_version`, `taste_version`, `computed_at`. UNIQUE
`(user_id, professional_id, coalesce(project_id, '00000000-…'::uuid))`.
`components` y `reasons` se guardan para poder auditar un match meses después —
"¿por qué dijimos eso?" tiene que ser una pregunta contestable.

**Las razones están verificadas por la base, no solo por TypeScript.** El CHECK
`matches_reasons_are_grounded` rechaza cualquier razón cuyo campo `component` no
exista en `components` con aporte mayor a cero, y otro acota el arreglo a 3
razones. Es el innegociable #2 del `CLAUDE.md`, y es demasiado importante para
vivir solamente en el cliente: una razón inventada es una afirmación falsa sobre
por qué le recomendamos a alguien una persona.

### Operacionales

**`analytics_events`** — `id`, `user_id` NULL → SET NULL, `session_id uuid`,
`name text`, `props jsonb`, `occurred_at`, `app_version`, `platform`. Solo
INSERT de cliente, sin SELECT de cliente. Reglas de propiedades en
[`metrics.md`](../product/metrics.md) §5.

**`audit_events`** — `id`, `actor_user_id` NULL, `action`, `entity_type`,
`entity_id`, `metadata jsonb`, `occurred_at`. RLS habilitado con **ninguna
política** — solo service role. Se escribe para: corridas de carga de contenido,
publicar/despublicar, retiro de artista, borrado de cuenta.

## 3. Entidades del brief que V1 no crea

| Entidad | Decisión |
|---|---|
| `ProfessionalProfile` | Fusionada en `professionals` (ADR-003) |
| `SavedItem` | Representado como `interactions.is_saved` |
| `Conversation`, `Message` | ~~No se construye~~ — **revertido por [ADR-012](../decisions/ADR-012-chat.md)**. Se construyó chat propio; ver §Conversaciones. El contacto por WhatsApp/Instagram se mantiene y sigue siendo el único camino para un perfil sin reclamar. |
| `Review` | No se construye — sin transacciones y con ~12 artistas, cualquier UI de reseñas queda vacía o inventada |
| `Availability` (tabla) | Colapsada en dos columnas de `professionals`, con manejo de desactualización |

Cada una está registrada con su razonamiento en
[`product-spec.md`](../product/product-spec.md) §12. Ninguna requiere reescribir
el esquema para agregarse después.

### Conversaciones

**`availability_rules`** — el horario semanal de un artista: día de la semana
más un tramo de hora a hora. Varias filas por día se permiten (mañana y tarde);
los huecos libres **no se guardan, se calculan**. Ver
[ADR-018](../decisions/ADR-018-availability.md).

**`availability_exceptions`** — un día que no sigue la regla: cerrado, o abierto
en otro horario. Una restricción impide el "cerrado de 14 a 20", que no
significa nada. Una excepción **reemplaza** a la regla de ese día, no se le
suma: si se sumaran, marcar un feriado no serviría para nada.

**`appointments`** — un turno, nacido de un chat. `conversation_id` es de dónde
salió y de dónde sale quién es el cliente; se guarda con `on delete set null`
porque borrar un chat no puede borrar un turno que las dos partes tienen
anotado.

| Columna | Tipo | Notas |
|---|---|---|
| `professional_id` | uuid NOT NULL | → `professionals` ON DELETE CASCADE |
| `user_id` | uuid NOT NULL | el cliente, copiado de la conversación |
| `conversation_id` | uuid | → `conversations` ON DELETE SET NULL |
| `starts_at`, `ends_at` | timestamptz NOT NULL | `ends_at > starts_at` |
| `status` | enum | `scheduled` · `cancelled` |
| `note` | text | lo que se va a tatuar, en palabras del artista |

**"Ocupado" es una restricción de exclusión**, no un chequeo en la app: dos
turnos `scheduled` del mismo artista no pueden solaparse, y lo impone Postgres.
El rango es `[)` para que dos turnos consecutivos convivan. Los cancelados
quedan fuera del índice parcial, así que cancelar libera el horario al instante
sin borrar el historial.

**No hay estado "completado":** que un turno ya pasó se deriva de `ends_at`. Un
estado que nadie marca queda para siempre en su valor inicial, mintiendo — y las
reseñas se apoyan exactamente en esto.

**Un turno que ya pasó no se cancela.** `cancel_appointment()` lo rechaza con
`22023`. Es una enmienda a ADR-018 hecha desde las reseñas: cancelar el pasado
borraría la reseña que nació de ese turno, por el `on delete cascade`. Ver
[ADR-019](../decisions/ADR-019-reviews.md).

**`reviews`** — una reseña, colgada del turno que la habilita.

| Columna | Tipo | Notas |
|---|---|---|
| `appointment_id` | uuid NOT NULL UNIQUE | → `appointments` ON DELETE CASCADE |
| `professional_id` | uuid NOT NULL | copiado del turno, verificado por la política |
| `user_id` | uuid NOT NULL | → `profiles` ON DELETE CASCADE |
| `rating` | smallint NOT NULL | `between 1 and 5`; lo único obligatorio |
| `body` | text | 1 a 1000; opcional |
| `media_id` | uuid | → `media_assets` ON DELETE SET NULL; bucket `reviews` |
| `created_at` | timestamptz NOT NULL | |
| `updated_at` | timestamptz | lo pone un trigger; la pantalla dice "Editada" |

Tres cosas que definen la tabla:

- **El candado vive en la política de INSERT**: turno propio, con ese artista,
  no cancelado y con `ends_at < now()`.
- **La SELECT de la tabla es solo lo propio**, porque la fila lleva `user_id`.
  Lo público sale de `get_reviews()`, que no devuelve quién escribió cada una.
- **El artista no aparece en ninguna política de escritura**: no la escribe, no
  la edita, no la borra, y tampoco lee la tabla. Cuenta y promedio salen de
  `get_review_summary()`, que calcula al leer — no hay ningún agregado guardado.

**`profiles.adult_confirmed_at`** — cuándo declaró ser mayor de 18, o `null`. No
hay fecha de nacimiento en ningún lado. La escribe solo `confirm_adult()`, y la
verifica `schedule_appointment()` sobre la persona que se va a tatuar. Ver
[ADR-025](../decisions/ADR-025-age-gate.md).

**`notifications`** — un hecho real y reciente sobre quien lo recibe. **No tiene
ninguna columna de texto**: lleva un `kind` de un enum cerrado y una referencia,
y la frase la arma la pantalla con i18n. Esa ausencia es lo que hace imposible
inventar urgencia o filtrar contenido ajeno. La escriben tres triggers, nunca el
cliente. Ver [ADR-027](../decisions/ADR-027-notifications.md).

**`reports` / `blocks`** — moderación. Ver
[ADR-023](../decisions/ADR-023-moderation.md).

`reports` lleva `target_kind` más una FK por tipo de objetivo —perfil, obra,
reseña, mensaje, turno del asistente— y una restricción que impide que se llene
la columna que no corresponde. Las FK son `on delete set null`: la denuncia
sobrevive al borrado de lo denunciado, sin su objeto. Un índice único parcial
por objetivo impide denunciar dos veces lo mismo.

`blocks` tiene dos direcciones —la persona bloquea un perfil, el artista bloquea
una persona— con una restricción de un objetivo por fila. El bloqueo lo imponen
las políticas de `conversations`, `messages` y `project_interests`, y los filtros
de `get_open_search_feed`, `get_artist_grid` y `get_discovery_feed`. La función
`is_blocked_pair()` responde por las dos direcciones y **solo a las partes**.

**`assistant_threads` / `assistant_turns`** — la conversación con el asistente
que arma un pedido. Ver [ADR-021](../decisions/ADR-021-brief-assistant.md).

| Columna | Tipo | Notas |
|---|---|---|
| `assistant_threads.user_id` | uuid NOT NULL | → `profiles` ON DELETE CASCADE |
| `assistant_threads.category_id` | uuid NOT NULL | → `categories` ON DELETE RESTRICT |
| `assistant_threads.project_id` | uuid | → `projects` ON DELETE SET NULL; lo escribe `attach_thread_project()` |
| `assistant_threads.last_turn_at` | timestamptz | denormalizado, lo mueve un trigger |
| `assistant_turns.role` | `assistant_role` | `person` \| `assistant` |
| `assistant_turns.body` | text NOT NULL | 1 a 2000 |

Tres cosas que definen estas tablas:

- **El hilo tiene un solo lado.** No es una `conversation`: del otro lado no hay
  una persona sino una función, y por eso no hay política que le dé acceso a
  nadie más que a su dueña.
- **El cliente solo puede insertar `role = 'person'`.** Es lo que impide que un
  cliente modificado fabrique una respuesta del asistente —un precio, una
  disponibilidad— y la muestre como si MESH la hubiera dicho. El turno del
  asistente lo escribe la Edge Function con la service key.
- **El hilo se borra entero y los turnos son inmutables.** DELETE sobre
  `assistant_threads` es del cliente a propósito; sobre `assistant_turns` no
  existe.

El pedido confirmado **no vive acá**: va a `projects.description`, que ya
existía y que el artista ya ve por `get_open_searches()`.

**`get_reply_habit()`** — con qué frecuencia contesta un artista. No hay tabla:
se calcula al leer sobre `conversations` y `messages`, devuelve un valor de un
enum de tres —`same_day`, `few_days`, `slower`— o `null` con menos de tres
conversaciones. `security definer` porque cruza conversaciones de personas
distintas; no devuelve fechas, ni conteos, ni identidades. Ver
[ADR-022](../decisions/ADR-022-reply-habit.md).

**`saved_items`** — una obra que alguien guardó con el corazón. Privada de
punta a punta: las tres políticas filtran por `auth.uid()` y **no existe
ninguna consulta que cuente guardados ajenos**, ni siquiera para el artista
dueño de la obra. Ver [ADR-016](../decisions/ADR-016-saved-items.md).

| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | uuid NOT NULL | → `auth.users` ON DELETE CASCADE |
| `portfolio_item_id` | uuid NOT NULL | → `portfolio_items` ON DELETE CASCADE |
| `created_at` | timestamptz NOT NULL | orden de la pantalla de Guardados |

`unique (user_id, portfolio_item_id)`: guardar dos veces la misma obra es
guardarla una vez. Sin UPDATE — desguardar es borrar la fila, no apagar un
booleano, porque un booleano deja la fila de quien se arrepintió y esa fila es
la que después alguien cuenta como interés.

**`conversations`** — un hilo entre una persona y un artista con perfil
reclamado.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL | → `profiles` ON DELETE CASCADE |
| `professional_id` | uuid NOT NULL | → `professionals` ON DELETE CASCADE |
| `last_message_at` | timestamptz NULL | denormalizado, lo mueve un trigger |
| `user_read_at`, `professional_read_at` | timestamptz NULL | los mueve `mark_conversation_read()` |
| `created_at` | timestamptz | |

`unique (user_id, professional_id)`: abrir el chat dos veces con la misma
persona sigue el mismo hilo.

**`messages`** — inmutable.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `conversation_id` | uuid NOT NULL | → `conversations` ON DELETE CASCADE |
| `sender_user_id` | uuid NOT NULL | → `profiles` ON DELETE CASCADE |
| `body` | text NOT NULL | CHECK 1–2000 caracteres sin contar espacios |
| `created_at` | timestamptz | |

Sin UPDATE ni DELETE para el cliente: no se edita lo dicho, y no se borra media
conversación que otra persona también tiene. Las dos tablas están en la
publicación de realtime, que respeta RLS. Ver
[ADR-012](../decisions/ADR-012-chat.md).

### Preferencias del perfil

`profiles` suma una columna, nullable:

| Columna | Tipo | Notas |
|---|---|---|
| `onboarding_intent` | `onboarding_intent` NULL | `offering` / `looking`. Preferencia de arranque, **no** un rol excluyente. NULL = no contestó |

**`search_radius_km` se cayó.** Existió para filtrar la lista de encajes por
distancia; los encajes salieron de la app
([D-010](../design/MESH-DESIGN-DECISIONS.md)) y la columna quedó
escribiéndose y leyéndose a sí misma, con un control en Perfil que prometía un
filtrado que ya no ocurría. Desde dónde se mira es hoy una preferencia **del
dispositivo**, no de la cuenta, y vive en el almacenamiento local: el GPS lo es
por definición, y el barrio desde el que mirás depende de dónde estés, no de
quién sos. Ver [D-012](../design/MESH-DESIGN-DECISIONS.md).

Elegir `offering` lleva al estudio: crear el perfil propio, o canjear el código
si MESH armó uno. Es una preferencia de arranque y nada más — la que crea el
perfil es la persona, tocando el botón. Ver
[ADR-013](../decisions/ADR-013-artist-self-signup.md).

## 4. Índices

```sql
-- feed y exclusión
create index on interactions (user_id, portfolio_item_id);
create index on interactions (user_id, updated_at desc);
create index on portfolio_items (professional_id, sort_order);
create index on portfolio_items (is_featured) where is_featured;
-- joins de taxonomía
create index on portfolio_item_styles (style_id);
create index on professional_styles (style_id);
-- catálogo
create index on professionals (category_id, is_published) where is_published;
create unique index on professionals (slug);
-- matching y datos de usuario
create index on matches (user_id, score desc);
create index on projects (user_id, status);
create index on analytics_events (occurred_at);
-- buscar por nombre
create index on professionals using gin (search_key(display_name) gin_trgm_ops);
```

Cada índice de acá existe porque una consulta concreta de
[`system-architecture.md`](system-architecture.md) §4 lo necesita. Los índices
sin una consulta con nombre no se agregan.

## 4b. RPCs

**`get_discovery_feed(p_category_slug, p_limit, p_cursor)`** — `SECURITY
INVOKER`, con `search_path` fijado. Devuelve la pieza, su media, su profesional y
sus estilos en un solo round trip: del lado del cliente, armar el mazo
significaría bajar el catálogo entero para descartar la mayor parte.

Que sea INVOKER importa: las políticas de `portfolio_items`, `professionals` e
`interactions` se aplican adentro. Los predicados explícitos que igual están
escritos son redundantes a propósito — si alguien afloja una política, la
consulta no se abre sola.

El orden implementa [`matching.md`](../product/matching.md) §7. Dos detalles que
no son evidentes leyendo la consulta y que tienen su test:

- La **profundidad** (qué número de obra es dentro de su profesional) se calcula
  sobre todas las piezas publicadas, *antes* de descartar las ya vistas. Si se
  calculara después, cada me gusta correría la numeración de todo lo que sigue y
  la paginación por cursor empezaría a saltear obra.
- El desempate dentro de una misma profundidad es una clave **por profesional**,
  no por pieza. Con una clave por pieza el orden de los profesionales cambia en
  cada vuelta, y el último de una vuelta puede ser el mismo que el primero de la
  siguiente — que es exactamente el bug que encontró el test de diversidad.

**`claim_professional(p_code)`** — `SECURITY DEFINER`, `search_path` fijado.
Canjea un código de un solo uso y deja a quien llama como dueño del perfil
correspondiente. DEFINER porque tiene que leer `professional_claims`, la
tabla que el cliente no puede ver. Ver
`supabase/migrations/20260818000300_artist_portfolio.sql` y
`supabase/tests/25_artist_ownership.sql`.

**`set_studio_location(p_lat, p_lng, p_neighborhood_slug)`** — `SECURITY
DEFINER`, `search_path` fijado, owner-scoped por `owner_user_id = auth.uid()`.
Escribe `studio_lat`/`studio_lng` y, si el barrio se reconoció contra
`locations`, también `location_id`. Angosta a propósito: tres columnas, nada
más — una política de UPDATE general sobre `professionals` abriría precio,
disponibilidad y estilos con el mismo `with check`. El barrio lo resuelve el
geocoder del sistema operativo en el cliente y llega como slug; un slug que no
existe se descarta y **no borra el barrio que ya estaba**, porque un geocoder
puede fallar una vez y perder un dato bueno por eso sería peor. Ver
`supabase/migrations/20260818000400_studio_location.sql` y
`supabase/migrations/20260819000400_artist_self_signup.sql`.

**`create_own_professional(p_display_name, p_instagram, p_whatsapp)`** —
`SECURITY DEFINER`, `search_path` fijado. Crea el perfil de artista de quien
llama y devuelve el slug. DEFINER y no una política de INSERT porque
`owner_user_id`, `category_id`, `is_published` e `is_fixture` los tiene que
fijar el servidor: con una política los mandaría el cliente, y `is_fixture:
true` dejaría a cualquiera marcarse como registro de prueba. Uno por persona,
impuesto por el índice único parcial `professionals_one_per_owner`. El slug se
deriva del nombre —minúsculas, sin acentos, sin nada que no sea alfanumérico— y
los repetidos se numeran. Ver
[ADR-013](../decisions/ADR-013-artist-self-signup.md).

**`get_open_search_feed(p_category_slug, p_limit, p_cursor)`** — `SECURITY
DEFINER`, `search_path` fijado. El mazo del artista: las búsquedas con
`is_open_to_professionals` que piden algún estilo que él declaró, sin las que ya
decidió, lo más nuevo primero. DEFINER al revés que `get_discovery_feed`, que es
INVOKER: ahí se muestran filas que quien llama ya puede leer; acá, filas que un
artista NO puede leer y no queremos que pueda. Lo que se expone no es la tabla,
es esta proyección columna por columna — y **no incluye `user_id`**. Ver
[ADR-014](../decisions/ADR-014-two-sided.md).

**`get_search_interests(p_project_id default null)`** — `SECURITY INVOKER`. Los
artistas que levantaron la mano ante una búsqueda propia; sin argumento, ante
todas. Solo `verdict = 'interest'`: un `pass` no se le muestra nunca a la
persona.

**`is_search_open(p_project_id)`** / **`is_open_search_reference(p_path)`** —
`SECURITY DEFINER`, devuelven un booleano sobre un id o una ruta que quien
pregunta ya tiene. Existen porque una política que consulte `projects` o
`media_assets` se evalúa con los permisos de quien escribe, que no puede leer
ninguna de las dos, y queda muda. Las usan la política de INSERT de
`project_interests` y la de lectura del bucket `references`.

**`set_own_styles(p_style_slugs[])`** — `SECURITY DEFINER`, `search_path`
fijado, owner-scoped. Reemplaza el conjunto entero de `professional_styles` del
perfil propio; los primeros tres quedan `is_primary` (el tope lo impone
`enforce_primary_style_cap`). Un slug inexistente falla con `23503` en vez de
saltearse: guardar en silencio menos estilos de los que la persona eligió es
peor que fallar. Sin esto un perfil creado desde la app saca cero en el
componente Estilo del matching, que pesa 0,70 — existe en el catálogo y no
aparece nunca.

**`get_style_examples(p_category_slug)`** — `SECURITY INVOKER`, `search_path`
fijado. Una foto real y publicada por estilo, la de mayor peso declarado
(`portfolio_item_styles.weight`). Se construyó para un selector visual manual
en "buscar por fotos" que después se reemplazó por clasificación con IA (ver
[ADR-011](../decisions/ADR-011-photo-classification.md)) — sin caller en el
cliente hoy, pero no se borra: es una migración ya pusheada, y candidata a
remoción en una migración posterior si nadie la retoma. Ver
`supabase/migrations/20260819000100_style_examples.sql` y
`supabase/tests/35_style_examples.sql`.

**`read-reference`** (Edge Function, no RPC de Postgres) — antes
`classify-style`. Recibe la primera foto de referencia de "buscar por fotos" en
base64 y la lee contra el vocabulario activo de la categoría: estilo, zona del
cuerpo, tamaño y paleta, cada campo con su slug real o `null`. Corre en el
servidor con `ANTHROPIC_API_KEY` como secreto — nunca en el cliente. Ver
`supabase/functions/read-reference/index.ts`,
[ADR-011](../decisions/ADR-011-photo-classification.md) y
[ADR-020](../decisions/ADR-020-brief.md).

**`brief-assistant`** (Edge Function) — la otra puerta al mismo pedido, para
quien no tiene una foto. Recibe un mensaje, guarda el turno de la persona con su
JWT, y obliga al modelo a contestar eligiendo una de dos herramientas: preguntar
una cosa más, o cerrar el pedido con los slugs del vocabulario cerrado. Es la
única de las dos que produce texto libre, y por eso viene con siete reglas duras
y una pantalla de confirmación editable. Ver
`supabase/functions/brief-assistant/index.ts` y
[ADR-021](../decisions/ADR-021-brief-assistant.md).

Las dos comparten la barrera que valida cada slug contra la lista que entró
(`supabase/functions/_shared/vocabulary.ts`): dos copias de una barrera de
seguridad es una barrera que algún día se arregla en un solo lado.

**`search_professionals(p_category_slug, p_query, p_limit, p_pieces)`** —
`SECURITY INVOKER`, misma forma de retorno que `get_artist_grid` para que la
pantalla reutilice la tarjeta sin traducir nada. Compara contra
`search_key(display_name)` y `search_key(slug)`, donde `search_key()` es
`lower(unaccent(...))` declarada `immutable` nombrando el diccionario explícito
—`unaccent(text)` de un argumento es apenas `stable` y no serviría para un
índice funcional—.

Tres diferencias con la grilla, las tres deliberadas: **no** exige tener obra
publicada (una búsqueda por nombre es puntería, no descubrimiento), ordena por
parecido en vez de mezclar, y el cliente no le aplica `sortByProximity`. El
filtro de bloqueos es idéntico. El texto se escapa antes del `like`. Piso de dos
caracteres, en la base y en el cliente. Ver
[ADR-029](../decisions/ADR-029-search-by-name.md).

**Ninguna de las dos toca el ranking.** El motor de matching que puntúa y ordena
sigue siendo el determinístico de arriba; lo que estas funciones producen entra
como un dato más.

## 5. Enums

`availability_status`, `interaction_verdict`, `interaction_source`,
`project_timing`, `project_status`, `match_band`. Enums de Postgres, porque son
conjuntos cerrados, chicos, y compartidos con los tipos TypeScript generados
desde el esquema. Cualquier cosa plausiblemente abierta (estilos, categorías) es
una tabla, no un enum.

## 6. Timestamps y borrado lógico

Todas las tablas tienen `created_at timestamptz NOT NULL DEFAULT now()`. Las
mutables además tienen `updated_at`, mantenido por un trigger compartido.

**Sin borrado lógico en V1.** `is_published = false` cubre el único caso real
(ocultar un artista). Una columna `deleted_at` en cada tabla duplica la cantidad
de formas en que cada política RLS y cada consulta pueden estar mal. El borrado
real cascadea y se audita.

## 7. Convenciones de migración

- SQL numerado, solo hacia adelante, en `supabase/migrations/`, un asunto por
  archivo.
- Toda migración que crea una tabla tiene que, en el mismo archivo: habilitar
  RLS, forzar RLS, revocar los grants por defecto y agregar políticas
  explícitas. Una migración que crea una tabla sin políticas rompe el CI.
- Los datos de referencia (categorías, estilos, ubicaciones) se cargan desde
  `supabase/seed.sql` y son idempotentes (`on conflict do update`). Ese archivo
  está **generado** desde `packages/domain/src/taxonomy/` (`npm run
  db:reference`), y CI corre `db:reference:check`: la taxonomía existe dos veces
  por necesidad —como constantes, porque el motor de gusto la necesita sin base
  de datos; como filas, porque el esquema no puede tener los estilos
  hardcodeados— y dos copias escritas a mano se separan.
- Los tipos TypeScript se generan con `npm run db:types` a
  `packages/domain/src/db/database.types.ts`, y `database.types.test.ts`
  reconcilia esos tipos con los escritos a mano en `types/core.ts`. CI corre
  `db:types:check`.
- Ninguna migración se edita después de haber sido aplicada al proyecto de
  staging.
