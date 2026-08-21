-- Colecciones: una etiqueta sobre lo ya guardado, nunca un lugar nuevo.
--
-- Ver ADR-030.
--
-- ## Las tres decisiones que definen la forma
--
-- 1. **Guardar y agrupar son dos hechos distintos.** `saved_items` (ADR-016)
--    sigue siendo el único lugar donde "guardado" vive. `collections` no
--    guarda nada — nombra una lista; `collection_items` no guarda nada — dice
--    que un `saved_item` ya existente está en esa lista. Borrar una colección
--    borra la etiqueta, nunca la obra.
--
-- 2. **Pertenencia múltiple, insert/delete, nunca un booleano.** Mismo
--    principio que ADR-016 ya fijó: agregar a una colección es una fila, sacar
--    es borrarla. No hay `in_collection boolean` que togglear.
--
-- 3. **La propiedad de `collection_items` se prueba en dos saltos, y el INSERT
--    exige los dos.** La fila no tiene `user_id` propio: la colección
--    referenciada tiene que ser propia, Y el `saved_item` referenciado tiene
--    que ser propio. Con una sola condición, cualquiera que se entere de un
--    `saved_item_id` ajeno podría colgarlo de su propia colección, o escribir
--    en la colección de otro.
--
-- ## Lo que NO está acá (ver ADR-030 "Lo que NO está")
--
-- Sin UPDATE en `collections` — el nombre se pone una vez. Sin
-- `unique(user_id, name)` — decisión deliberada, no un olvido. Sin límite a
-- cuántas colecciones se crean. Sin "Todo" como fila: es `fetchSaved()` sin
-- filtro, no existe acá.

-- --- collections ----------------------------------------------------------

create table public.collections (
  id uuid primary key default gen_random_uuid(),

  -- Contra `profiles`, no contra `auth.users` como hace `saved_items` —
  -- `saved_items` es la excepción histórica del esquema, no la convención.
  user_id uuid not null references public.profiles (id) on delete cascade,

  name text not null check (length(name) between 1 and 40),

  created_at timestamptz not null default now()
  -- Sin updated_at: nada la muta después de creada en V1. Sin política de
  -- UPDATE más abajo, a propósito — ver ADR-030 §4.
);

comment on table public.collections is
  'Una colección: un nombre puesto por una persona sobre una lista de lo que guardó. No guarda nada por sí sola. Ver ADR-030.';

-- Consulta detrás del índice: "mis colecciones", más nueva primero.
create index collections_user_idx on public.collections (user_id, created_at desc);

alter table public.collections enable row level security;
alter table public.collections force row level security;

revoke all on public.collections from anon, authenticated;
grant select, insert, delete on public.collections to authenticated;

create policy collections_select_own on public.collections
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy collections_insert_own on public.collections
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy collections_delete_own on public.collections
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Sin política de UPDATE: no hay verbo UPDATE que cubrir en V1 (ADR-030 §4).
-- El día que se pida renombrar, es una política angosta agregada a una tabla
-- que ya existe, no un cambio de forma.

-- --- collection_items -------------------------------------------------------

create table public.collection_items (
  collection_id uuid not null
    references public.collections (id) on delete cascade,
  -- Cascade en la dirección contraria a `collections`: si se desguarda la
  -- obra (o `saved_items` cascadea porque el artista borró la pieza), la
  -- pertenencia a cualquier colección que la tuviera se va con ella — una
  -- etiqueta sobre algo que ya no existe no es una etiqueta de nada.
  saved_item_id uuid not null
    references public.saved_items (id) on delete cascade,

  created_at timestamptz not null default now(),

  -- Agregar dos veces la misma obra a la misma colección es agregarla una vez.
  primary key (collection_id, saved_item_id)
);

comment on table public.collection_items is
  'Pertenencia de un saved_item a una colección. No es un hecho de guardado — ese vive en saved_items. Ver ADR-030.';

-- Consulta detrás del índice: la grilla de una colección, más nuevo primero.
create index collection_items_collection_idx
  on public.collection_items (collection_id, created_at desc);

-- Consulta detrás del índice: "¿en qué colecciones está esta obra?", para
-- pintar los checks del sheet de "agregar a colección".
create index collection_items_saved_item_idx
  on public.collection_items (saved_item_id);

alter table public.collection_items enable row level security;
alter table public.collection_items force row level security;

revoke all on public.collection_items from anon, authenticated;
grant select, insert, delete on public.collection_items to authenticated;

create policy collection_items_select_own on public.collection_items
  for select to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id
        and c.user_id = (select auth.uid())
    )
  );

