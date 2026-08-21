-- El asistente que ayuda a armar un pedido, y el hilo donde vive.
--
-- Ver ADR-021.
--
-- ## Las tres decisiones que definen este esquema
--
-- 1. **El hilo es de una sola persona.** No hay contraparte. `conversations`
--    tiene dos lados porque hay dos personas; acá hay una sola, y del otro lado
--    hay una función. Modelarlo como una conversación de dos habría abierto la
--    pregunta "¿y si el artista lo lee?", que es exactamente la que ADR-021
--    contesta que no.
--
-- 2. **Los turnos son inmutables, y el hilo se borra entero.** Mismo criterio
--    que `messages`: no se edita lo dicho. Pero acá el DELETE del hilo SÍ es del
--    cliente, y eso es deliberado — alguien que contó qué se quiere tatuar y por
--    qué tiene que poder tirar esa conversación a la basura sin pedir permiso.
--
-- 3. **El turno del asistente lo escribe el servidor, no el cliente.** La
--    política de INSERT solo deja poner turnos con `role = 'person'`. Sin eso,
--    un cliente modificado podría fabricar una respuesta del asistente y después
--    mostrarla como si MESH la hubiera dicho — un precio, una disponibilidad, un
--    "fulano te lo hace". Las reglas 3, 4 y 5 de ADR-021 no valen nada si el
--    cliente puede escribir del lado del bot.

-- --- el rol de un turno --------------------------------------------------------

/**
 * Quién habló.
 *
 * `person` y no `user`: `user` es un rol de Postgres y una palabra reservada en
 * media base de datos. Y el nombre importa — del otro lado no hay un
 * "assistant" genérico, hay una función de MESH con siete reglas encima.
 */
create type public.assistant_role as enum ('person', 'assistant');

comment on type public.assistant_role is
  'Quién escribió un turno del asistente. El cliente solo puede insertar `person`. Ver ADR-021.';

-- --- el hilo -------------------------------------------------------------------

create table public.assistant_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- RESTRICT como en el resto: borrar una categoría por debajo de hilos vivos
  -- tiene que ser imposible por accidente.
  category_id uuid not null references public.categories(id) on delete restrict,
  -- La búsqueda que salió de este hilo, si ya salió. `set null` y no cascade:
  -- borrar la búsqueda no tiene por qué llevarse la conversación, y al revés
  -- tampoco — son dos cosas de la misma persona con vidas distintas.
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Denormalizado por el mismo motivo que en `conversations`: ordenar la lista
  -- sin esto es un scan de turnos por fila. Lo mueve un trigger.
  last_turn_at timestamptz
);

comment on table public.assistant_threads is
  'Una conversación entre una persona y el asistente de pedido. No la lee nadie más. Ver ADR-021.';

