-- Denunciar y bloquear.
--
-- Ver ADR-023.
--
-- ## Por qué esto entra recién ahora, y por qué no puede esperar más
--
-- Mientras el catálogo fue curado y el contacto salía a WhatsApp, no había nada
-- que moderar: MESH no alojaba contenido de nadie. Eso se terminó en tres pasos
-- —alta propia de artista (ADR-013), chat propio (ADR-012), reseñas (ADR-019)—
-- y el último fue un asistente que acepta texto libre (ADR-021). Hoy MESH aloja
-- obra, mensajes, reseñas y conversaciones de gente que no conoce.
--
-- Una app así **necesita** dos cosas, y no son opcionales ni por ley ni por
-- decencia: una forma de avisar que algo está mal, y una forma de no volver a
-- cruzarse con alguien.
--
-- ## Las tres decisiones que definen este esquema
--
-- 1. **Bloquear corta de verdad, del lado de la base.** No es un filtro de
--    pantalla. Con un bloqueo activo no se abre un chat, no se escribe en uno
--    ya abierto, no llega una propuesta, y ninguno de los dos aparece en el
--    mazo ni en las grillas del otro. Un bloqueo que solo esconde es un bloqueo
--    que se evade abriendo la app en otro lado.
--
-- 2. **Nadie sabe quién lo denunció ni quién lo bloqueó.** Las dos tablas se
--    leen solo desde el lado de quien actuó. Un bloqueo que se puede detectar
--    es un bloqueo que se responde, y responder es exactamente lo que la
--    persona quiso evitar.
--
-- 3. **No se guarda una copia de lo denunciado.** Si el contenido se borra, la
--    denuncia sobrevive pero se queda sin su objeto: sabemos QUÉ tipo de cosa
--    se denunció, no qué decía. Es una limitación elegida — la alternativa es
--    que MESH archive mensajes y reseñas ajenas por si acaso, y eso es
--    justamente lo que no queremos guardar. En la práctica el borrado suele
--    SER la resolución: el artista bajó la obra.

-- --- vocabulario ---------------------------------------------------------------

/**
 * Qué se denuncia. Cerrado a propósito.
 *
 * Una lista corta que cubre lo que realmente pasa en un catálogo de tatuadores.
 * `stolen_work` está porque es LA denuncia del rubro: alguien sube la obra de
 * otro como propia. `off_platform` es el que protege el modelo: llevar la
 * conversación afuera para saltearse todo esto.
 */
create type public.report_reason as enum (
  'spam',
  'harassment',
  'impersonation',
  'stolen_work',
  'explicit',
  'off_platform',
  'other'
);

/** Sobre qué recae la denuncia. */
create type public.report_target as enum (
  'professional',
  'artwork',
  'review',
  'message',
  'assistant'
);

/** En qué anda. Lo mueve el equipo, nunca el cliente. */
create type public.report_status as enum (
  'open',
  'reviewing',
  'actioned',
  'dismissed'
);

comment on type public.report_reason is 'Motivos de denuncia. Cerrado. Ver ADR-023.';

-- --- denuncias -----------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  target_kind public.report_target not null,
  reason public.report_reason not null,
  -- Corta a propósito: es un aviso, no un descargo. Lo que hace falta para
  -- entender qué mirar entra en cinco renglones.
  note text check (note is null or length(btrim(note)) between 1 and 1000),

  -- Un objetivo por tipo, cada uno con su FK de verdad. Un `target_id uuid`
  -- genérico habría sido más corto y no tendría integridad referencial: se
  -- podría denunciar un uuid que no existe, o quedar apuntando a la nada.
  --
  -- `on delete set null` y no `cascade`: si el contenido se va, la denuncia
  -- sobrevive sin su objeto. Con cascade, borrar lo denunciado borraría la
  -- denuncia — que es exactamente la jugada de quien tiene algo que esconder.
  professional_id uuid references public.professionals(id) on delete set null,
  portfolio_item_id uuid references public.portfolio_items(id) on delete set null,
  review_id uuid references public.reviews(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  assistant_turn_id uuid references public.assistant_turns(id) on delete set null,

  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),

  /**
   * La única columna de objetivo que puede estar llena es la que nombra
   * `target_kind`.
   *
   * No dice "y tiene que haber una llena", porque después de un `set null` no
   * la hay. Que al crearla haya exactamente una lo exige la política de INSERT,
   * que es el único momento en que esa afirmación es cierta para siempre.
   */
  constraint reports_single_target check (
    (professional_id is null or target_kind = 'professional')
    and (portfolio_item_id is null or target_kind = 'artwork')
    and (review_id is null or target_kind = 'review')
    and (message_id is null or target_kind = 'message')
    and (assistant_turn_id is null or target_kind = 'assistant')
  )
);

