-- media_assets: referencias y metadatos. Los bytes viven en Storage.
--
-- Una fila describe un archivo; nunca lo contiene. Postgres no es un CDN y una
-- columna bytea de 4MB por obra convierte cada backup en un problema.
--
-- Dos clases de fila, distinguidas por `owner_user_id`:
--   NULL          → media curada, cargada por el seeder (catálogo).
--   uuid de user  → subida de una persona (referencias de proyecto, avatar).
--
-- La política de SELECT de acá cubre solamente la propia. La lectura del
-- catálogo curado se agrega en la migración de portfolio, que es donde recién
-- existe la tabla que define qué está publicado.

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  -- El bucket se crea en la migración de storage. La restricción está acá para
  -- que una fila nunca apunte a un bucket que no existe.
  bucket text not null check (bucket in ('portfolio', 'references', 'avatars')),
  path text not null check (path <> '' and path !~ '^/'),
  -- Sin SVG: un SVG es un documento ejecutable servido desde nuestro dominio.
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  ),
  width integer check (width > 0),
  height integer check (height > 0),
  byte_size bigint check (byte_size > 0),
  blurhash text,
  checksum text,
  -- CASCADE, no SET NULL: si alguien borra su cuenta, sus imágenes de
  -- referencia se van con ella. Dejarlas huérfanas con owner NULL las
  -- convertiría en media "curada" legible por cualquiera.
  owner_user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

comment on table public.media_assets is
  'Metadatos de media. Los bytes viven en Storage. Ver docs/architecture/data-model.md §2.';

comment on column public.media_assets.owner_user_id is
  'NULL = media curada del catálogo. No-NULL = subida de esa persona.';

-- Consulta detrás del índice: "mis referencias de proyecto", en la pantalla de
-- proyecto y al borrar la cuenta.
create index media_assets_owner_idx on public.media_assets (owner_user_id)
  where owner_user_id is not null;

alter table public.media_assets enable row level security;
alter table public.media_assets force row level security;

revoke all on public.media_assets from anon, authenticated;
grant select, insert, delete on public.media_assets to authenticated;

-- Sin UPDATE: una fila de media describe un archivo inmutable. Reemplazar una
-- imagen es una fila nueva y un borrado, no una mutación — si el path pudiera
-- cambiar, un checksum registrado dejaría de significar algo.

create policy media_assets_select_own on public.media_assets
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy media_assets_insert_own on public.media_assets
  for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
    -- El cliente solo sube a buckets privados de usuario. El catálogo lo carga
    -- el seeder con service role.
    and bucket in ('references', 'avatars')
  );

create policy media_assets_delete_own on public.media_assets
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

-- --- claves foráneas pendientes de profiles ----------------------------------
--
-- `profiles` se crea antes que `locations` y `media_assets`, así que sus dos
-- referencias quedaron como uuid pelado. Recién acá existen las dos tablas del
-- otro lado.

alter table public.profiles
  add constraint profiles_city_location_id_fkey
  foreign key (city_location_id) references public.locations(id)
  on delete set null;

alter table public.profiles
  add constraint profiles_avatar_media_id_fkey
  foreign key (avatar_media_id) references public.media_assets(id)
  on delete set null;
