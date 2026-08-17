-- interactions: todo el registro de comportamiento, en una tabla.
--
-- Es ESTADO ACTUAL, no un log. Una fila por (usuario, pieza). Deshacer es un
-- update o un delete, y el vector de gusto es una función pura de estas filas —
-- si fuera un log, "deshacer" tendría que ser un evento compensatorio y el
-- gusto dejaría de ser reproducible.
--
-- No hay tabla `saved_items`: guardar es `is_saved = true`. Dos
-- representaciones del mismo hecho se van a contradecir.

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  portfolio_item_id uuid not null
    references public.portfolio_items(id) on delete cascade,
  verdict public.interaction_verdict not null,
  is_saved boolean not null default false,
  source public.interaction_source not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Idempotencia: reintentar un upsert después de una conexión caída es seguro.
  -- Es la restricción de la que depende la cola offline.
  unique (user_id, portfolio_item_id),

  -- Guardar algo que se pasó no significa nada. Si el estado se contradice,
  -- rechazalo acá y no en TypeScript.
  constraint interactions_saved_implies_like check (
    not (is_saved and verdict = 'pass')
  )
);

comment on table public.interactions is
  'Estado actual por (usuario, pieza). Entrada única del motor de gusto.';

create trigger interactions_set_updated_at
  before update on public.interactions
  for each row execute function public.set_updated_at();

-- Consulta detrás del índice: excluir lo ya visto al armar el feed. El UNIQUE
-- de arriba ya cubre (user_id, portfolio_item_id), así que no se duplica.

-- Consulta detrás del índice: "mis guardados", ordenados por lo más reciente.
create index interactions_user_saved_idx
  on public.interactions (user_id, updated_at desc)
  where is_saved;

-- Consulta detrás del índice: recalcular el gusto lee todas mis interacciones.
create index interactions_user_updated_idx
  on public.interactions (user_id, updated_at desc);

create index interactions_portfolio_item_idx
  on public.interactions (portfolio_item_id);

alter table public.interactions enable row level security;
alter table public.interactions force row level security;

revoke all on public.interactions from anon, authenticated;
grant select, insert, update, delete on public.interactions to authenticated;

create policy interactions_select_own on public.interactions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- El `with check` no es redundante con el `using` de update: sin él, alguien
-- podría mover una fila propia hacia otro user_id.
create policy interactions_insert_own on public.interactions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy interactions_update_own on public.interactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy interactions_delete_own on public.interactions
  for delete to authenticated
  using (user_id = (select auth.uid()));
