-- El almanaque: cuándo trabaja un artista, y qué tiene ocupado.
--
-- Ver ADR-018.
--
-- ## Las tres decisiones que definen la forma
--
-- 1. **La disponibilidad son REGLAS, no casilleros.** Un artista dice "martes a
--    sábado de 14 a 20", no genera trescientos turnos vacíos. Los huecos libres
--    se derivan: regla, menos excepción del día, menos lo que ya está tomado.
--    Pre-generar casilleros obliga a mantenerlos —¿hasta cuándo hacia adelante?
--    ¿qué pasa si cambia el horario?— y el estado que se mantiene a mano es el
--    que se desincroniza.
--
-- 2. **El turno nace de un chat.** Es lo que se pidió: primero hablan, y de esa
--    conversación sale el turno. `conversation_id` no es decoración — es la
--    prueba de que hubo un ida y vuelta antes de que alguien ocupe una tarde, y
--    es de donde sale quién es el cliente.
--
-- 3. **Lo ocupado lo garantiza Postgres, no la app.** Una restricción de
--    exclusión impide que dos turnos del mismo artista se pisen. Chequearlo en
--    TypeScript deja la carrera abierta: dos pedidos simultáneos leen "libre" y
--    los dos escriben.
--
-- ## Lo que NO está acá
--
-- **Seña ni pagos.** El turno se agenda; si hay plata de por medio, es otra
-- decisión y va con su ADR. Hoy un turno no cuesta nada y no bloquea nada.

-- La restricción de exclusión necesita comparar un uuid por igualdad y un rango
-- por solapamiento en el mismo índice. `btree_gist` es lo que permite eso.
create extension if not exists btree_gist;

-- --- cuándo trabaja -----------------------------------------------------------

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null
    references public.professionals (id) on delete cascade,

  -- 0 = domingo, como `extract(dow)` de Postgres. Se guarda el número y no un
  -- enum de nombres: los nombres son de la UI y se traducen; el número no.
  weekday smallint not null check (weekday between 0 and 6),

  -- `time` y no `timestamptz`: es "de 14 a 20", todos los martes. La fecha la
  -- pone el día concreto.
  starts_at time not null,
  ends_at time not null,

  created_at timestamptz not null default now(),

  constraint availability_rules_ordered check (ends_at > starts_at),
  -- Dos tramos el mismo día se permiten —mañana y tarde, con siesta en el
  -- medio— pero no dos idénticos.
  unique (professional_id, weekday, starts_at, ends_at)
);

comment on table public.availability_rules is
  'Horario semanal de un artista. Los huecos libres se derivan de esto. Ver ADR-018.';

-- Consulta detrás del índice: el almanaque de un artista, que trae todas sus
-- reglas para armar la semana.
create index availability_rules_professional_idx
  on public.availability_rules (professional_id, weekday);

-- --- las excepciones ----------------------------------------------------------

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null
    references public.professionals (id) on delete cascade,

  on_date date not null,

  -- `false` = ese día no trabaja, pase lo que diga la regla. `true` = trabaja
  -- en este horario aunque la regla diga otra cosa. Las dos cosas hacen falta:
  -- un feriado y un sábado que abrió de más no son el mismo hecho.
  is_open boolean not null,
  starts_at time,
  ends_at time,

  created_at timestamptz not null default now(),

  -- Abierto exige horario; cerrado no puede tenerlo. Sin esto entra un "cerrado
  -- de 14 a 20", que no significa nada y alguien va a tener que interpretar.
  constraint availability_exceptions_shape check (
    (is_open and starts_at is not null and ends_at is not null
      and ends_at > starts_at)
    or (not is_open and starts_at is null and ends_at is null)
  ),
  unique (professional_id, on_date, starts_at)
);

comment on table public.availability_exceptions is
  'Un día que no sigue la regla semanal: cerrado, o abierto en otro horario.';

create index availability_exceptions_professional_idx
  on public.availability_exceptions (professional_id, on_date);

-- --- los turnos ---------------------------------------------------------------

create type public.appointment_status as enum ('scheduled', 'cancelled');

comment on type public.appointment_status is
  'Dos estados, y los dos los escribe alguien. "Completado" no está: que un turno
   ya pasó se deriva de `ends_at`, y un estado que nadie marca queda siempre en
   el valor inicial mintiendo. Ver ADR-018.';

