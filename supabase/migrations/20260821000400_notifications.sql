-- Avisos: qué pasó, sobre algo tuyo.
--
-- Ver ADR-027.
--
-- ## Por qué esto existe
--
-- ADR-023 dejó escrito lo que faltaba, con estas palabras: *"No te avisamos qué
-- pasó con tu denuncia. Es lo que más se extraña y falta a sabiendas: requiere
-- una bandeja de notificaciones que hoy no existe."* Esto la construye.
--
-- ## La regla que define la tabla entera
--
-- **Un aviso no tiene texto.** Tiene un tipo y una referencia; la frase la arma
-- la pantalla con i18n. Esa decisión, que parece de comodidad, es lo que hace
-- imposible el abuso que el innegociable 3 prohíbe:
--
-- · No se puede inventar urgencia, porque no hay dónde escribirla.
-- · No se puede filtrar contenido ajeno, porque no viaja ningún texto.
-- · No se puede fabricar un motivo para volver, porque cada tipo del enum
--   corresponde a un hecho que ocurrió y quedó en otra tabla.
--
-- Agregar un tipo de aviso es agregar un valor al enum **y** una clave de i18n:
-- dos lugares, los dos revisables. Un `body text` habría dejado la puerta
-- abierta a que cualquiera escriba cualquier cosa.
--
-- ## Y quién los escribe
--
-- Solo triggers. El cliente no puede insertar ni borrar: un aviso es la
-- consecuencia de un hecho, no algo que alguien decide mandar.

-- --- se puede apagar ------------------------------------------------------------

/**
 * El innegociable 3 exige que un aviso se pueda apagar, así que se puede.
 *
 * Apagado, los triggers **no escriben**. No es que se escriban y no se muestren:
 * eso sería guardar avisos sobre alguien que dijo que no los quiere.
 */
alter table public.profiles
  add column notifications_opt_in boolean not null default true;

comment on column public.profiles.notifications_opt_in is
  'Si recibe avisos. Apagado, los triggers no escriben nada. Ver ADR-027.';

-- --- los avisos ------------------------------------------------------------------

/**
 * Qué pasó. Cerrado, y corto a propósito.
 *
 * Cada valor corresponde a **un hecho real y reciente sobre quien lo recibe**,
 * que es la condición exacta que puso el innegociable 3 al acotarse el
 * 2026-08-20. Ninguno es "hace rato que no entrás".
 */
