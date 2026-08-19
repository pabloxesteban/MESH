-- La otra mitad de MESH: el tatuador buscando clientes.
--
-- Hasta acá el producto era de una sola dirección. Alguien busca, MESH le
-- recomienda artistas. Del otro lado no había nada: un tatuador abría la app y
-- veía un mazo con la obra de otros tatuadores, que es exactamente lo que no
-- necesita.
--
-- Esto agrega la dirección que faltaba. Un proyecto —la búsqueda de alguien—
-- se puede **abrir** para que los artistas lo vean, y un artista puede
-- **mandar interés**. Ver ADR-014.
--
-- Las tres decisiones que definen la forma, y por qué:
--
-- 1. **Cerrado por defecto.** `is_open_to_professionals` arranca en `false` y
--    solo lo enciende la persona, con un interruptor que dice qué hace. Nadie
--    publica la búsqueda de nadie. Una búsqueda contiene fotos de referencia
--    que la persona subió para sí misma; mostrarlas a desconocidos porque
--    "mejora el producto" sería exactamente lo que MESH dice que no hace.
--
-- 2. **El interés no es un mensaje.** Un artista no puede escribirle a nadie.
--    Manda interés, a la persona le aparece, y el chat se abre solo si ella
--    contesta. Es la regla que ADR-012 ya había fijado —"el artista responde,
--    nunca inicia"— y esto la mantiene en pie con una superficie nueva que la
--    habría roto sin pensarlo.
--
-- 3. **El artista no ve quién es la persona.** El feed devuelve la búsqueda:
--    fotos, estilos, barrio, presupuesto, urgencia. No devuelve `user_id`, ni
--    nombre, ni nada que identifique. La identidad aparece recién si la
--    persona abre el chat, o sea si ella decidió mostrarse.

-- --- abrir una búsqueda -------------------------------------------------------

alter table public.projects
  add column is_open_to_professionals boolean not null default false;

comment on column public.projects.is_open_to_professionals is
  'Encendido por la persona, con un interruptor explícito. Ver ADR-014.';

-- Consulta detrás del índice: el mazo del artista, que filtra por abiertas de
-- una categoría y ordena por las más nuevas.
create index projects_open_idx
  on public.projects (category_id, created_at desc)
  where is_open_to_professionals;

-- --- ¿está abierta? -----------------------------------------------------------

-- Un artista no puede leer `projects` —esa es toda la idea— así que una
-- política que pregunte `exists (select 1 from projects ...)` se evalúa con SUS
-- permisos y siempre da falso. El primer intento de esta migración tenía justo
-- ese bug: la política de INSERT rechazaba el caso legítimo, y lo encontró el
-- test que verificaba que el caso legítimo funciona.
--
-- Esta función es la excepción mínima: devuelve UN booleano sobre un id que
-- quien pregunta ya tiene en la mano. No expone ninguna columna, y no dice nada
-- de una búsqueda cerrada más allá de que no está abierta.
create or replace function public.is_search_open(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and p.is_open_to_professionals
  );
$$;

revoke all on function public.is_search_open(uuid) from public, anon;
grant execute on function public.is_search_open(uuid) to authenticated;

comment on function public.is_search_open is
  'Un booleano sobre un id que quien pregunta ya tiene. Lo usa la política de INSERT de project_interests.';

-- --- la decisión del artista ---------------------------------------------------
--
-- No alcanza con registrar el interés. Si el paso no se guarda, el artista
-- vuelve a abrir la app y se encuentra con las mismas búsquedas que ya
-- descartó — el mismo mazo con la misma primera tarjeta, para siempre. Es
-- exactamente lo que `interactions` resuelve del otro lado.
--
-- Una tabla y no dos: son la misma decisión con dos resultados. Lo que cambia
-- es quién la ve — la persona ve los intereses y nunca los pasos, igual que un
-- artista nunca se entera de quién pasó su obra en el mazo.

create type public.professional_verdict as enum ('interest', 'pass');

comment on type public.professional_verdict is
  'Qué hizo el artista con una búsqueda abierta. `pass` no se le muestra nunca a la persona.';

create table public.project_interests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  professional_id uuid not null
    references public.professionals(id) on delete cascade,
  verdict public.professional_verdict not null,
  created_at timestamptz not null default now(),

  -- Una decisión por búsqueda. Tocar dos veces no manda dos avisos, y "cuántas
  -- veces te mostraron interés" no es un número que MESH vaya a inflar.
  unique (project_id, professional_id)
);