comment on table public.reports is
  'Una denuncia. Solo la lee quien la hizo y el equipo. Ver ADR-023.';

-- Una denuncia por persona y por cosa. Denunciar diez veces lo mismo no lo hace
-- más urgente, y sin esto un solo usuario puede fabricar una avalancha.
create unique index reports_once_professional
  on public.reports (reporter_user_id, professional_id)
  where professional_id is not null;
create unique index reports_once_artwork
  on public.reports (reporter_user_id, portfolio_item_id)
  where portfolio_item_id is not null;
create unique index reports_once_review
  on public.reports (reporter_user_id, review_id)
  where review_id is not null;
create unique index reports_once_message
  on public.reports (reporter_user_id, message_id)
  where message_id is not null;
create unique index reports_once_assistant
  on public.reports (reporter_user_id, assistant_turn_id)
  where assistant_turn_id is not null;

-- Consulta detrás del índice: la cola del equipo, lo abierto primero.
create index reports_triage_idx on public.reports (status, created_at);

alter table public.reports enable row level security;
alter table public.reports force row level security;

revoke all on public.reports from anon, authenticated;
grant select, insert, delete on public.reports to authenticated;
grant select, insert, update, delete on public.reports to service_role;

-- Solo las propias. **El denunciado no sabe que existe una denuncia sobre él**,
-- y esa es la mitad del valor: una denuncia que se puede ver es una denuncia
-- que se responde.
create policy reports_select_own on public.reports
  for select to authenticated
  using (reporter_user_id = (select auth.uid()));

/**
 * Denunciar lo que uno puede ver, y nada más.
 *
 * Los cinco casos tienen su guarda, y las dos últimas no son de forma sino de
 * privacidad: sin ellas se podría insertar un `message_id` o un
 * `assistant_turn_id` adivinado, y el éxito o el fallo del insert diría si ese
 * id existe. Una denuncia no puede ser una sonda de existencia.
 */
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (
    reporter_user_id = (select auth.uid())
    and case target_kind
      when 'professional' then
        exists (
          select 1 from public.professionals p
          where p.id = reports.professional_id and p.is_published
        )
      when 'artwork' then
        exists (
          select 1 from public.portfolio_items it
          join public.professionals p on p.id = it.professional_id
          where it.id = reports.portfolio_item_id and p.is_published
        )
      when 'review' then
        exists (
          select 1 from public.reviews r
          join public.professionals p on p.id = r.professional_id
          where r.id = reports.review_id and p.is_published
        )
      when 'message' then
        -- Solo un participante del hilo. Nadie denuncia un mensaje que no le
        -- llegó.
        exists (
          select 1 from public.messages m
          join public.conversations c on c.id = m.conversation_id
          where m.id = reports.message_id
            and (
              c.user_id = (select auth.uid())
              or exists (
                select 1 from public.professionals p
                where p.id = c.professional_id
                  and p.owner_user_id = (select auth.uid())
              )
            )
        )
      when 'assistant' then
        -- Solo en el hilo propio. Es la vía por la que nos enteramos de que el
        -- asistente rompió una de sus siete reglas, así que tiene que existir.
        exists (
          select 1 from public.assistant_turns t
          join public.assistant_threads th on th.id = t.thread_id
          where t.id = reports.assistant_turn_id
            and th.user_id = (select auth.uid())
        )
    end
  );

-- Se puede retirar mientras nadie la haya mirado. Un toque equivocado no tiene
-- por qué ser permanente; una denuncia ya en revisión, sí — retirarla ahí
-- borraría el rastro de algo que el equipo ya está mirando.
create policy reports_delete_open on public.reports
  for delete to authenticated
  using (
    reporter_user_id = (select auth.uid())
    and status = 'open'
  );

-- Sin UPDATE para el cliente: el estado lo mueve el equipo con la service key.