create table public.appointments (
  id uuid primary key default gen_random_uuid(),

  professional_id uuid not null
    references public.professionals (id) on delete cascade,
  -- Quién es el cliente. Se copia de la conversación al crear el turno, y
  -- desde ahí es un hecho propio: si el chat se borra, el turno sigue siendo
  -- de esa persona.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- De qué charla salió. `set null` y no `cascade`: borrar un chat no puede
  -- borrar un turno que las dos partes tienen anotado en su semana.
  conversation_id uuid references public.conversations (id) on delete set null,

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  status public.appointment_status not null default 'scheduled',
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,

  -- Lo que se va a tatuar, en las palabras del artista. Opcional: un turno sin
  -- nota es un turno igual, y un campo obligatorio se llena con "-".
  note text check (note is null or length(note) between 1 and 500),

  created_at timestamptz not null default now(),

  constraint appointments_ordered check (ends_at > starts_at),
  -- Cancelado exige fecha de cancelación, y agendado no puede tenerla. El
  -- estado y su rastro no se pueden separar.
  constraint appointments_cancel_shape check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status = 'scheduled' and cancelled_at is null and cancelled_by is null)
  )
);

comment on table public.appointments is
  'Un turno, nacido de un chat. Ver ADR-018.';

-- **Esto es "queda en el sistema como ocupado".**
--
-- Dos turnos agendados del mismo artista no pueden solaparse, y lo impone
-- Postgres. En TypeScript sería una carrera: dos pedidos leen "libre" al mismo
-- tiempo y los dos escriben. Los cancelados quedan afuera del índice, así que
-- cancelar libera el horario sin borrar el historial.
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'scheduled');

-- Consulta detrás del índice: la agenda de un artista, y la de una persona.
create index appointments_professional_idx
  on public.appointments (professional_id, starts_at);
create index appointments_user_idx
  on public.appointments (user_id, starts_at desc);

-- --- RLS ----------------------------------------------------------------------

alter table public.availability_rules enable row level security;
alter table public.availability_rules force row level security;
alter table public.availability_exceptions enable row level security;
alter table public.availability_exceptions force row level security;
alter table public.appointments enable row level security;
alter table public.appointments force row level security;

revoke all on public.availability_rules from anon, authenticated;
revoke all on public.availability_exceptions from anon, authenticated;
revoke all on public.appointments from anon, authenticated;

grant select, insert, delete on public.availability_rules to authenticated;
grant select, insert, delete on public.availability_exceptions to authenticated;
grant select on public.appointments to authenticated;

-- El horario de un artista publicado es público: es exactamente lo que la
-- persona vino a ver antes de escribirle. Lo que NO es público es qué tiene
-- ocupado y con quién — eso vive en `appointments`, que no se lee así.
create policy availability_rules_select_published on public.availability_rules
  for select to authenticated
  using (
    exists (
      select 1 from public.professionals p
      where p.id = availability_rules.professional_id and p.is_published
    )
  );

