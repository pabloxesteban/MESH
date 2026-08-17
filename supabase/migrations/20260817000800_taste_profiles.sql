-- taste_profiles: caché de un valor derivable.
--
-- El vector se calcula en el cliente, en packages/domain, a partir de las
-- interacciones de la propia persona. Se persiste acá por dos razones honestas:
-- continuidad entre dispositivos, y poder responder meses después "¿con qué
-- gusto se generó este match?".
--
-- Que sea derivable importa: si esta tabla se corrompe, se puede reconstruir
-- entera desde `interactions`. Nunca es la fuente de verdad.

create table public.taste_profiles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  -- {style_slug: score}. Slugs, no ids: el vector tiene que poder leerse en un
  -- dump sin un join, y los slugs son estables por contrato.
  vector jsonb not null default '{}'::jsonb
    check (jsonb_typeof(vector) = 'object'),
  aversion jsonb not null default '{}'::jsonb
    check (jsonb_typeof(aversion) = 'object'),
  decisive_count integer not null default 0 check (decisive_count >= 0),
  is_ready boolean not null default false,
  -- Versión del algoritmo que produjo estos números. Sin esto, un vector viejo
  -- y uno nuevo son indistinguibles y el cambio de algoritmo es silencioso.
  algo_version text not null,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

comment on table public.taste_profiles is
  'Caché del vector de gusto. Derivable de interactions; nunca la fuente de verdad.';

comment on column public.taste_profiles.is_ready is
  'Umbral de docs/product/matching.md §5. Falso = todavía no mostramos matches.';

create trigger taste_profiles_set_updated_at
  before update on public.taste_profiles
  for each row execute function public.set_updated_at();

alter table public.taste_profiles enable row level security;
alter table public.taste_profiles force row level security;

revoke all on public.taste_profiles from anon, authenticated;
grant select, insert, update, delete on public.taste_profiles to authenticated;

create policy taste_profiles_select_own on public.taste_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy taste_profiles_insert_own on public.taste_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy taste_profiles_update_own on public.taste_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy taste_profiles_delete_own on public.taste_profiles
  for delete to authenticated
  using (user_id = (select auth.uid()));