-- --- bloqueos --------------------------------------------------------------------

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.profiles(id) on delete cascade,

  -- Dos direcciones, porque MESH tiene dos lados. La persona bloquea a un
  -- PERFIL —que es lo único que conoce de un artista—; el artista bloquea a una
  -- PERSONA, y solo puede hacerlo desde una conversación, que es el único lugar
  -- donde su identidad le llegó.
  blocked_professional_id uuid references public.professionals(id) on delete cascade,
  blocked_user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint blocks_one_target check (
    (blocked_professional_id is not null)::int
    + (blocked_user_id is not null)::int = 1
  ),
  constraint blocks_not_self check (
    blocked_user_id is null or blocked_user_id <> blocker_user_id
  )
);

comment on table public.blocks is
  'Un bloqueo. Corta chat, propuestas y visibilidad, en las dos direcciones. Ver ADR-023.';

create unique index blocks_once_professional
  on public.blocks (blocker_user_id, blocked_professional_id)
  where blocked_professional_id is not null;
create unique index blocks_once_user
  on public.blocks (blocker_user_id, blocked_user_id)
  where blocked_user_id is not null;

-- Consulta detrás del índice: "¿hay bloqueo entre estos dos?", que corre en
-- cada apertura de chat, cada mensaje y cada fila del mazo.
create index blocks_lookup_idx
  on public.blocks (blocked_professional_id, blocker_user_id)
  where blocked_professional_id is not null;
create index blocks_lookup_user_idx
  on public.blocks (blocked_user_id, blocker_user_id)
  where blocked_user_id is not null;

alter table public.blocks enable row level security;
alter table public.blocks force row level security;

revoke all on public.blocks from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert, update, delete on public.blocks to service_role;

-- **Solo del lado de quien bloqueó.** Que el bloqueado no pueda leer esta tabla
-- es la razón por la que un bloqueo sirve: si se pudiera detectar, se
-- respondería, y responder es lo que la persona quiso evitar.
create policy blocks_select_own on public.blocks
  for select to authenticated
  using (blocker_user_id = (select auth.uid()));

create policy blocks_insert_own on public.blocks
  for insert to authenticated
  with check (
    blocker_user_id = (select auth.uid())
    and (
      blocked_professional_id is null
      or exists (
        select 1 from public.professionals p
        where p.id = blocks.blocked_professional_id and p.is_published
      )
    )
    and (
      blocked_user_id is null
      -- Un artista solo bloquea a alguien con quien tuvo una conversación. Sin
      -- esto, un uuid adivinado alcanzaría para saber si esa persona existe.
      or exists (
        select 1 from public.conversations c
        join public.professionals p on p.id = c.professional_id
        where c.user_id = blocks.blocked_user_id
          and p.owner_user_id = (select auth.uid())
      )
    )
  );

-- Desbloquear es borrar. Sin UPDATE: un bloqueo no cambia de objetivo.
create policy blocks_delete_own on public.blocks
  for delete to authenticated
  using (blocker_user_id = (select auth.uid()));

-- --- ¿hay bloqueo entre estos dos? -----------------------------------------------

/**
 * Responde por las dos direcciones a la vez.
 *
 * `security definer` por necesidad: las políticas que la usan corren como quien
 * llama, y quien llama solo ve **sus** bloqueos. Para saber si el otro lo
 * bloqueó a él hace falta leer una fila que RLS —correctamente— le esconde.
 *
 * Y por eso mismo lleva su propio candado: **solo contesta si quien pregunta es
 * una de las dos partes.** Sin esa línea, esta función sería un oráculo público
 * de "¿fulano bloqueó a mengano?", que es justo lo que las políticas de arriba
 * existen para impedir. A un tercero le contesta `false`, que además es cierto
 * para él: entre él y nadie no hay ningún bloqueo.
 */