create table public.assistant_turns (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null
    references public.assistant_threads(id) on delete cascade,
  role public.assistant_role not null,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

comment on table public.assistant_turns is
  'Un turno del hilo. Inmutable. El del asistente lo escribe el servidor.';

-- La lista de hilos de una persona, más reciente primero.
create index assistant_threads_user_idx
  on public.assistant_threads (user_id, last_turn_at desc nulls last);

-- Los turnos de un hilo, en orden. Es también la consulta que arma el contexto
-- que se le manda al modelo.
create index assistant_turns_thread_idx
  on public.assistant_turns (thread_id, created_at);

-- --- RLS -----------------------------------------------------------------------

alter table public.assistant_threads enable row level security;
alter table public.assistant_threads force row level security;
alter table public.assistant_turns enable row level security;
alter table public.assistant_turns force row level security;

revoke all on public.assistant_threads from anon, authenticated;
revoke all on public.assistant_turns from anon, authenticated;

grant select, insert, delete on public.assistant_threads to authenticated;
grant select, insert on public.assistant_turns to authenticated;

grant select, insert, update, delete on public.assistant_threads to service_role;
grant select, insert, update, delete on public.assistant_turns to service_role;

create policy assistant_threads_select_own on public.assistant_threads
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy assistant_threads_insert_own on public.assistant_threads
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Borrar el hilo se lleva los turnos por cascade. Es lo mínimo que se le debe a
-- alguien que contó qué se quiere tatuar y por qué.
create policy assistant_threads_delete_own on public.assistant_threads
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Sin UPDATE: `project_id` lo escribe `attach_thread_project()` y `last_turn_at`
-- un trigger. Si el cliente pudiera actualizar, podría colgarle a su hilo la
-- búsqueda de otro — o, peor, mover un hilo a otra persona.

create policy assistant_turns_select_own on public.assistant_turns
  for select to authenticated
  using (
    exists (
      select 1 from public.assistant_threads t
      where t.id = assistant_turns.thread_id
        and t.user_id = (select auth.uid())
    )
  );

/**
 * La política que sostiene ADR-021.
 *
 * El cliente puede escribir SU turno en SU hilo, y nada más. `role = 'person'`
 * no es cosmético: sin ese predicado, un cliente modificado fabrica una
 * respuesta del asistente y la muestra como si MESH la hubiera dicho. El turno
 * del asistente entra por la Edge Function, con la service key, que no pasa por
 * acá.
 */
create policy assistant_turns_insert_own on public.assistant_turns
  for insert to authenticated
  with check (
    role = 'person'
    and exists (
      select 1 from public.assistant_threads t
      where t.id = assistant_turns.thread_id
        and t.user_id = (select auth.uid())
    )
  );

-- Sin UPDATE ni DELETE por turno: no se edita a mitad de camino lo que dijo
-- ninguna de las dos partes. Lo que se puede es tirar el hilo entero.

-- --- last_turn_at ---------------------------------------------------------------

create or replace function public.touch_assistant_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.assistant_threads
    set last_turn_at = new.created_at
  where id = new.thread_id;
  return new;
end;
$$;

create trigger assistant_turns_touch_thread
  after insert on public.assistant_turns
  for each row execute function public.touch_assistant_thread();

-- --- topes ----------------------------------------------------------------------

/**
 * Dos techos, y son cosas distintas.
 *
 * **Por hilo (40):** una conversación que no cierra en 40 turnos no va a
 * cerrar. No es una cuota de producto —nadie de buena fe llega ahí— sino que
 * sin tope el costo por hilo no tiene techo, y el contexto que se le manda al
 * modelo tampoco.
 *
 * **Por hora (120 turnos de persona):** el mismo techo contra un cliente en
 * loop que ya tienen los mensajes. `security definer` por el mismo motivo que
 * las otras cuotas: una cuenta que RLS pudiera recortar es una cuota evadible.
 */
create or replace function public.enforce_assistant_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  en_el_hilo integer;
  en_la_hora integer;
  duenio uuid;
begin
  select count(*) into en_el_hilo
  from public.assistant_turns
  where thread_id = new.thread_id;

  if en_el_hilo >= 40 then
    raise exception 'este pedido ya es muy largo'
      using errcode = '53400';
  end if;

  if new.role = 'person' then
    select t.user_id into duenio
    from public.assistant_threads t
    where t.id = new.thread_id;

    select count(*) into en_la_hora
    from public.assistant_turns turn
    join public.assistant_threads t on t.id = turn.thread_id
    where t.user_id = duenio
      and turn.role = 'person'
      and turn.created_at > now() - interval '1 hour';

    if en_la_hora >= 120 then
      raise exception 'demasiados mensajes por ahora'
        using errcode = '53400';
    end if;
  end if;

  return new;
end;
$$;

create trigger assistant_turns_enforce_limits
  before insert on public.assistant_turns
  for each row execute function public.enforce_assistant_limits();

-- --- el pedido que sale del hilo -------------------------------------------------

/**
 * Colgar la búsqueda recién creada del hilo que la produjo.
 *
 * Angosta y con dueño resuelto adentro, mismo patrón que
 * `set_studio_location()` y `mark_conversation_read()`: si esto fuera un UPDATE
 * del cliente, habría que darle UPDATE sobre `assistant_threads`, y con eso
 * podría colgarle a su hilo la búsqueda de otra persona.
 *
 * Exige que las dos cosas sean suyas. Un `security definer` que no chequea las
 * dos puntas es un agujero con forma de comodidad.
 */
create or replace function public.attach_thread_project(
  p_thread_id uuid,
  p_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  quien uuid := (select auth.uid());
begin
  if quien is null then
    raise exception 'hace falta una sesión' using errcode = '28000';
  end if;

  update public.assistant_threads t
    set project_id = p_project_id
  where t.id = p_thread_id
    and t.user_id = quien
    and exists (
      select 1 from public.projects p
      where p.id = p_project_id
        and p.user_id = quien
    );

  if not found then
    raise exception 'no se pudo colgar el pedido del hilo'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.attach_thread_project(uuid, uuid) from public, anon;
grant execute on function public.attach_thread_project(uuid, uuid) to authenticated;

comment on function public.attach_thread_project is
  'Cuelga una búsqueda propia de un hilo propio. Las dos puntas se verifican. Ver ADR-021.';
