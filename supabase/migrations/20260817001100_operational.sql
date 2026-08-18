-- Tablas operacionales: analytics y auditoría.
--
-- Las dos son de escritura, no de lectura, para el cliente. Y difieren en algo
-- importante: analytics lo escribe el cliente y no lo puede leer; auditoría no
-- la toca el cliente en absoluto.

-- --- analytics_events --------------------------------------------------------

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  -- CASCADE, no SET NULL. Es la promesa de privacidad de
  -- docs/product/metrics.md §5.6: borrar la cuenta borra sus eventos.
  --
  -- Conservarlos desasociados serviría para responder "¿cuánta gente completó
  -- el onboarding?" después de que alguien se fue, y esa métrica no vale
  -- romper lo que le dijimos. Los reportes se calculan sobre quienes están.
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null,
  name text not null check (name ~ '^[a-z][a-z0-9_]{2,63}$'),
  props jsonb not null default '{}'::jsonb
    check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 4096),
  occurred_at timestamptz not null default now(),
  app_version text check (app_version is null or length(app_version) <= 32),
  platform text check (platform in ('ios', 'android', 'web'))
);

comment on table public.analytics_events is
  'Eventos de producto. El cliente inserta y no puede leer. Reglas de props en docs/product/metrics.md §5.';

comment on column public.analytics_events.props is
  'Sin texto libre de la persona, sin ids de contacto, sin contenido de mensajes. Ver metrics.md §5.';

-- Consulta detrás del índice: los reportes, siempre por ventana de tiempo.
create index analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at);

alter table public.analytics_events enable row level security;
alter table public.analytics_events force row level security;

revoke all on public.analytics_events from anon, authenticated;
grant insert on public.analytics_events to authenticated;

-- Sin política de SELECT y sin grant de select: el cliente escribe a ciegas.
-- Un cliente que pudiera leer analytics podría reconstruir el comportamiento de
-- otras personas a partir de una tabla que nadie piensa como sensible.
--
-- El opt-out (`profiles.analytics_opt_in`) se respeta en el cliente, que
-- directamente no emite. Chequearlo acá obligaría a que esta política leyera
-- `profiles`, y una política que hace un join por cada insert de analytics es
-- un impuesto sobre el camino más caliente que tenemos.
create policy analytics_events_insert_own on public.analytics_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- --- audit_events ------------------------------------------------------------

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null check (action <> ''),
  entity_type text not null check (entity_type <> ''),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);

comment on table public.audit_events is
  'Rastro de auditoría: cargas de contenido, publicar/despublicar, retiro de artista, borrado de cuenta. Solo service role.';

-- `actor_user_id` a propósito SIN clave foránea: un registro de auditoría tiene
-- que sobrevivir al borrado de la cuenta de quien actuó. Un CASCADE haría que
-- borrar la cuenta borrara la evidencia de haberla borrado.

create index audit_events_entity_idx
  on public.audit_events (entity_type, entity_id);

create index audit_events_occurred_at_idx
  on public.audit_events (occurred_at);

alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

revoke all on public.audit_events from anon, authenticated;

-- CERO políticas, a propósito. Es la única tabla del esquema sin ninguna, y por
-- eso el test genérico de RLS acepta como alternativa "sin grants a anon ni a
-- authenticated": una tabla que ningún rol de cliente puede tocar es
-- inalcanzable, tenga las políticas que tenga. Escribe el service role, que
-- pasa por encima de RLS.
