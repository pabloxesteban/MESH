-- projects: la idea que alguien quiere hacer realidad.
--
-- El brief del proyecto es opcional en el producto: el matching funciona solo
-- con el gusto. Cuando existe, aporta ubicación, presupuesto y urgencia, que
-- son las tres cosas que el comportamiento no puede inferir.
--
-- Regla que atraviesa toda esta migración: solo se guarda lo que la persona
-- efectivamente escribió. Nada de campos "estimados", nada de defaults que
-- afirmen algo por ella.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  title text not null check (length(title) between 1 and 120),
  description text check (description is null or length(description) <= 2000),
  location_id uuid references public.locations(id) on delete set null,
  budget_min_cents integer check (budget_min_cents >= 0),
  budget_max_cents integer check (budget_max_cents >= 0),
  budget_currency char(3) check (budget_currency ~ '^[A-Z]{3}$'),
  timing public.project_timing,
  size_note text check (size_note is null or length(size_note) <= 280),
  status public.project_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint projects_budget_complete check (
    (budget_min_cents is null
      and budget_max_cents is null
      and budget_currency is null)
    or (budget_min_cents is not null
      and budget_max_cents is not null
      and budget_currency is not null
      and budget_min_cents <= budget_max_cents)
  )
);

comment on table public.projects is
  'Brief opcional. Solo contiene lo que la persona escribió — nada estimado.';

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Consulta detrás del índice: "mis proyectos activos", en la pestaña de
-- proyectos y al armar la lista de matches.
create index projects_user_status_idx on public.projects (user_id, status);

alter table public.projects enable row level security;
alter table public.projects force row level security;

revoke all on public.projects from anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;

create policy projects_select_own on public.projects
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy projects_insert_own on public.projects
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy projects_update_own on public.projects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy projects_delete_own on public.projects
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- --- project_styles ----------------------------------------------------------

create table public.project_styles (
  project_id uuid not null references public.projects(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete restrict,
  weight numeric(4, 3) not null check (weight > 0 and weight <= 1),
  primary key (project_id, style_id)
);

comment on table public.project_styles is
  'Estilos que la persona eligió para el proyecto. Pisan al gusto en el matching por proyecto.';

alter table public.project_styles enable row level security;
alter table public.project_styles force row level security;

revoke all on public.project_styles from anon, authenticated;
grant select, insert, update, delete on public.project_styles to authenticated;

-- La propiedad de una tabla de unión es la del padre. El predicado va por
-- EXISTS contra `projects`, nunca contra algo que mande el cliente.
create policy project_styles_select_own on public.project_styles
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_styles.project_id
        and p.user_id = (select auth.uid())
    )
  );

create policy project_styles_insert_own on public.project_styles
  for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_styles.project_id
        and p.user_id = (select auth.uid())
    )
  );

create policy project_styles_update_own on public.project_styles
  for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_styles.project_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_styles.project_id
        and p.user_id = (select auth.uid())
    )
  );

create policy project_styles_delete_own on public.project_styles
  for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_styles.project_id
        and p.user_id = (select auth.uid())
    )
  );

-- --- project_references ------------------------------------------------------

create table public.project_references (
  project_id uuid not null references public.projects(id) on delete cascade,
  -- RESTRICT: si la imagen se va, la referencia no puede quedar apuntando al
  -- vacío. Se borra la referencia primero.
  media_id uuid not null references public.media_assets(id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (project_id, media_id)
);

comment on table public.project_references is
  'Imágenes de referencia del proyecto. Viven en el bucket privado `references`.';

create index project_references_media_idx
  on public.project_references (media_id);

alter table public.project_references enable row level security;
alter table public.project_references force row level security;

revoke all on public.project_references from anon, authenticated;
grant select, insert, delete on public.project_references to authenticated;

-- Sin UPDATE: cambiar el orden es borrar y volver a insertar el par. Una tabla
-- de unión de dos columnas más un sort_order no gana nada con un update.

create policy project_references_select_own on public.project_references
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_references.project_id
        and p.user_id = (select auth.uid())
    )
  );

-- Dos condiciones, no una: el proyecto tiene que ser mío Y la media también.
-- Con solo la primera, alguien podría adjuntar a su proyecto el id de una
-- imagen ajena y leer sus metadatos por el join.
create policy project_references_insert_own on public.project_references
  for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_references.project_id
        and p.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.media_assets m
      where m.id = project_references.media_id
        and m.owner_user_id = (select auth.uid())
    )
  );

create policy project_references_delete_own on public.project_references
  for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_references.project_id
        and p.user_id = (select auth.uid())
    )
  );
