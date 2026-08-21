-- Mayoría de edad.
--
-- Ver ADR-025.
--
-- ## Por qué esto existe
--
-- MESH no tatúa a nadie, pero desde ADR-018 **arregla turnos**. Un turno de
-- tatuaje para un menor sin consentimiento de sus padres es ilegal en
-- Argentina, y una app que lo arregla sin preguntar nada es la que se lo puso
-- fácil. No es un detalle de cumplimiento: es la única parte de MESH con una
-- consecuencia física.
--
-- ## Qué se guarda, y qué no
--
-- **Una fecha: cuándo dijo que es mayor.** No la fecha de nacimiento, no la
-- edad, no un documento. Con la fecha de nacimiento tendríamos un dato sensible
-- de cada persona para calcular un booleano que ya nos dieron; con un documento
-- tendríamos un problema mucho más grande que el que vinimos a resolver.
--
-- Es una **declaración**, y como toda declaración se puede mentir. Lo que hace
-- es correr la responsabilidad y dejar rastro con fecha, que es exactamente lo
-- que hace cualquier app seria del rubro. La verificación de verdad la hace el
-- tatuador en persona, que es donde tiene sentido hacerla.
--
-- ## Y quien dice que no
--
-- No se guarda nada. Un `null` es "no lo confirmó", y ahí caen por igual quien
-- dijo que no y quien todavía no contestó. Guardar "declaró ser menor" sería
-- crear un registro de menores de edad, que es justo lo que no queremos tener.
--
-- Puede seguir mirando obra. Lo único que no puede es cerrar un turno.

alter table public.profiles
  add column adult_confirmed_at timestamptz;

comment on column public.profiles.adult_confirmed_at is
  'Cuándo declaró ser mayor de 18. NULL = no lo confirmó. No se guarda fecha de nacimiento. Ver ADR-025.';

/**
 * Declarar que es mayor de edad.
 *
 * Angosta y con dueño resuelto adentro, mismo patrón que
 * `set_studio_location()`: si esto fuera un UPDATE del cliente, habría que
 * darle UPDATE sobre `profiles`, y con eso podría escribir cualquier columna.
 *
 * **Idempotente y sin marcha atrás.** Volver a llamarla no mueve la fecha: la
 * primera declaración es la que vale y la que quedó con su hora. Y no hay una
 * función para desdecirse — desdecirse sería borrar el rastro de haberlo dicho,
 * que es justamente lo que este registro existe para conservar. Quien se
 * equivocó borra la cuenta, que sí se puede.
 */
create or replace function public.confirm_adult()
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

  update public.profiles
    set adult_confirmed_at = now()
  where id = quien
    and adult_confirmed_at is null;
end;
$$;

revoke all on function public.confirm_adult() from public, anon;
grant execute on function public.confirm_adult() to authenticated;

comment on function public.confirm_adult is
  'Declara mayoría de edad. Idempotente y sin marcha atrás. Ver ADR-025.';

-- --- el turno es lo único que se bloquea -----------------------------------------

/**
 * `schedule_appointment`, ahora con la puerta de edad.
 *
 * **Se chequea a la PERSONA, no a quien llama.** Quien llama es el artista —es
 * él quien asigna el turno desde el chat, ver ADR-018— así que preguntar por
 * `auth.uid()` habría verificado la edad del tatuador, que no es el punto.
 *
 * Y se chequea acá y no en la pantalla porque una pantalla se saltea. Este es
 * el único lugar de MESH donde algo tiene consecuencia física, y el único que
 * merece una verificación del lado del servidor.
 *
 * El resto de la función queda igual; se reescribe entera porque Postgres no
 * deja parchear un cuerpo.
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

  if v_professional_id is null then
    raise exception 'no se puede agendar en esta conversación'
      using errcode = '42501';
  end if;

  -- **La puerta de edad.** Sobre la persona que se va a tatuar.
  if not exists (
    select 1 from public.profiles pr
    where pr.id = v_user_id
      and pr.adult_confirmed_at is not null
  ) then
    -- Código propio y no `42501`: ese ya significa "esta conversación no es
    -- tuya", y la pantalla tiene que poder decir dos cosas distintas. Postgres
    -- admite SQLSTATE definidos por el usuario; la clase `M0` no colisiona con
    -- ninguna estándar, y el 18 es el que importa.
    raise exception 'esta persona todavía no confirmó que es mayor de edad'
      using errcode = 'M0018';
  end if;

  if p_ends_at <= p_starts_at then
    raise exception 'el turno tiene que terminar después de empezar'
      using errcode = '22023';
  end if;

  if p_starts_at < now() then
    raise exception 'no se puede agendar en el pasado'
      using errcode = '22023';
  end if;

  begin
    insert into public.appointments
      (conversation_id, professional_id, user_id, starts_at, ends_at, note)
    values
      (p_conversation_id, v_professional_id, v_user_id,
       p_starts_at, p_ends_at, p_note)
    returning id into v_id;
  exception
    when exclusion_violation then
      raise exception 'ese horario ya está ocupado' using errcode = '23P01';
  end;

  return v_id;
end;
$$;

revoke all on function
  public.schedule_appointment(uuid, timestamptz, timestamptz, text)
  from public, anon;
grant execute on function
  public.schedule_appointment(uuid, timestamptz, timestamptz, text)
  to authenticated;

comment on function public.schedule_appointment is
  'Da un turno desde el chat. Solo el dueño del perfil, y solo a alguien que confirmó ser mayor. Ver ADR-018 y ADR-025.';
