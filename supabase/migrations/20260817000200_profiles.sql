-- profiles: una fila por usuario de auth.
--
-- No guarda el email. `auth.users` ya lo tiene, y copiar PII a una tabla que el
-- cliente puede leer es la forma en que se producen las filtraciones.
--
-- Ser profesional NO es una columna de acá: es una fila en `professionals` con
-- `owner_user_id`. Los roles no son excluyentes — alguien puede tatuar y además
-- usar MESH como cliente. Ver docs/decisions/ADR-003-domain-model.md.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (
    display_name is null or length(display_name) between 1 and 80
  ),
  avatar_media_id uuid,
  locale text not null default 'es-AR',
  city_location_id uuid,
  analytics_opt_in boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil de usuario. Sin email: eso vive en auth.users.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil cuando nace el usuario de auth, incluidos los anónimos.
--
-- SECURITY DEFINER porque corre en el contexto de auth y tiene que escribir en
-- public. search_path fijado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

revoke all on public.profiles from anon, authenticated;
grant select, update, delete on public.profiles to authenticated;

-- Sin política de INSERT a propósito: el perfil lo crea el trigger. Un cliente
-- que pudiera insertar perfiles podría crear filas para ids ajenos.

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_delete_own on public.profiles
  for delete to authenticated
  using (id = (select auth.uid()));
