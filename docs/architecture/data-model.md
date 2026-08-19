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
| `Conversation`, `Message` | No se construye — el contacto de V1 es WhatsApp/Instagram. Construir un subsistema de mensajería sin uso agrega superficie de moderación, notificaciones y abuso sin demanda validada. |
| `Review` | No se construye — sin transacciones y con ~12 artistas, cualquier UI de reseñas queda vacía o inventada |
| `Availability` (tabla) | Colapsada en dos columnas de `professionals`, con manejo de desactualización |

Cada una está registrada con su razonamiento en
[`product-spec.md`](../product/product-spec.md) §12. Ninguna requiere reescribir
el esquema para agregarse después.

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
