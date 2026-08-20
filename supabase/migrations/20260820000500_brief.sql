-- El brief: lo que alguien quiere tatuarse, y lo que un artista le responde.
--
-- Ver ADR-020.
--
-- ## Las tres decisiones que definen la forma
--
-- 1. **Los rasgos son taxonomía, no columnas.** Zona del cuerpo, tamaño y
--    paleta viven en `traits`, con la misma forma que `styles`: colgados de una
--    categoría. `projects.body_area` habría metido tatuajes adentro de una
--    entidad central —justo lo que prohíbe el innegociable 7— y habría que
--    sacarlo a mano el día que entre otro rubro. Así, otro rubro son filas
--    nuevas con otras dimensiones.
--
-- 2. **Un artista no manda "me interesa": manda una propuesta.** Con
--    `verdict = 'interest'`, el rango de precio y las sesiones son
--    obligatorios. Una lista de cinco nombres sin precio obliga a las mismas
--    cinco conversaciones que había antes de MESH.
--
-- 3. **Una propuesta sigue sin ser un mensaje.** No abre chat, no lleva texto
--    libre hacia nadie más que la dueña de la búsqueda, y el chat lo sigue
--    abriendo ella. Es la regla de ADR-012 y ADR-014, sostenida sobre una
--    superficie nueva que la habría roto sin pensarlo.

-- --- los rasgos ---------------------------------------------------------------

/**
 * Las dimensiones de un brief.
 *
 * Un enum y no texto libre: cada dimensión tiene una pantalla que la muestra y
 * un vocabulario que la llena, así que agregar una es una decisión de producto,
 * no un `insert`.
 *
 * Los tres valores de hoy son de tatuajes, pero los NOMBRES no lo son: otro
 * rubro puede usar `size` y `palette` con otros slugs, y `body_area` puede no
 * aplicarle. Nada acá obliga a que una categoría tenga las tres.
 */
create type public.trait_dimension as enum ('body_area', 'size', 'palette');

comment on type public.trait_dimension is
  'Qué describe un rasgo. Una categoría usa las dimensiones que le sirven. Ver ADR-020.';

create table public.traits (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT, igual que `styles`: borrar una categoría por debajo de briefs
  -- vivos tiene que ser imposible por accidente.
  category_id uuid not null references public.categories (id) on delete restrict,
  dimension public.trait_dimension not null,
  slug extensions.citext not null,
  name_key text not null check (name_key <> ''),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  -- El slug es único dentro de la categoría, no dentro de la dimensión: dos
  -- dimensiones de la misma categoría no pueden compartir slug, porque la
  -- pantalla los muestra juntos y "chico" tendría que significar una sola cosa.
  unique (category_id, slug)
);

comment on table public.traits is
  'Vocabulario de rasgos de un brief, por categoría. Misma forma que `styles`. Ver ADR-020.';

-- Consulta detrás del índice: la pantalla del brief, que trae todos los rasgos
-- activos de una categoría agrupados por dimensión.
create index traits_category_idx
  on public.traits (category_id, dimension, sort_order)
  where is_active;

alter table public.traits enable row level security;
alter table public.traits force row level security;

revoke all on public.traits from anon, authenticated;
grant select on public.traits to authenticated;

-- Lectura pública de lo activo, igual que `styles` y `categories`: es
-- vocabulario, no datos de nadie.
create policy traits_select_active on public.traits
  for select to authenticated
  using (is_active);

-- --- los rasgos de un brief ---------------------------------------------------

create table public.project_traits (
  project_id uuid not null references public.projects (id) on delete cascade,
  trait_id uuid not null references public.traits (id) on delete restrict,
  primary key (project_id, trait_id)
);

comment on table public.project_traits is
  'Los rasgos que describen una búsqueda. Ver ADR-020.';

alter table public.project_traits enable row level security;
alter table public.project_traits force row level security;

revoke all on public.project_traits from anon, authenticated;
grant select, insert, delete on public.project_traits to authenticated;

-- Sin UPDATE: cambiar un rasgo es sacar una fila y poner otra. Un update sobre
-- `trait_id` sería mover el rasgo de una dimensión a otra sin que nada lo mire.

-- Los rasgos de una búsqueda propia. La búsqueda abierta la lee el artista por
-- el feed, que es una función `security definer` y no pasa por acá.
create policy project_traits_select_own on public.project_traits
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_traits.project_id
        and p.user_id = (select auth.uid())
    )
  );

create policy project_traits_insert_own on public.project_traits
  for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_traits.project_id
        and p.user_id = (select auth.uid())
    )
  );

create policy project_traits_delete_own on public.project_traits
  for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_traits.project_id
        and p.user_id = (select auth.uid())
    )
  );

-- --- la propuesta -------------------------------------------------------------

alter table public.project_interests
  add column price_min_cents integer check (price_min_cents >= 0),
  add column price_max_cents integer check (price_max_cents >= 0),
  add column price_currency char(3) check (price_currency ~ '^[A-Z]{3}$'),
  -- Cuántas sesiones. Una manga no se hace en una tarde, y saberlo cambia la
  -- decisión tanto como el precio.
  add column sessions smallint check (sessions between 1 and 20),
  -- Para las condiciones: "estimado, lo confirmo al verte". Corta a propósito:
  -- esto no es el chat.
  add column note text check (note is null or length(note) between 1 and 500);