create or replace function public.is_blocked_pair(
  p_person_user_id uuid,
  p_professional_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when not (
        p_person_user_id = (select auth.uid())
        or exists (
          select 1 from public.professionals p
          where p.id = p_professional_id
            and p.owner_user_id = (select auth.uid())
        )
      ) then false
      else exists (
        select 1
        from public.blocks b
        where b.blocker_user_id = p_person_user_id
          and b.blocked_professional_id = p_professional_id
      ) or exists (
        select 1
        from public.blocks b
        join public.professionals p on p.id = p_professional_id
        where b.blocker_user_id = p.owner_user_id
          and b.blocked_user_id = p_person_user_id
      )
    end;
$$;

revoke all on function public.is_blocked_pair(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_pair(uuid, uuid) to authenticated;

comment on function public.is_blocked_pair is
  'Si hay bloqueo en cualquiera de las dos direcciones. Solo contesta a las partes. Ver ADR-023.';

/**
 * Lo mismo, resolviendo la persona desde la búsqueda.
 *
 * Existe porque el artista no puede leer `projects.user_id` —ni debe—, así que
 * la política de `project_interests` no tiene con qué llamar a la función de
 * arriba.
 */
create or replace function public.is_blocked_for_project(
  p_project_id uuid,
  p_professional_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select
        exists (
          select 1 from public.blocks b
          where b.blocker_user_id = pr.user_id
            and b.blocked_professional_id = p_professional_id
        ) or exists (
          select 1 from public.blocks b
          join public.professionals p on p.id = p_professional_id
          where b.blocker_user_id = p.owner_user_id
            and b.blocked_user_id = pr.user_id
        )
      from public.projects pr
      where pr.id = p_project_id
        -- Solo sobre una búsqueda ABIERTA, y solo para el dueño del perfil que
        -- pregunta: si no, esto diría "existe un proyecto con este uuid".
        and pr.is_open_to_professionals
        and exists (
          select 1 from public.professionals p
          where p.id = p_professional_id
            and p.owner_user_id = (select auth.uid())
        )
    ),
    false
  );
$$;

revoke all on function public.is_blocked_for_project(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_for_project(uuid, uuid) to authenticated;

-- --- el bloqueo corta, de verdad --------------------------------------------------

-- 1. No se abre un chat.
drop policy conversations_insert_own on public.conversations;
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
    and not public.is_blocked_pair(
      conversations.user_id,
      conversations.professional_id
    )
  );

-- 2. No se escribe en uno ya abierto. Bloquear después de haber hablado tiene
--    que servir para algo: es el caso normal, no el raro.
drop policy messages_insert_participant on public.messages;
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
        and not public.is_blocked_pair(c.user_id, c.professional_id)
    )
  );

-- 3. No llega una propuesta.
drop policy project_interests_insert_own on public.project_interests;
create policy project_interests_insert_own on public.project_interests
  for insert to authenticated
  with check (
    exists (
      select 1 from public.professionals pro
      where pro.id = project_interests.professional_id
        and pro.owner_user_id = (select auth.uid())
        and pro.is_published
    )
    and public.is_search_open(project_interests.project_id)
    and not public.is_blocked_for_project(
      project_interests.project_id,
      project_interests.professional_id
    )
  );

-- --- 4. y desaparece de las superficies ------------------------------------------
--
-- Tres funciones, dos criterios distintos y a propósito:
--
-- · **El mazo de búsquedas** filtra en las DOS direcciones. Es una superficie
--   dirigida: cada fila es el pedido de una persona concreta y termina en un
--   mensaje, así que un bloqueo tiene que valer aunque la otra parte no se
--   entere de por qué dejó de aparecer.
-- · **Las grillas** filtran solo los bloqueos de quien mira. Son `security
--   invoker` y leen los bloqueos propios sin ninguna función privilegiada.
--   Que la obra de alguien que te bloqueó siga apareciendo no es un daño: la
--   obra es pública, y el bloqueo corta donde pasan las cosas — el chat y las
--   propuestas.