comment on table public.project_interests is
  'La decisión de un artista ante una búsqueda abierta. Un interés NO es un mensaje: el chat lo abre la persona. Ver ADR-014.';

-- Consulta detrás del índice: "quién se interesó en mi búsqueda", lo más nuevo
-- primero, en la pestaña de la persona.
create index project_interests_project_idx
  on public.project_interests (project_id, created_at desc)
  where verdict = 'interest';

create index project_interests_professional_idx
  on public.project_interests (professional_id, created_at desc);

alter table public.project_interests enable row level security;
alter table public.project_interests force row level security;

revoke all on public.project_interests from anon, authenticated;
grant select, insert, delete on public.project_interests to authenticated;

-- Sin UPDATE: cambiar de opinión es borrar y volver a decidir, y así la
-- búsqueda vuelve al mazo en vez de quedar en un estado intermedio.

-- Las dos partes, y cada una ve lo suyo. La asimetría es el punto: el artista
-- ve todas sus decisiones —las necesita para que el mazo no se repita— y la
-- persona ve **solo los intereses**. Nadie recibe la noticia de que la pasaron
-- de largo.
create policy project_interests_select_professional on public.project_interests
  for select to authenticated
  using (
    exists (
      select 1 from public.professionals pro
      where pro.id = project_interests.professional_id
        and pro.owner_user_id = (select auth.uid())
    )
  );

create policy project_interests_select_seeker on public.project_interests
  for select to authenticated
  using (
    verdict = 'interest'
    and exists (
      select 1 from public.projects p
      where p.id = project_interests.project_id
        and p.user_id = (select auth.uid())
    )
  );

-- Tres condiciones, y ninguna sobra: el profesional tiene que ser mío y estar
-- publicado, y la búsqueda tiene que estar abierta. Sin la tercera, alguien
-- podría mandar interés a una búsqueda privada adivinando el uuid, y la
-- persona vería aparecer un artista sobre algo que nunca publicó.
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
  );

-- El artista deshace la suya. Una decisión de una décima de segundo se
-- equivoca, y sin deshacer el mazo castiga el error mandándole a una persona
-- un interés que no era — o perdiendo para siempre una búsqueda que sí era.
create policy project_interests_delete_own on public.project_interests
  for delete to authenticated
  using (
    exists (
      select 1 from public.professionals pro
      where pro.id = project_interests.professional_id
        and pro.owner_user_id = (select auth.uid())
    )
  );

-- Y la persona limpia su bandeja. Solo intereses: un `pass` no es suyo, no lo
-- ve, y borrarlo solo lograría que esa búsqueda le vuelva a aparecer al
-- artista que ya la descartó.
create policy project_interests_delete_by_seeker on public.project_interests
  for delete to authenticated
  using (
    verdict = 'interest'
    and exists (
      select 1 from public.projects p
      where p.id = project_interests.project_id
        and p.user_id = (select auth.uid())
    )
  );

-- Mismo criterio que `enforce_message_rate`: el límite no está para castigar a
-- nadie, está para que un cliente comprometido no pueda barrer todas las
-- búsquedas abiertas en un minuto. El paso no cuenta —descartar rápido es el
-- uso normal del mazo—, solo el interés, que es lo que le llega a una persona.
create or replace function public.enforce_interest_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recientes integer;
begin
  if new.verdict <> 'interest' then
    return new;
  end if;

  select count(*) into recientes
  from public.project_interests
  where professional_id = new.professional_id
    and verdict = 'interest'
    and created_at > now() - interval '1 hour';

  if recientes >= 30 then
    raise exception 'Demasiadas búsquedas seguidas. Probá de nuevo en un rato.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger project_interests_rate_limit
  before insert on public.project_interests
  for each row execute function public.enforce_interest_rate();

-- --- el mazo del artista ------------------------------------------------------