create type public.notification_kind as enum (
  -- Tu denuncia fue mirada por una persona.
  'report_reviewed',
  -- Te dieron un turno.
  'appointment_scheduled',
  -- Se canceló un turno tuyo. Lo recibe el OTRO, nunca quien canceló.
  'appointment_cancelled'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null,

  -- A qué se refiere. Uno por tipo, con su FK de verdad. **No hay `body`**: la
  -- frase la arma la pantalla con i18n, y por eso un aviso no puede inventar
  -- urgencia ni filtrar contenido ajeno.
  report_id uuid references public.reports(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,

  -- Cómo terminó la denuncia. Solo `actioned` o `dismissed`: qué medida se tomó
  -- sobre la otra persona no se cuenta, y decirlo sería contar una sanción
  -- ajena.
  outcome public.report_status,

  created_at timestamptz not null default now(),
  read_at timestamptz,

  constraint notifications_shape check (
    case kind
      when 'report_reviewed' then
        report_id is not null
        and appointment_id is null
        and outcome in ('actioned', 'dismissed')
      else
        appointment_id is not null
        and report_id is null
        and outcome is null
    end
  )
);

comment on table public.notifications is
  'Un hecho real y reciente sobre quien lo recibe. Sin texto libre. Ver ADR-027.';

-- Consulta detrás del índice: la bandeja, lo nuevo primero.
create index notifications_inbox_idx
  on public.notifications (user_id, created_at desc);

-- Y el conteo de no leídos, que es la consulta que corre en cada arranque.
create index notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications to service_role;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Sin INSERT para el cliente: un aviso es la consecuencia de un hecho, no algo
-- que alguien decide mandar. Los escriben los triggers de abajo.

-- Sin UPDATE: `read_at` lo mueve `mark_notifications_read()`. Con UPDATE
-- abierto, el cliente podría reescribir `kind` y hacerse aparecer un aviso que
-- no ocurrió.

-- Borrar sí: es su bandeja.
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- --- marcarlos leídos --------------------------------------------------------------

/**
 * Marca leído todo lo pendiente de quien llama.
 *
 * Angosta y con dueño resuelto adentro, mismo patrón que
 * `mark_conversation_read()`. `read_at is null` en el WHERE para que reabrir la
 * bandeja no mueva la fecha de lo que ya se había leído.
 */
create or replace function public.mark_notifications_read()
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

  update public.notifications
    set read_at = now()
  where user_id = quien
    and read_at is null;
end;
$$;

revoke all on function public.mark_notifications_read() from public, anon;
grant execute on function public.mark_notifications_read() to authenticated;

-- --- quién los escribe ---------------------------------------------------------------

/**
 * Escribe un aviso, si quien lo va a recibir los quiere.
 *
 * El chequeo del interruptor vive acá y no en cada trigger: repetido tres veces
 * se olvida en el cuarto, y el cuarto sería el que le escribe a alguien que
 * dijo que no.
 */
create or replace function public.push_notification(
  p_user_id uuid,
  p_kind public.notification_kind,
  p_report_id uuid,
  p_appointment_id uuid,
  p_outcome public.report_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then return; end if;

  if not exists (
    select 1 from public.profiles pr
    where pr.id = p_user_id and pr.notifications_opt_in
  ) then
    return;
  end if;

  insert into public.notifications
    (user_id, kind, report_id, appointment_id, outcome)
  values (p_user_id, p_kind, p_report_id, p_appointment_id, p_outcome);
end;
$$;

revoke all on function
  public.push_notification(uuid, public.notification_kind, uuid, uuid, public.report_status)
  from public, anon, authenticated;

comment on function public.push_notification is
  'Uso interno de los triggers. El cliente no la puede ejecutar. Ver ADR-027.';

/**
 * Una denuncia que el equipo terminó de mirar.
 *
 * Solo al pasar a un estado final, y solo una vez: `open → reviewing` no avisa
 * nada, porque "la estamos mirando" no es una resolución y avisar dos veces por
 * la misma denuncia es ruido.
 */
create or replace function public.notify_report_reviewed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('actioned', 'dismissed')
     and old.status not in ('actioned', 'dismissed') then
    perform public.push_notification(
      new.reporter_user_id, 'report_reviewed', new.id, null, new.status
    );
  end if;
  return new;
end;
$$;

create trigger reports_notify_reviewed
  after update on public.reports
  for each row execute function public.notify_report_reviewed();

/**
 * Un turno nuevo.
 *
 * Le llega a la **persona**, no al artista: el turno lo asigna el artista desde
 * el chat (ADR-018), así que avisarle a él sería contarle algo que acaba de
 * hacer.
 */
create or replace function public.notify_appointment_scheduled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.push_notification(
    new.user_id, 'appointment_scheduled', null, new.id, null
  );
  return new;
end;
$$;

create trigger appointments_notify_scheduled
  after insert on public.appointments
  for each row execute function public.notify_appointment_scheduled();

/**
 * Un turno cancelado.
 *
 * Le llega **al otro**, nunca a quien canceló. `cancelled_by` ya está en la
 * fila, así que no hace falta preguntarle a `auth.uid()` — que además estaría
 * mal si algún día se cancela desde un trabajo de mantenimiento.
 */
create or replace function public.notify_appointment_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  duenio uuid;
begin
  if new.status <> 'cancelled' or old.status = 'cancelled' then
    return new;
  end if;

  select p.owner_user_id into duenio
  from public.professionals p
  where p.id = new.professional_id;

  -- El que no canceló. Si `cancelled_by` es nulo —una cancelación del sistema—
  -- se avisa a los dos, que es lo correcto: ninguno de los dos lo hizo.
  if new.cancelled_by is distinct from new.user_id then
    perform public.push_notification(
      new.user_id, 'appointment_cancelled', null, new.id, null
    );
  end if;

  if new.cancelled_by is distinct from duenio then
    perform public.push_notification(
      duenio, 'appointment_cancelled', null, new.id, null
    );
  end if;

  return new;
end;
$$;

create trigger appointments_notify_cancelled
  after update on public.appointments
  for each row execute function public.notify_appointment_cancelled();
