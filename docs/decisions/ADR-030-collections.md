# ADR-030 — Colecciones: etiquetas sobre lo guardado

**Estado:** Aceptado (2026-08-21) · **Fecha:** 2026-08-21 · **Responsable:** product-architect
**Enmienda:** [ADR-016](ADR-016-saved-items.md)

## Contexto

[ADR-016](ADR-016-saved-items.md) construyó guardar obra y cerró la puerta a
esto mismo, con estas palabras exactas:

> **Sin carpetas ni tableros.** Una lista sola alcanza para quince artistas.
> Cuando no alcance, se va a ver — y va a ser un problema lindo de tener.

Esta ADR revierte esa frase. Y hay que decir con qué la reemplaza: no la
reemplaza un número. No hay quince mil guardados por usuario, no hay una
métrica de uso que se salió de rango, no midamos nada que diga "la lista sola
ya no alcanza". Lo que cambió es el criterio de producto al encarar el rediseño
de Perfil — se decidió, con las dos opciones sobre la mesa, que organizar lo
guardado vale la complejidad de una tabla más. Es la misma clase de giro que
[ADR-017](ADR-017-saved-ranking.md) hizo con el ranking un día después de
ADR-016: no un error de la ADR anterior, una decisión nueva encima de la vieja,
con el costo escrito.

Que quede dicho así y no disfrazado de escala es justamente lo que esta serie
de ADRs viene haciendo — ADR-017 ya lo dijo mejor que como lo diría yo: "esta
ADR existe para que quede el registro de qué se cambió, qué se conservó y qué
se resignó".

## Problema

¿Cómo se deja que alguien agrupe lo que guardó, sin duplicar el hecho de
"guardado" que ya vive en `saved_items`, y sin que borrar una carpeta se lleve
puesta la obra?

## Decisión

**Una colección es una etiqueta, no un lugar.** Guardar sigue siendo un corazón
y un insert en `saved_items`, sin fricción y sin preguntar nada — eso no se
toca. Una colección es una agrupación *encima* de lo ya guardado: nombrarla no
guarda nada nuevo, y borrarla no desguarda nada.

### 1. Todo sigue siendo la vista sin filtrar, y no es una fila

"Todo" no se crea, no se lista aparte, no tiene RLS propia: es `fetchSaved()`
tal cual existe hoy, sin ningún filtro de colección encima. Modelarla como fila
—una colección especial que no se puede borrar— sería la clase de excepción
que un día alguien rompe con un DELETE que no debería poder correr. No existir
es una garantía más fuerte que una restricción que lo impida.

### 2. Pertenencia múltiple, con la misma regla que guardar

Una obra guardada puede estar en cero, una o varias colecciones. La tabla de
pertenencia sigue el mismo principio que ADR-016 ya fijó para `saved_items`:
**insert y delete, nunca un booleano.** Agregar a una colección es una fila;
sacar de una colección es borrar esa fila. No hay un `in_collection boolean`
por colección que togglear, por el mismo motivo que no hay un `saved boolean`:
la fila de quien se arrepintió es exactamente la que después alguien lee como
si fuera señal.

### 3. Borrar una colección borra la agrupación, nunca la obra

La FK de pertenencia hacia `collections` es `on delete cascade`; la FK hacia
`saved_items` también lo es, pero en la dirección contraria: si se borra la
colección, se van las filas de pertenencia de esa colección — la obra sigue
guardada, ahora solo visible en "Todo", que nunca dejó de contenerla. Si se
desguarda la obra (o el artista borra la pieza y `saved_items` cascadea), la
pertenencia a cualquier colección que la tuviera se va con ella, porque una
etiqueta sobre algo que ya no existe no es una etiqueta de nada.

Esto es una cascada de dos saltos —`portfolio_items` → `saved_items` →
pertenencia— y Postgres la resuelve sola dentro de la misma transacción; no
hace falta un trigger. Queda como test, no como promesa (ver §RLS y tests
abajo).

### 4. El nombre se pone una vez

Un tope de ~40 caracteres, sin política de UPDATE. Renombrar después de creada
queda **fuera de esta ADR** — lo marcó UX explícitamente y no hay pantalla que
lo pida todavía. El día que se pida es agregar una política de UPDATE angosta
a una tabla que ya existe, no un cambio de forma.

## Esquema propuesto

*(Propuesta para `backend-engineer` — no es la migración.)*