/**
 * Un interés lleva propuesta; un paso no lleva nada.
 *
 * Sin esto entran las dos formas rotas: un interés sin precio —que es
 * exactamente lo que este ADR vino a sacar— y un `pass` con un precio adentro,
 * que nadie va a ver nunca y que quedaría en la base contando una historia que
 * no pasó.
 *
 * La nota es opcional cuando hay propuesta, y prohibida cuando no la hay: un
 * `pass` no le llega a nadie, así que una nota ahí es texto que nadie va a leer
 * nunca, guardado sobre una persona.
 */
alter table public.project_interests
  add constraint project_interests_proposal_shape check (
    (
      verdict = 'interest'
      and price_min_cents is not null
      and price_max_cents is not null
      and price_currency is not null
      and price_min_cents <= price_max_cents
      and sessions is not null
    )
    or (
      verdict = 'pass'
      and price_min_cents is null
      and price_max_cents is null
      and price_currency is null
      and sessions is null
      and note is null
    )
  );

comment on column public.project_interests.price_min_cents is
  'Rango para ESTE trabajo, escrito por el artista. Obligatorio con verdict = interest. Ver ADR-020.';

-- --- lo que ve la persona -----------------------------------------------------

/**
 * `get_search_interests`, ahora con la propuesta adentro.
 *
 * Se reemplaza en vez de agregar una función nueva: la persona no razona por
 * proyecto sino por "quién me respondió", y esta ya era esa lista — con id de
 * búsqueda opcional para cuando sí quiera mirar una sola. Una segunda función
 * que devolviera lo mismo más tres columnas habría quedado como la que nadie
 * usa.
 *
 * `drop` antes del `create`: Postgres no deja cambiar el tipo de retorno de una
 * función existente.
 *
 * Sigue sin devolver un `pass`, y ahora tampoco devuelve una propuesta sin
 * precio, porque esa fila ya no puede existir.
 */
drop function public.get_search_interests(uuid);

create function public.get_search_interests(p_project_id uuid default null)
returns table (
  interest_id uuid,
  project_id uuid,
  project_title text,
  professional_id uuid,
  professional_slug text,
  professional_display_name text,
  created_at timestamptz,
  price_min_cents integer,
  price_max_cents integer,
  price_currency char(3),
  sessions smallint,
  note text,
  -- Una obra del artista, para poder decidir mirando y no leyendo. La destacada
  -- si la hay, y si no la más nueva.
  sample_media_path text
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    pi.id,
    p.id,
    p.title,
    pro.id,
    pro.slug::text,
    pro.display_name,
    pi.created_at,
    pi.price_min_cents,
    pi.price_max_cents,
    pi.price_currency,
    pi.sessions,
    pi.note,
    (
      select ma.path
      from public.portfolio_items item
      join public.media_assets ma on ma.id = item.media_id
      where item.professional_id = pro.id
      order by item.is_featured desc, item.created_at desc
      limit 1
    )
  from public.project_interests pi
  join public.professionals pro on pro.id = pi.professional_id
  join public.projects p on p.id = pi.project_id
  where (p_project_id is null or pi.project_id = p_project_id)
    -- Los dos predicados son redundantes con las políticas, y están escritos
    -- igual: si algún día alguien afloja una, esta consulta no se abre sola.
    and pi.verdict = 'interest'
    and p.user_id = (select auth.uid())
  order by pi.created_at desc;
$$;

revoke all on function public.get_search_interests(uuid) from public, anon;
grant execute on function public.get_search_interests(uuid) to authenticated;

comment on function public.get_search_interests is
  'Las propuestas que recibieron las búsquedas propias. Sin `pass`, y sin identidades de más. Ver ADR-020.';

-- --- los rasgos de una búsqueda abierta, para el artista ----------------------

/**
 * Los rasgos de una búsqueda **abierta**, para poder mostrarlos en el mazo.
 *
 * Devuelve dimensión y slug, que son vocabulario público — lo mismo que ya
 * devuelve `styles`. No dice de quién es la búsqueda.
 */
create or replace function public.get_open_search_traits(p_project_id uuid)
returns table (dimension public.trait_dimension, slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.dimension, t.slug::text
  from public.project_traits pt
  join public.traits t on t.id = pt.trait_id
  join public.projects p on p.id = pt.project_id
  where pt.project_id = p_project_id
    -- Solo de una búsqueda abierta: los rasgos de una privada son tan privados
    -- como sus fotos.
    and p.is_open_to_professionals
    and t.is_active
  order by t.dimension, t.sort_order;
$$;

revoke all on function public.get_open_search_traits(uuid) from public, anon;
grant execute on function public.get_open_search_traits(uuid) to authenticated;

comment on function public.get_open_search_traits is
  'Los rasgos de una búsqueda abierta. Nunca de una privada. Ver ADR-020.';

-- --- el vocabulario ------------------------------------------------------------
--
-- Las filas NO van acá: los rasgos son taxonomía, y la taxonomía de MESH vive
-- en `packages/domain/src/taxonomy` y se vuelca a `supabase/seed.sql` con
-- `npm run db:reference`. Es el mismo camino que ya recorren `categories`,
-- `styles` y `locations`, y existe por un motivo: el motor y el validador
-- necesitan el vocabulario sin base de datos, así que hay dos copias por
-- necesidad — una generada de la otra, con `--check` en CI, no se separan.
--
-- Cargarlas desde esta migración además no funcionaría: las categorías se
-- insertan DESPUÉS de migrar, así que un `where c.slug = 'tattoo'` acá no
-- encuentra nada.
