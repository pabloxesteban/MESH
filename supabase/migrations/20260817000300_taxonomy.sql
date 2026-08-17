-- Taxonomía: categorías, estilos y ubicaciones.
--
-- Datos de referencia. Se cargan desde supabase/seed.sql y son de solo lectura
-- para cualquier cliente: no hay grant de insert/update/delete para
-- `authenticated`, así que tampoco hay políticas para esos verbos. Escribe el
-- service role, y nadie más.
--
-- Categorías y estilos son TABLAS, no enums, para que agregar una categoría no
-- requiera migración. Ver docs/architecture/data-model.md §1.

-- --- categories --------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique,
  -- Clave de i18n, no un string visible: la taxonomía no puede tener forma de
  -- un solo idioma dentro de la base.
  name_key text not null check (name_key <> ''),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.categories is
  'Categorías de profesional. V1 tiene una fila: tattoo.';

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.categories force row level security;

revoke all on public.categories from anon, authenticated;
grant select on public.categories to authenticated;

-- Sin grant para `anon`: no existe camino de lectura sin autenticar. La sesión
-- anónima de Supabase es una sesión autenticada. Ver ADR-002.
create policy categories_select_active on public.categories
  for select to authenticated
  using (is_active);

-- --- styles ------------------------------------------------------------------

create table public.styles (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT: borrar una categoría por debajo de vectores de gusto vivos tiene
  -- que ser imposible por accidente.
  category_id uuid not null references public.categories(id) on delete restrict,
  slug extensions.citext not null,
  name_key text not null check (name_key <> ''),
  description_key text not null check (description_key <> ''),
  -- Términos alternativos que los artistas usan para el mismo estilo. Permiten
  -- fusionar dos estilos más adelante sin migración de datos.
  aliases text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

comment on table public.styles is
  'Vocabulario de estilos por categoría. Los slugs son estables y nunca se traducen.';

create trigger styles_set_updated_at
  before update on public.styles
  for each row execute function public.set_updated_at();

alter table public.styles enable row level security;
alter table public.styles force row level security;

revoke all on public.styles from anon, authenticated;
grant select on public.styles to authenticated;

create policy styles_select_active on public.styles
  for select to authenticated
  using (is_active);

-- --- locations ---------------------------------------------------------------

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  admin_area text,
  city text not null check (city <> ''),
  slug extensions.citext not null unique,
  -- Agrupa CABA con el Gran Buenos Aires para el componente de ubicación del
  -- matching: dos barrios distintos de la misma área metropolitana no deberían
  -- puntuar como ciudades distintas. Ver docs/product/matching.md §4.
  metro_key text not null check (metro_key <> ''),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.locations.metro_key is
  'Área metropolitana. Igual metro_key = misma ciudad a los fines del matching.';

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

create index locations_metro_key_idx on public.locations (metro_key);

alter table public.locations enable row level security;
alter table public.locations force row level security;

revoke all on public.locations from anon, authenticated;
grant select on public.locations to authenticated;

create policy locations_select_all on public.locations
  for select to authenticated
  using (true);