create or replace function public.get_open_search_feed(
  p_category_slug text,
  p_limit integer default 12,
  p_cursor timestamptz default null
)
returns table (
  project_id uuid,
  title text,
  description text,
  location_slug text,
  budget_min_cents integer,
  budget_max_cents integer,
  budget_currency text,
  timing public.project_timing,
  size_note text,
  created_at timestamptz,
  style_slugs text[],
  reference_paths text[]
)
language sql
security definer
set search_path = ''
stable
as $$
  with artista as (
    -- Un artista, y solo uno: el perfil publicado de quien llama. Si no tiene
    -- perfil, esto queda vacío y el feed devuelve cero filas — que es lo
    -- correcto, no un error: todavía no es artista.
    select p.id, p.category_id
    from public.professionals p
    where p.owner_user_id = (select auth.uid())
      and p.is_published
    limit 1
  ),
  mis_estilos as (
    select ps.style_id
    from public.professional_styles ps
    join artista a on a.id = ps.professional_id
  )
  select
    pr.id,
    pr.title,
    pr.description,
    l.slug::text,
    pr.budget_min_cents,
    pr.budget_max_cents,
    pr.budget_currency::text,
    pr.timing,
    pr.size_note,
    pr.created_at,
    coalesce(
      (select array_agg(s.slug::text order by pst.weight desc, s.slug)
       from public.project_styles pst
       join public.styles s on s.id = pst.style_id
       where pst.project_id = pr.id),
      '{}'
    ),
    coalesce(
      (select array_agg(m.path order by prf.sort_order, m.path)
       from public.project_references prf
       join public.media_assets m on m.id = prf.media_id
       where prf.project_id = pr.id),
      '{}'
    )
  from public.projects pr
  join artista a on a.category_id = pr.category_id
  join public.categories c
    on c.id = pr.category_id
   and c.slug = p_category_slug::extensions.citext
  left join public.locations l on l.id = pr.location_id
  where pr.is_open_to_professionals
    -- Al menos un estilo en común. No es un puntaje: es un filtro, y es todo
    -- el orden que hay. Mostrarle a alguien que hace blackwork una búsqueda de
    -- lettering no es "un match flojo", es ruido.
    and exists (
      select 1 from public.project_styles pst
      join mis_estilos me on me.style_id = pst.style_id
      where pst.project_id = pr.id
    )
    -- Lo que ya decidió no vuelve —ni lo que le interesó ni lo que pasó—,
    -- igual que el mazo de obra con las piezas ya vistas.
    and not exists (
      select 1 from public.project_interests pi
      join artista a2 on a2.id = pi.professional_id
      where pi.project_id = pr.id
    )
    -- Un bloqueo saca la búsqueda del mazo, en las dos direcciones: ni la ve
    -- quien fue bloqueado, ni la de quien él bloqueó. Es la superficie donde
    -- un bloqueo tiene que valer aunque la otra parte no se entere.
    and not exists (
      select 1 from public.blocks b
      where b.blocker_user_id = pr.user_id
        and b.blocked_professional_id = a.id
    )
    and not exists (
      select 1
      from public.blocks b
      join public.professionals mio on mio.id = a.id
      where b.blocker_user_id = mio.owner_user_id
        and b.blocked_user_id = pr.user_id
    )
    and (p_cursor is null or pr.created_at < p_cursor)
  order by pr.created_at desc, pr.id
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.get_open_search_feed(text, integer, timestamptz)
  from public, anon;
grant execute on function public.get_open_search_feed(text, integer, timestamptz)
  to authenticated;