```
collections
  id           uuid pk default gen_random_uuid()
  user_id      uuid not null references public.profiles(id) on delete cascade
  name         text not null check (length(name) between 1 and 40)
  created_at   timestamptz not null default now()
  -- Sin updated_at: nada la muta después de creada en V1 (§4).
  -- Sin unique(user_id, name): no se pidió, y forzarlo exige normalizar
  --   mayúsculas/acentos para que "Ideas" e "ideas" no convivan — costo real
  --   por un requisito que nadie escribió. Si dos colecciones con el mismo
  --   nombre confunden en la práctica, es una decisión de UX para otra vuelta,
  --   barata de agregar (una migración de índice único funcional).

  index (user_id, created_at desc)   -- listar "mis colecciones"

collection_items
  collection_id  uuid not null references public.collections(id) on delete cascade
  saved_item_id  uuid not null references public.saved_items(id) on delete cascade
  created_at     timestamptz not null default now()
  primary key (collection_id, saved_item_id)   -- agregar dos veces es agregar una vez

  index (collection_id, created_at desc)  -- grilla de una colección, más nuevo primero
  index (saved_item_id)                   -- "¿en qué colecciones está esta obra?"
```

`user_id` va contra `profiles`, no contra `auth.users` como hace
`saved_items` — es la convención que sigue el resto del esquema (`projects`,
`conversations`, `appointments`…); `saved_items` es la excepción histórica, no
al revés, y no hay motivo para propagarla acá.

## Políticas RLS

*(Forma, no SQL literal — `backend-engineer` lo traduce en la migración.)*

**`collections`** — RLS habilitado y forzado, sin `for all`, sin política de
UPDATE (no hay verbo UPDATE que cubrir en V1):

- `select`: `user_id = auth.uid()`
- `insert`: `with check (user_id = auth.uid())`
- `delete`: `using (user_id = auth.uid())`

**`collection_items`** — no lleva `user_id` propio; la propiedad se prueba
contra las dos tablas que referencia:

- `select`: existe una colección propia con ese `collection_id`
- `insert`: `with check` de **dos** condiciones, las dos hacen falta —
  la colección referenciada es propia, **y** el `saved_item` referenciado es
  propio. Sin la segunda, cualquiera podría enterarse de un `saved_item_id`
  ajeno (por ejemplo, mirando la red) y colgarlo de una colección propia; sin
  la primera, podría escribir en la colección de otro.
- `delete`: existe una colección propia con ese `collection_id`

### El caso de acceso cruzado para pgTAP

`supabase/tests/62_collections.sql` (próximo número libre), siguiendo el
patrón de `48_saved_items.sql` y `51_reviews.sql`:

1. Usuario B guarda una obra y crea una colección. Usuario A no ve esa fila de
   `collection_items` (`select` → `[]`).
2. A intenta insertar `(collection_id = de B, saved_item_id = propio)` →
   rechazado. Cubre "escribir en colección ajena".
3. A intenta insertar `(collection_id = propio, saved_item_id = de B)` →
   rechazado. Cubre "colgar de la propia una obra guardada por otro" — el caso
   que un `with check` de una sola condición se comería.
4. A borra `(collection_id = de B, …)` → 0 filas afectadas, la fila de B sigue.
5. B borra su colección → la fila de `collection_items` desaparece, pero el
   `saved_item` de B sigue existiendo en `saved_items` (la obra sigue
   "guardada", solo que ya no etiquetada).
6. Se borra el `portfolio_item` subyacente (como dueño del contenido) →
   `saved_items` de B cascadea (ya testeado en 48) y la fila de
   `collection_items` que lo etiquetaba **también** desaparece, sin quedar
   huérfana. Este es el test nuevo que no existía antes de esta ADR.

## Consultas nuevas

*(Forma para `features/collections/queries.ts`, un archivo nuevo — separado de
`features/saved/queries.ts`, que se queda con "Todo" y el corazón. Colecciones
tiene su propio perímetro de RLS y su propia pantalla; mezclarlo en el mismo
archivo obliga a leer guardar-una-obra para entender crear-una-colección, que
son dos cosas.)*

- **Crear colección** — `insert` directo a `collections`, mismo patrón que
  `savePiece`: el cliente manda `user_id` explícito porque no hay valor por
  default que lo derive de `auth.uid()` del lado de la política.
- **Listar colecciones con conteo + portada** — un RPC,
  `get_my_collections()`, `security invoker` (RLS ya alcanza; no cruza límite
  de confianza de nadie). Trae en un solo round trip lo que la tarjeta de
  colección necesita: `id`, `name`, `created_at`, cuántos ítems tiene, y el
  `media_assets` de la obra agregada más reciente como portada. Es exactamente
  el caso que `system-architecture.md` §4/§6 pide resolver con un RPC en vez
  de tres queries: colección → pertenencia → obra → media, agregado por
  colección, es un join que el cliente no debería armar a mano.
