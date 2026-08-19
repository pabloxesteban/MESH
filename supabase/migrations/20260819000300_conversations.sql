-- Chat entre una persona y un artista, adentro de MESH.
--
-- Hasta acá el contacto salía de la app: WhatsApp o Instagram, con un mensaje
-- redactado. Eso se mantiene y sigue siendo el único camino para un perfil sin
-- reclamar — no se puede chatear con alguien que no tiene dueño, porque no hay
-- nadie del otro lado a quien le llegue. Ver ADR-012.
--
-- Tres decisiones que definen este esquema:
--
-- 1. **Solo la persona abre la conversación.** El artista no puede iniciar un
--    chat con alguien que no le escribió. Al revés sería un canal de mensajes
--    no pedidos hacia usuarios que solo miraron un perfil, y eso es spam por
--    diseño, no por abuso.
-- 2. **Un mensaje es un registro, no un borrador.** Sin UPDATE y sin DELETE
--    para el cliente: no se edita lo dicho ni se borra la mitad de una
--    conversación que otra persona también tiene. Mismo criterio que
--    `media_assets`.
-- 3. **El estado de leído no es una columna que el cliente escriba.** Va por
--    `mark_conversation_read()`, angosta y con dueño resuelto adentro — mismo
--    patrón que `set_studio_location()`.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null
    references public.professionals(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Denormalizado a propósito: ordenar la lista de conversaciones por el
  -- último mensaje sin esto es un scan de `messages` por cada fila. Lo
  -- mantiene un trigger, nunca el cliente.
  last_message_at timestamptz,
  user_read_at timestamptz,
  professional_read_at timestamptz,
  -- Una sola conversación por par. Abrir el chat dos veces con la misma
  -- persona no crea un hilo nuevo: sigue el mismo.
  unique (user_id, professional_id)
);

comment on table public.conversations is
  'Un hilo entre una persona y un artista con perfil reclamado. La abre siempre la persona, nunca el artista.';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

comment on table public.messages is
  'Un mensaje. Inmutable: sin update ni delete para el cliente.';

-- --- índices, cada uno con su consulta ---------------------------------------

-- La lista de conversaciones de una persona, más reciente primero.
create index conversations_user_idx
  on public.conversations (user_id, last_message_at desc nulls last);

-- La misma lista, del lado del artista. El join va por `professionals`, así
-- que el índice es por profesional.
create index conversations_professional_idx
  on public.conversations (professional_id, last_message_at desc nulls last);

-- Los mensajes de un hilo, en orden.
create index messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- --- RLS ---------------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;

revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;

grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

grant select, insert, update, delete on public.conversations to service_role;
grant select, insert, update, delete on public.messages to service_role;

-- Participante = la persona que abrió el hilo, o el dueño del perfil del otro
-- lado. Se escribe entero en cada política en vez de en una función: una
-- función `security definer` que devuelva "sí es participante" es una
-- superficie más para equivocarse, y este predicado entra en cuatro líneas.

create policy conversations_select_participant on public.conversations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.professionals p
      where p.id = conversations.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  );

-- Solo la persona abre el hilo, y solo contra un perfil publicado Y reclamado.
-- Sin `owner_user_id is not null`, se podrían abrir hilos contra fixtures que
-- nadie va a leer nunca — una bandeja de salida que no llega a ningún lado.
create policy conversations_insert_own on public.conversations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.professionals p
      where p.id = conversations.professional_id
        and p.is_published
        and p.owner_user_id is not null
    )
  );

-- Sin UPDATE ni DELETE para el cliente: `last_message_at` lo mueve un trigger
-- y los timestamps de leído los mueve `mark_conversation_read()`.

create policy messages_select_participant on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.user_id = (select auth.uid())
          or exists (
            select 1 from public.professionals p
            where p.id = c.professional_id
              and p.owner_user_id = (select auth.uid())
          )
        )
    )
  );

-- El remitente tiene que ser quien llama Y participante del hilo. Las dos
-- condiciones: sin la primera se podría escribir en nombre de otro dentro de
-- un hilo propio; sin la segunda, en un hilo ajeno firmando con el nombre
-- propio.
create policy messages_insert_participant on public.messages
  for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.user_id = (select auth.uid())
          or exists (
            select 1 from public.professionals p
            where p.id = c.professional_id
              and p.owner_user_id = (select auth.uid())
          )
        )
    )
  );

-- --- last_message_at ---------------------------------------------------------

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
    set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- --- límite de envío ---------------------------------------------------------

-- 60 mensajes por hora por persona, sobre todos sus hilos.
--
-- No es una cuota de producto —nadie escribe 60 mensajes por hora de buena
-- fe— sino un techo contra un cliente modificado mandando en loop. SECURITY
-- DEFINER por el mismo motivo que las otras cuotas: una cuenta que RLS pudiera
-- recortar es una cuota que se puede evadir.
create or replace function public.enforce_message_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recientes integer;
begin
  select count(*) into recientes
  from public.messages
  where sender_user_id = new.sender_user_id
    and created_at > now() - interval '1 hour';

  if recientes >= 60 then
    raise exception 'Demasiados mensajes seguidos. Probá de nuevo en un rato.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.enforce_message_rate();

-- --- marcar leído ------------------------------------------------------------

-- Qué columna se toca lo decide la función según quién llama, no el cliente.
-- Con una política de UPDATE, marcar leído y marcar leído POR EL OTRO serían
-- la misma escritura con distinto `set`.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_is_owner boolean;
  v_is_user boolean;
begin
  if v_user is null then
    raise exception 'hace falta una sesión' using errcode = '28000';
  end if;

  select
    c.user_id = v_user,
    exists (
      select 1 from public.professionals p
      where p.id = c.professional_id and p.owner_user_id = v_user
    )
  into v_is_user, v_is_owner
  from public.conversations c
  where c.id = p_conversation_id;

  if v_is_user is null then
    -- No existe, o no es suya. Un solo mensaje para los dos casos: distinguir
    -- confirmaría la existencia de un hilo ajeno.
    raise exception 'no se encontró la conversación' using errcode = 'P0002';
  end if;

  if v_is_user then
    update public.conversations
      set user_read_at = now() where id = p_conversation_id;
  elsif v_is_owner then
    update public.conversations
      set professional_read_at = now() where id = p_conversation_id;
  else
    raise exception 'no se encontró la conversación' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

comment on function public.mark_conversation_read is
  'Marca leída la conversación para quien llama. La columna que toca depende de si es la persona o el artista.';

-- --- realtime ----------------------------------------------------------------

-- Sin esto el chat necesita polling. La publicación respeta RLS: cada quien
-- recibe solo los eventos de las filas que ya podría leer.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