create or replace function public.get_artist_grid(
  p_category_slug text,
  p_limit integer default 100,
  -- Cuántas obras trae cada artista para el carrusel. Seis alcanza para dar una
  -- idea sin bajar el portafolio entero de cada uno.
  p_pieces integer default 6
)
returns table (
  professional_id uuid,
  slug text,
  display_name text,
  is_fixture boolean,
  avatar_path text,
  neighborhood_slug text,
  studio_lat double precision,
  studio_lng double precision,
  pieces jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with viewer as (
    select (select auth.uid()) as user_id
  )
  select
    p.id,
    p.slug::text,
    p.display_name,
    p.is_fixture,
    avatar.path,
    l.slug::text,
    p.studio_lat,
    p.studio_lng,
    coalesce(
      (
        select jsonb_agg(pieza order by pieza->>'sort')
        from (
          select jsonb_build_object(
            'id', pi.id,
            'sort', lpad(pi.sort_order::text, 6, '0'),
            'path', m.path,
            'width', m.width,
            'height', m.height,
            'blurhash', m.blurhash
          ) as pieza
          from public.portfolio_items pi
          join public.media_assets m on m.id = pi.media_id
          where pi.professional_id = p.id
          order by pi.is_featured desc, pi.sort_order
          limit greatest(coalesce(p_pieces, 6), 1)
        ) elegidas
      ),
      '[]'::jsonb
    )
  from public.professionals p
  join public.categories c on c.id = p.category_id
  cross join viewer v
  left join public.locations l on l.id = p.location_id
  left join public.media_assets avatar on avatar.id = p.avatar_media_id
  where p.is_published
    and c.is_active
    and c.slug = p_category_slug::extensions.citext
    and v.user_id is not null
    -- Un artista sin una sola obra publicada no tiene nada que mostrar en una
    -- grilla que es, sobre todo, imagen. No se lo esconde por castigo: es que
    -- su tarjeta saldría vacía.
    and exists (
      select 1 from public.portfolio_items pi where pi.professional_id = p.id
    )
    -- A quien bloqueaste no lo volvés a ver. Solo esta dirección: la función es
    -- `security invoker`, así que lee los bloqueos propios y nada más. La otra
    -- —que el artista te haya bloqueado a vos— no esconde su obra, que es
    -- pública; corta el chat y las propuestas, que es donde pasan las cosas.
    and not exists (
      select 1 from public.blocks b
      where b.blocker_user_id = v.user_id
        and b.blocked_professional_id = p.id
    )
  -- Mezcla estable por usuario. Cada persona ve un orden propio y siempre el
  -- mismo; el orden final por cercanía lo hace el dominio.
  order by md5(v.user_id::text || p.id::text)
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;


create or replace function public.get_discovery_feed(
  p_category_slug text,
  p_limit integer default 12,
  p_cursor text default null,
  -- `false` de default a propósito: el mazo es la superficie que más se llama,
  -- y un default equivocado ahí sería un bug silencioso — la obra decidida
  -- volvería a aparecer sin que nadie lo pidiera.
  p_include_seen boolean default false
)
returns table (
  feed_cursor text,
  portfolio_item_id uuid,
  professional_id uuid,
  professional_slug text,
  professional_display_name text,
  caption text,
  year integer,
  media_bucket text,
  media_path text,
  media_width integer,
  media_height integer,
  media_blurhash text,
  styles jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with viewer as (
    select (select auth.uid()) as user_id
  ),
  ranked as (
    select
      pi.id,
      pi.professional_id,
      row_number() over (
        partition by pi.professional_id
        order by md5(v.user_id::text || pi.id::text), pi.id
      ) as depth,
      count(*) over (partition by pi.professional_id) as total_for_professional,
      md5(v.user_id::text || pi.professional_id::text) as professional_key
    from public.portfolio_items pi
    join public.professionals p on p.id = pi.professional_id
    join public.categories c on c.id = p.category_id
    cross join viewer v
    where p.is_published
      and c.is_active
      and c.slug = p_category_slug::extensions.citext
      and v.user_id is not null
      -- Misma regla que la grilla de artistas: lo que bloqueaste no vuelve.
      and not exists (
        select 1 from public.blocks b
        where b.blocker_user_id = v.user_id
          and b.blocked_professional_id = p.id
      )
  ),
  page as (
    select
      r.id,
      r.professional_id,
      -- La posición fraccionaria, escalada a entero y rellenada con ceros para
      -- que ordene como texto. El desempate por clave de profesional mantiene
      -- el orden estable cuando dos posiciones caen igual.
      lpad(
        round((r.depth - 0.5) / r.total_for_professional * 1000000)::text,
        9,
        '0'
      ) || ':' || r.professional_key as sort_key
    from ranked r
    cross join viewer v
    where coalesce(p_include_seen, false)
       or not exists (
        select 1
        from public.interactions i
        where i.user_id = v.user_id
          and i.portfolio_item_id = r.id
      )
  )
  select
    page.sort_key as feed_cursor,
    page.id as portfolio_item_id,
    p.id as professional_id,
    p.slug::text as professional_slug,
    p.display_name as professional_display_name,
    pi.caption,
    pi.year,
    m.bucket as media_bucket,
    m.path as media_path,
    m.width as media_width,
    m.height as media_height,
    m.blurhash as media_blurhash,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('slug', s.slug::text, 'weight', pis.weight)
          order by pis.weight desc, s.slug
        )
        from public.portfolio_item_styles pis
        join public.styles s on s.id = pis.style_id
        where pis.portfolio_item_id = pi.id
      ),
      '[]'::jsonb
    ) as styles
  from page
  join public.portfolio_items pi on pi.id = page.id
  join public.professionals p on p.id = page.professional_id
  join public.media_assets m on m.id = pi.media_id
  where p_cursor is null or page.sort_key > p_cursor
  order by page.sort_key
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;