create policy availability_rules_write_own on public.availability_rules
  for insert to authenticated
  with check (
    exists (
      select 1 from public.professionals p
      where p.id = availability_rules.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  );

create policy availability_rules_delete_own on public.availability_rules
  for delete to authenticated
  using (
    exists (
      select 1 from public.professionals p
      where p.id = availability_rules.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  );

create policy availability_exceptions_select_published
  on public.availability_exceptions
  for select to authenticated
  using (
    exists (
      select 1 from public.professionals p
      where p.id = availability_exceptions.professional_id and p.is_published
    )
  );

create policy availability_exceptions_write_own on public.availability_exceptions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.professionals p
      where p.id = availability_exceptions.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  );

create policy availability_exceptions_delete_own on public.availability_exceptions
  for delete to authenticated
  using (
    exists (
      select 1 from public.professionals p
      where p.id = availability_exceptions.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  );

-- Un turno lo ven **las dos partes y nadie más**. Ni siquiera se sabe que
-- existe: quien mira el almanaque de un artista ve qué horarios quedan libres,
-- que es otra cosa — un hueco ocupado no dice de quién es.
create policy appointments_select_participants on public.appointments
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.professionals p
      where p.id = appointments.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  );

-- Sin INSERT ni UPDATE de cliente: los dos pasan por una función, porque los
-- invariantes son varios y no todos caben en un `with check`.

-- --- los huecos libres, para quien mira ---------------------------------------

/**
 * Los turnos ocupados de un artista en una ventana, SIN decir de quién son.
 *
 * Es lo que hace que alguien pueda ver el almanaque sin ver la agenda. Devuelve
 * dos columnas y ninguna identifica a nadie: el hueco está tomado, y punto.
 */
create or replace function public.get_busy_slots(
  p_professional_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.starts_at, a.ends_at
  from public.appointments a
  join public.professionals p on p.id = a.professional_id
  where a.professional_id = p_professional_id
    and a.status = 'scheduled'
    and a.starts_at < p_to
    and a.ends_at > p_from
    and p.is_published
  order by a.starts_at;
$$;

revoke all on function public.get_busy_slots(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_busy_slots(uuid, timestamptz, timestamptz)
  to authenticated;

comment on function public.get_busy_slots is
  'Qué horarios están tomados. Nunca de quién. Ver ADR-018.';

-- --- asignar un turno ---------------------------------------------------------

/**
 * El artista asigna un turno desde una conversación.
 *
 * **Solo el artista.** Es lo que se pidió y es lo correcto: el turno es el
 * resultado de una charla, y quien la cierra es quien tiene la agenda. Que el
 * cliente pudiera agendar solo convertiría el almanaque en un formulario de
 * reservas, que es otro producto.
 *
 * El cliente sale de la conversación y no de un parámetro: si viniera de
 * afuera, un artista podría agendarle un turno a cualquiera.
 */
create or replace function public.schedule_appointment(
  p_conversation_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_note text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_professional_id uuid;
  v_user_id uuid;
  v_id uuid;
begin
  select c.professional_id, c.user_id
  into v_professional_id, v_user_id
  from public.conversations c
  join public.professionals p on p.id = c.professional_id
  where c.id = p_conversation_id
    and p.owner_user_id = (select auth.uid());

  -- Un mensaje solo, para el chat que no existe y para el que es de otro: si
  -- fueran distintos, esto diría si una conversación existe.
  if v_professional_id is null then
    raise exception 'no se puede agendar en esta conversación'
      using errcode = '42501';
  end if;

  if p_ends_at <= p_starts_at then
    raise exception 'el turno tiene que terminar después de empezar'
      using errcode = '22023';
  end if;

  -- El pasado no se agenda. Sin esto, un error de zona horaria del cliente
  -- entra sin que nadie lo note hasta que alguien mira su semana.
  if p_starts_at < now() then
    raise exception 'no se puede agendar en el pasado'
      using errcode = '22023';
  end if;

  -- El solapamiento lo rechaza `appointments_no_overlap`, que es una
  -- restricción y no un chequeo: dos pedidos simultáneos no pueden pasar los
  -- dos. Se traduce a un mensaje que la app pueda mostrar.
  begin
    insert into public.appointments
      (professional_id, user_id, conversation_id, starts_at, ends_at, note)
    values
      (v_professional_id, v_user_id, p_conversation_id, p_starts_at, p_ends_at,
       p_note)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'ese horario ya está ocupado' using errcode = '23P01';
  end;

  return v_id;
end;
$$;

revoke all on function public.schedule_appointment(uuid, timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.schedule_appointment(uuid, timestamptz, timestamptz, text)
  to authenticated;

comment on function public.schedule_appointment is
  'El artista agenda desde un chat. El cliente sale de la conversación. Ver ADR-018.';

-- --- cancelar -----------------------------------------------------------------

/**
 * Cancelar, de cualquiera de las dos partes.
 *
 * Cancelar es un update y no un delete: el turno queda como rastro de que
 * existió — y hace falta, porque la fila cancelada es lo que distingue "se
 * arrepintió" de "nunca pasó". La restricción de exclusión ignora los
 * cancelados, así que el horario queda libre en el mismo instante.
 */
create or replace function public.cancel_appointment(p_appointment_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  select true into v_ok
  from public.appointments a
  left join public.professionals p on p.id = a.professional_id
  where a.id = p_appointment_id
    and a.status = 'scheduled'
    and (
      a.user_id = (select auth.uid())
      or p.owner_user_id = (select auth.uid())
    );

  if v_ok is null then
    raise exception 'no se puede cancelar este turno' using errcode = '42501';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = (select auth.uid())
  where id = p_appointment_id;
end;
$$;

revoke all on function public.cancel_appointment(uuid) from public, anon;
grant execute on function public.cancel_appointment(uuid) to authenticated;

comment on function public.cancel_appointment is
  'Cancela un turno propio, de cualquiera de las dos partes. Ver ADR-018.';