- **Agregar/quitar pertenencia** — `insert`/`delete` directos sobre
  `collection_items`, mismo patrón idempotente que `savePiece`/`unsavePiece`:
  un 23505 en el insert (ya estaba) no es un error que mostrar.
- **Qué colecciones tiene una obra** — `select collection_id from
  collection_items where saved_item_id = X`, para pintar los checks del sheet
  de "agregar a colección". Directo, sin RPC: es una tabla y un filtro, RLS ya
  alcanza.
- **Borrar colección** — `delete` directo sobre `collections`; el cascade hace
  el resto.
- **Ítems de una colección** — mismo shape que `fetchSaved()` (obra + media +
  profesional), pero uniendo por `collection_items.collection_id` en vez de
  traer todo `saved_items` de la persona. Reutiliza el tipo `SavedPiece` que
  ya existe.
- **Servicios completados** — sin tabla ni columna nueva. `appointments` ya
  tiene una política de `select` que deja al artista leer sus propios turnos
  completos (`appointments_select_participants`, ADR-018) — a diferencia de
  `reviews`, donde la fila ajena está oculta y por eso `get_review_summary()`
  necesita cruzar el límite de RLS. Acá no hay límite que cruzar: es un
  agregado sobre filas que el artista ya puede leer. Igual conviene un RPC
  chico, `get_completed_appointments_count()`, `security invoker`, sin
  argumentos — no para saltear RLS sino para no repetir en el cliente "buscá mi
  `professional_id` y compará contra `now()`" y para no depender de la hora del
  teléfono (`ends_at < now()` calculado en el servidor, no con un timestamp que
  manda el cliente). Devuelve `0` si quien llama no tiene perfil de artista,
  en vez de fallar — la pantalla de Estudio ya sabe que solo la ve un
  profesional, pero la función no necesita asumirlo.
- **Miembro desde** — ningún query nuevo: es `profiles.created_at`, ya
  presente en cualquier fetch del perfil propio.

## Chequeo de agnosticismo de categoría

Nada de esto sabe qué es un tatuaje. `collections` es "un nombre puesto por
una persona sobre una lista de cosas que guardó"; `collection_items` es "esto
está en esa lista". Ni una columna, ni un enum, ni un nombre de función
menciona estilo, categoría ni estudio. El test de aceptación de
`system-architecture.md` §9 sigue pasando: agregar fotografía no toca ninguna
de las dos tablas.

## Lo que NO está

- **Renombrar una colección.** Señalado por UX, fuera de esta ADR (§4).
- **Reordenar colecciones a mano.** Se listan por `created_at desc`; no se
  pidió un orden manual y agregarlo es una columna `sort_order` el día que se
  pida, no antes.
- **Colecciones compartidas o públicas.** Es guardado privado con una etiqueta
  encima, no un tablero para mostrar. Si el día de mañana alguien quiere
  compartir una colección, es otra decisión — cambia el modelo de RLS entero.
- **Un límite a cuántas colecciones se pueden crear.** No hay ningún límite
  artificial en MESH (innegociable 3); si hace falta un tope técnico por abuso,
  es una cuota del lado del servidor como las que ya existen para proyectos y
  subidas, no una regla de producto.

## Consecuencias

- **Una tabla más, una FK más, un archivo de políticas más.** Es el costo real
  y es chico: dos tablas, ninguna con lógica de negocio propia más allá de "es
  mío" y "cascadea para el lado correcto".
- **La pantalla de guardados deja de ser una sola grilla.** Gana una lista de
  colecciones arriba, con "Todo" siempre primera y sin fila propia en la base.
- **Se le dio la razón a ADR-016 en el momento en que se escribió.** Con
  quince artistas curados, una lista alcanzaba — la frase no estaba mal
  cuando se escribió. Lo que cambió es lo que MESH decidió pedirle a la
  pantalla de Guardados, no el tamaño del catálogo.

## Referencias

- [ADR-016](ADR-016-saved-items.md) — la decisión que esto enmienda
- [ADR-017](ADR-017-saved-ranking.md) — el precedente de enmendar con el costo
  escrito, un día después
- [ADR-018](ADR-018-availability.md), [ADR-019](ADR-019-reviews.md) — de donde
  sale "servicios completados" y por qué su agregado no necesita cruzar RLS
- `supabase/tests/48_saved_items.sql` — el cascade de `saved_items`, que esta
  ADR extiende un salto más
- `supabase/tests/62_collections.sql` (a crear) — el acceso cruzado, como test
