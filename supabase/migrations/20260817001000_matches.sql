-- matches: el resultado del matching, guardado.
--
-- El matching corre en el cliente (packages/domain) y es determinístico. Esto
-- no es un caché de performance: es el registro auditable de qué le dijimos a
-- quién y por qué. "¿Por qué dijimos eso?" tiene que ser una pregunta
-- contestable meses después, y para eso hacen falta los componentes, las
-- razones y las dos versiones de algoritmo.

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null
    references public.professionals(id) on delete cascade,
  -- NULL = match por gusto, sin proyecto. Los dos caminos conviven.
  project_id uuid references public.projects(id) on delete cascade,
  score numeric(5, 4) not null check (score >= 0 and score <= 1),
  band public.match_band not null,
  -- {componente: aporte}. Solo los componentes que efectivamente participaron:
  -- los omitidos se renormalizan, no puntúan cero. Ver docs/product/matching.md §4.
  components jsonb not null default '{}'::jsonb,
  -- [{component, template_key, terms, contribution}]. Ver la restricción de abajo.
  reasons jsonb not null default '[]'::jsonb,
  matching_version text not null,
  taste_version text not null,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.matches is
  'Matches computados. Registro auditable: componentes, razones y versiones.';

-- Un match por (usuario, profesional, proyecto). `project_id` es nullable y en
-- Postgres NULL nunca es igual a NULL, así que un UNIQUE común dejaría entrar
-- infinitos matches sin proyecto.
--
-- La coalescencia vive en una COLUMNA GENERADA y no en el índice, y eso no es
-- cosmético: un índice único sobre una expresión no sirve como destino de
-- `ON CONFLICT` desde PostgREST, que solo sabe nombrar columnas. Con el índice
-- sobre la expresión, el upsert del cliente falla con 42P10 — lo encontró el
-- test de integración, no el de SQL, porque desde adentro de Postgres el índice
-- está perfecto.
alter table public.matches
  add column project_key uuid not null
  generated always as (
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) stored;

comment on column public.matches.project_key is
  'project_id con los NULL coalescidos. Existe para poder usarla en ON CONFLICT.';

create unique index matches_identity_idx
  on public.matches (user_id, professional_id, project_key);

-- Consulta detrás del índice: mi lista de matches, mejor primero.
create index matches_user_score_idx on public.matches (user_id, score desc);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- Una razón solo se puede mostrar si el término que describe efectivamente
-- aportó al puntaje. Es el innegociable #2 del CLAUDE.md, y es demasiado
-- importante para vivir solamente en TypeScript: una razón inventada es una
-- afirmación falsa sobre por qué le recomendamos a alguien una persona.
--
-- IMMUTABLE y sin acceso a tablas: solo mira sus argumentos, así que puede
-- usarse dentro de un CHECK.
create or replace function public.match_reasons_are_grounded(
  p_components jsonb,
  p_reasons jsonb
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select jsonb_typeof(p_components) = 'object'
     and jsonb_typeof(p_reasons) = 'array'
     and not exists (
       select 1
       from jsonb_array_elements(p_reasons) as reason
       where not (
         jsonb_typeof(reason) = 'object'
         and reason ->> 'component' is not null
         and case
               when jsonb_typeof(p_components -> (reason ->> 'component')) = 'number'
                 then (p_components -> (reason ->> 'component'))::numeric > 0
               else false
             end
       )
     );
$$;

comment on function public.match_reasons_are_grounded is
  'Toda razón tiene que nombrar un componente con aporte > 0. Ver CLAUDE.md, innegociable #2.';

alter table public.matches
  add constraint matches_reasons_are_grounded
  check (public.match_reasons_are_grounded(components, reasons));

-- Como mucho 3 razones. Más de tres deja de ser una explicación y pasa a ser
-- una justificación.
alter table public.matches
  add constraint matches_reasons_capped
  check (jsonb_array_length(reasons) <= 3);

alter table public.matches enable row level security;
alter table public.matches force row level security;

revoke all on public.matches from anon, authenticated;
grant select, insert, update, delete on public.matches to authenticated;

create policy matches_select_own on public.matches
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy matches_insert_own on public.matches
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy matches_update_own on public.matches
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy matches_delete_own on public.matches
  for delete to authenticated
  using (user_id = (select auth.uid()));