-- Las DOS condiciones hacen falta. Sin la segunda, cualquiera que se entere
-- de un `saved_item_id` ajeno (mirando la red, por ejemplo) podría colgarlo de
-- una colección propia — filtraría que esa persona guardó esa obra. Sin la
-- primera, podría escribir en la colección de otro.
create policy collection_items_insert_own on public.collection_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id
        and c.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.saved_items si
      where si.id = collection_items.saved_item_id
        and si.user_id = (select auth.uid())
    )
  );

create policy collection_items_delete_own on public.collection_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id
        and c.user_id = (select auth.uid())
    )
  );

-- --- listar colecciones con conteo y portada, en un solo round trip --------

/**
 * Las colecciones de quien llama, con cuántos ítems tiene cada una y hasta
 * cuatro miniaturas de portada (las últimas agregadas).
 *
 * `SECURITY INVOKER`: no cruza ningún límite de confianza — cada tabla del
 * join (`collections`, `collection_items`, `saved_items`, `portfolio_items`,
 * `media_assets`) ya es legible para quien llama sobre sus propias filas, así
 * que las políticas existentes alcanzan solas. Existe para no obligar al
 * cliente a armar a mano el join de colección → pertenencia → obra → media,
 * agregado por colección — el caso que `system-architecture.md` §4/§6 pide
 * resolver con un RPC.
 */
create or replace function public.get_my_collections()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  item_count integer,
  cover_media_paths text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.name,
    c.created_at,
    coalesce(counts.item_count, 0)::int,
    coalesce(covers.paths, '{}'::text[])
  from public.collections c
  left join lateral (
    select count(*) as item_count
    from public.collection_items ci
    where ci.collection_id = c.id
  ) counts on true
  left join lateral (
    select array_agg(m.path order by recent.created_at desc) as paths
    from (
      select ci.saved_item_id, ci.created_at
      from public.collection_items ci
      where ci.collection_id = c.id
      order by ci.created_at desc
      limit 4
    ) recent
    join public.saved_items si on si.id = recent.saved_item_id
    join public.portfolio_items pi on pi.id = si.portfolio_item_id
    join public.media_assets m on m.id = pi.media_id
  ) covers on true
  where c.user_id = (select auth.uid())
  order by c.created_at desc;
$$;

revoke all on function public.get_my_collections() from public, anon;
grant execute on function public.get_my_collections() to authenticated;

comment on function public.get_my_collections is
  'Mis colecciones con conteo y hasta 4 miniaturas de portada, en un round trip. security invoker: RLS ya alcanza. Ver ADR-030.';

-- --- servicios completados, para el header del artista en Estudio ---------

/**
 * Cuántos turnos propios (como profesional) ya terminaron y no fueron
 * cancelados.
 *
 * `SECURITY INVOKER`: no hace falta cruzar RLS — `appointments_select_participants`
 * (ADR-018) ya deja al dueño del perfil leer sus propios turnos completos.
 * Existe para no repetir en el cliente "buscá mi professional_id y comparalo
 * contra `now()`", y para calcular "ya terminó" con la hora del servidor y no
 * con la del teléfono. Devuelve 0 si quien llama no tiene perfil de artista,
 * en vez de fallar.
 */
create or replace function public.get_completed_appointments_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::int
  from public.appointments a
  join public.professionals p on p.id = a.professional_id
  where p.owner_user_id = (select auth.uid())
    and a.status <> 'cancelled'
    and a.ends_at < now();
$$;

revoke all on function public.get_completed_appointments_count() from public, anon;
grant execute on function public.get_completed_appointments_count() to authenticated;

comment on function public.get_completed_appointments_count is
  'Cuántos turnos propios (como profesional) ya pasaron sin cancelarse. 0 si quien llama no es artista. Ver ADR-030.';

-- --- profiles.city_location_id: nada que migrar --------------------------
--
-- "Vivís en", con granularidad de barrio, reutiliza una columna que ya
-- existe desde `20260817000200_profiles.sql` y ya tiene su FK explícita
-- (`profiles_city_location_id_fkey ... on delete set null`, agregada en
-- `20260817000400_media.sql`). `profiles_update_own` ya cubre escribirla:
-- esa política no restringe por columna, así que el cliente ya puede setear
-- `city_location_id` hoy. No hace falta índice: la única lectura es "mi
-- propio perfil por id", que ya resuelve por primary key — no hay ninguna
-- consulta conocida que filtre `profiles` por `city_location_id`, y un índice
-- sin una consulta detrás no se agrega (CLAUDE.md, anti-patrones). Queda
-- documentado acá y no en una migración porque no hay nada que migrar.