-- SECURITY DEFINER, al revés que `get_discovery_feed`, que es INVOKER.
--
-- La diferencia es deliberada y es el corazón de esta migración: el mazo de
-- obra muestra filas que quien llama ya puede leer, así que alcanza con correr
-- con sus permisos. Acá pasa lo contrario — un artista NO puede leer
-- `projects` de otra persona, y no queremos que pueda. Lo que se expone no es
-- la tabla: es esta proyección, columna por columna, elegida a mano.
--
-- Lo que NO devuelve, y es lo importante: `user_id`. Sin eso, una búsqueda es
-- una idea sin dueño hasta que su dueña decida aparecer.
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
    and (p_cursor is null or pr.created_at < p_cursor)
  order by pr.created_at desc, pr.id
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.get_open_search_feed(text, integer, timestamptz)
  from public, anon;
grant execute on function public.get_open_search_feed(text, integer, timestamptz)
  to authenticated;

comment on function public.get_open_search_feed is
  'El mazo del artista: búsquedas abiertas que piden algún estilo que hace. Sin identidad de quien busca.';

-- --- lo que la persona ve -----------------------------------------------------

-- El espejo del feed: quién levantó la mano, con el perfil del artista. Acá la
-- identidad SÍ va completa —es la parte que se está ofreciendo— y por eso no
-- hace falta DEFINER: `professionals` publicados los puede leer cualquiera.
create or replace function public.get_search_interests(
  p_project_id uuid default null
)
returns table (
  interest_id uuid,
  project_id uuid,
  project_title text,
  professional_id uuid,
  professional_slug text,
  professional_display_name text,
  created_at timestamptz
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    pi.id,
    p.id,
    p.title,
    pro.id,
    pro.slug::text,
    pro.display_name,
    pi.created_at
  from public.project_interests pi
  join public.professionals pro on pro.id = pi.professional_id
  join public.projects p on p.id = pi.project_id
  -- Sin id, todas las búsquedas propias. Es lo que necesita la pestaña de la
  -- persona, que no razona por proyecto sino por "quién me escribió".
  where (p_project_id is null or pi.project_id = p_project_id)
    -- Los dos predicados son redundantes con las políticas, y están escritos
    -- igual: si algún día alguien afloja una, esta consulta no se abre sola.
    and pi.verdict = 'interest'
    and p.user_id = (select auth.uid())
  order by pi.created_at desc;
$$;

revoke all on function public.get_search_interests(uuid) from public, anon;
grant execute on function public.get_search_interests(uuid) to authenticated;

comment on function public.get_search_interests is
  'Los artistas que levantaron la mano ante una búsqueda propia. Sin argumento, ante todas.';

-- --- las fotos de referencia --------------------------------------------------

-- Sin esto el feed devuelve rutas que el artista no puede abrir, y el mazo
-- queda con tarjetas sin imagen — que en un producto visual es no tener nada.
--
-- La política existente ("references: leer solo lo propio") no se toca. Esta se
-- suma, y es angosta a propósito: el objeto tiene que colgar de una búsqueda
-- ABIERTA, y quien lo pide tiene que tener un perfil publicado. Una búsqueda
-- que se cierra vuelve a ser privada en la siguiente lectura, sin migrar nada.
-- Y otra vez la misma trampa que con `is_search_open`, ahora en storage: un
-- artista no puede leer `media_assets`, `project_references` ni `projects` de
-- otra persona, así que una política que pregunte por `exists (...)` sobre esas
-- tablas se evalúa con SUS permisos y siempre da falso. La política quedaba
-- muda y el mazo sin imágenes.
--
-- El primer intento tenía justo ese bug, y lo encontró el test de integración
-- —no el de pgTAP—: adentro de Postgres la consulta se ve impecable, y lo que
-- falla es storage devolviendo "Object not found" al firmar.
create or replace function public.is_open_search_reference(p_path text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.media_assets m
    join public.project_references prf on prf.media_id = m.id
    join public.projects p on p.id = prf.project_id
    where m.bucket = 'references'
      and m.path = p_path
      and p.is_open_to_professionals
  );
$$;

revoke all on function public.is_open_search_reference(text) from public, anon;
grant execute on function public.is_open_search_reference(text) to authenticated;

comment on function public.is_open_search_reference is
  'Un booleano sobre una ruta que quien pregunta ya tiene. Lo usa la política de lectura del bucket references.';

create policy "references: leer las de búsquedas abiertas"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'references'
    -- El orden importa para el costo, no para la seguridad: primero "¿sos
    -- artista?", que es un índice, y recién después el join por ruta.
    and exists (
      select 1 from public.professionals pro
      where pro.owner_user_id = (select auth.uid())
        and pro.is_published
    )
    and public.is_open_search_reference(objects.name)
  );
