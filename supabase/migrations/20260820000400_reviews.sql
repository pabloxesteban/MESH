-- Reseñas: la garantía que mira alguien antes de tatuarse con un desconocido.
--
-- Ver ADR-019.
--
-- ## Las cuatro decisiones que definen la forma
--
-- 1. **Una reseña cuelga de un TURNO, no de un artista.** Es lo que hace que
--    esto sea evidencia y no opinión: la fila existe porque hubo un turno, ese
--    turno tenía fecha, y esa fecha ya pasó. Sin el turno de por medio,
--    "reseñas" es un formulario público y termina siendo el lugar donde se pelea
--    gente que nunca se conoció.
--
-- 2. **Solo reseña quien estuvo, y una vez por turno.** Alguien que se tatuó
--    tres veces con la misma artista deja tres reseñas, una por vez, y eso es
--    correcto: son tres experiencias. Lo que no puede es dejar dos por la misma.
--
-- 3. **La reseña es del cliente y el artista no la toca.** Ni la escribe, ni la
--    edita, ni la borra, ni la responde. Lo último es una decisión de producto
--    que quedó afuera a propósito — ver ADR-019.
--
-- 4. **Un turno que ya pasó no se puede cancelar.** Suena de almanaque y es de
--    reseñas: si cancelar el pasado fuera posible, un artista borraría una
--    reseña mala cancelando el turno del que nació. Esto enmienda
--    [ADR-018](../../docs/decisions/ADR-018-availability.md), que no lo había
--    previsto.
--
-- ## Lo que NO está acá
--
-- **Nada de promedios guardados.** El promedio se calcula al leer. Un contador
-- denormalizado es un número que se desincroniza en silencio, y el número que
-- MESH muestra sobre una persona tiene que ser cierto.

-- --- el bucket de las fotos ---------------------------------------------------
--
-- Público para leer, igual que `portfolio`: la foto de una reseña se muestra en
-- un perfil público, y firmar cada una sería un round trip por imagen. Escribe
-- el dueño en su propia carpeta, igual que `references` y `avatars`.
--
-- Sin SVG, como en todos: un SVG es un documento ejecutable servido desde
-- nuestro dominio.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reviews', 'reviews', true, 12582912,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "reviews: lectura para cualquier sesión"
  on storage.objects for select to authenticated
  using (bucket_id = 'reviews');

create policy "reviews: escribir solo en la carpeta propia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reviews'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Sin UPDATE, como en el resto: reemplazar una foto es subir otra y borrar la
-- vieja. Un update cambia los bytes debajo de una fila de `media_assets` que ya
-- registró tamaño y tipo.

create policy "reviews: borrar solo lo propio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'reviews'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- La otra mitad de la subida: la fila. `media_assets_insert_own` excluye
-- `portfolio` y `reviews` no estaba en ningún lado, así que sin esto la foto se
-- sube y la fila se rechaza.
create policy media_assets_insert_own_review on public.media_assets
  for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and bucket = 'reviews'
    -- La primera carpeta de la ruta es el id de quien sube, igual que en
    -- storage. Sin esto se podría registrar una fila que apunta al objeto de
    -- otra persona.
    and split_part(media_assets.path, '/', 1) = (select auth.uid())::text
  );

-- El bucket también es un valor permitido de `media_assets.bucket`. La lista
-- está en un check y no en una FK contra `storage.buckets` a propósito —ver
-- 20260817000400_media.sql— así que agregar un bucket es agregarlo en los dos
-- lados.
alter table public.media_assets
  drop constraint media_assets_bucket_check;
alter table public.media_assets
  add constraint media_assets_bucket_check
  check (bucket in ('portfolio', 'references', 'avatars', 'reviews'));

-- --- la tabla -----------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),

  -- De qué turno salió. **Único**: una reseña por turno.
  --
  -- `cascade` y no `set null`: sin turno no hay reseña. Es la diferencia entre
  -- esto y una caja de comentarios, y dejarla huérfana la borraría.
  appointment_id uuid not null unique
    references public.appointments (id) on delete cascade,

  -- Los dos se copian del turno al crear la reseña, y la política verifica que
  -- coincidan. Están acá para que leer las reseñas de un perfil no tenga que
  -- pasar por `appointments`, que nadie más que las partes puede leer.
  professional_id uuid not null
    references public.professionals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,

  -- De 1 a 5. Es lo único obligatorio: es lo que se puede promediar, y una
  -- reseña sin estrellas obligaría a interpretar un texto.
  rating smallint not null check (rating between 1 and 5),

  -- El comentario, opcional. Un campo obligatorio se llena con "todo bien".
  body text check (body is null or length(body) between 1 and 1000),

  -- La foto del tatuaje ya hecho, opcional. Es la parte más útil de una reseña
  -- de tatuaje y la más difícil de falsificar.
  media_id uuid references public.media_assets (id) on delete set null,

  created_at timestamptz not null default now(),
  -- Se llena solo si la reseña se editó, y la pantalla lo dice. Una reseña que
  -- se puede reescribir sin que se note es peor evidencia que una que no se
  -- puede editar.
  updated_at timestamptz
);

comment on table public.reviews is
  'Una reseña, colgada del turno que la habilita. Ver ADR-019.';

-- Consulta detrás del índice: las reseñas de un perfil, de la más nueva a la
-- más vieja.
create index reviews_professional_idx
  on public.reviews (professional_id, created_at desc);

-- Consulta detrás del índice: "¿ya reseñé este turno?", al dibujar el botón.
create index reviews_user_idx on public.reviews (user_id, created_at desc);

-- --- RLS ----------------------------------------------------------------------

alter table public.reviews enable row level security;
alter table public.reviews force row level security;

revoke all on public.reviews from anon, authenticated;
grant select, insert, update, delete on public.reviews to authenticated;

-- **De la TABLA, cada quien lee lo suyo.** Las reseñas se muestran públicas,
-- pero no desde acá: la fila lleva `user_id`, y una política que la abriera
-- publicaría quién dejó cada reseña.
--
-- Eso no es un detalle. La reseña de un tatuaje dice dónde estuvo una persona y
-- qué se hizo en el cuerpo; firmarla con su identidad tiene que ser una
-- decisión suya, y nadie la tomó. Lo que un futuro cliente necesita saber es
-- que **pasó** —que hubo un turno, con fecha— y eso se muestra sin decir de
-- quién fue.
--
-- Leer las de un perfil va por `get_reviews()`, que devuelve columnas elegidas
-- a mano. Mismo patrón que `get_busy_slots` y `get_top_saved`.
create policy reviews_select_own on public.reviews
  for select to authenticated
  using (user_id = (select auth.uid()));

-- **El candado.** Escribir una reseña exige un turno propio, con ese artista,
-- agendado (no cancelado) y **terminado**.
--
-- Está en la política y no en una función a propósito: es un predicado, entra
-- entero, y una política se lee en el mismo lugar donde alguien va a buscar
-- "quién puede escribir esto". Los invariantes que no caben en un `with check`
-- —los de `schedule_appointment`— son otros.
create policy reviews_insert_after_appointment on public.reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.appointments a
      where a.id = reviews.appointment_id
        and a.user_id = (select auth.uid())
        and a.professional_id = reviews.professional_id
        and a.status = 'scheduled'
        -- Ya pasó. No hay estado "completado" que marcar —ver ADR-018— así que
        -- "pasó" es que su fin quedó atrás.
        and a.ends_at < now()
    )
    -- Si adjunta foto, tiene que ser suya. Sin esto se podría colgar de una
    -- reseña la imagen de cualquiera.
    and (
      media_id is null
      or exists (
        select 1 from public.media_assets m
        where m.id = reviews.media_id
          and m.owner_user_id = (select auth.uid())
          and m.bucket = 'reviews'
      )
    )
  );

-- Editar: solo la autora, y solo lo que dijo. Las columnas que atan la reseña a
-- su turno las congela un trigger — un `with check` no puede compararse contra
-- la fila vieja.
create policy reviews_update_own on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      media_id is null
      or exists (
        select 1 from public.media_assets m
        where m.id = reviews.media_id
          and m.owner_user_id = (select auth.uid())
          and m.bucket = 'reviews'
      )
    )
  );

create policy reviews_delete_own on public.reviews
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- El artista no aparece en ninguna política de escritura, y es lo más
-- importante de este archivo: no puede escribir una reseña sobre sí mismo, ni
-- editar la que le dejaron, ni borrarla.

-- --- lo que no se puede mover -------------------------------------------------

/**
 * Congela de qué turno salió una reseña.
 *
 * Sin esto, editar sería mover: alguien cambia `appointment_id` y una reseña
 * escrita para un artista aparece en el perfil de otro. El `with check` de la
 * política no alcanza porque no ve la fila vieja.
 */
create or replace function public.reviews_freeze_origin()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.appointment_id is distinct from old.appointment_id
    or new.professional_id is distinct from old.professional_id
    or new.user_id is distinct from old.user_id then
    raise exception 'una reseña no se puede mover de turno'
      using errcode = '42501';
  end if;

  -- Lo pone la base y no el cliente: "editada" es un hecho, no algo que quien
  -- edita decide declarar.
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_freeze_origin
  before update on public.reviews
  for each row execute function public.reviews_freeze_origin();

-- --- el promedio, calculado ---------------------------------------------------

/**
 * Cuántas reseñas tiene un artista y de cuánto es su promedio.
 *
 * Devuelve `null` en el promedio cuando no hay ninguna, y la pantalla lo dice
 * con palabras. Un 0 acá se dibujaría como cero estrellas, que es una opinión
 * que nadie dio.
 */
create or replace function public.get_review_summary(p_professional_id uuid)
returns table (reviews_count integer, average numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(r.id)::int,
    round(avg(r.rating), 1)
  from public.professionals p
  left join public.reviews r on r.professional_id = p.id
  -- Solo de un perfil publicado. Sin esto, `security definer` convertiría la
  -- función en una forma de contar las reseñas de un perfil despublicado.
  where p.id = p_professional_id and p.is_published;
$$;

revoke all on function public.get_review_summary(uuid) from public, anon;
grant execute on function public.get_review_summary(uuid) to authenticated;

comment on function public.get_review_summary is
  'Conteo y promedio de reseñas. Se calcula al leer, nunca se guarda. Ver ADR-019.';

/**
 * Las reseñas de un perfil, para mostrarlas.
 *
 * **Sin `user_id` en ninguna columna.** Devuelve lo que hace falta para que
 * alguien decida: cuántas estrellas, qué dijo, la foto si la hay, cuándo fue el
 * turno y cuándo se escribió. Quién la escribió no entra.
 *
 * `fue` es la fecha del turno y no la de la reseña: lo que da garantía es que
 * hubo un turno, y una reseña escrita tres semanas después del tatuaje sigue
 * siendo sobre ese día.
 */
create or replace function public.get_reviews(
  p_professional_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  rating smallint,
  body text,
  media_path text,
  appointment_ends_at timestamptz,
  created_at timestamptz,
  edited boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.rating,
    r.body,
    m.path,
    a.ends_at,
    r.created_at,
    r.updated_at is not null
  from public.reviews r
  join public.professionals p on p.id = r.professional_id
  join public.appointments a on a.id = r.appointment_id
  left join public.media_assets m on m.id = r.media_id
  where r.professional_id = p_professional_id
    and p.is_published
  order by r.created_at desc, r.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.get_reviews(uuid, integer, integer)
  from public, anon;
grant execute on function public.get_reviews(uuid, integer, integer)
  to authenticated;

comment on function public.get_reviews is
  'Las reseñas de un perfil, sin decir quién las escribió. Ver ADR-019.';

-- --- el pasado no se cancela --------------------------------------------------

/**
 * Enmienda a `cancel_appointment` de ADR-018.
 *
 * Se agrega una condición: **un turno que ya terminó no se cancela.** El motivo
 * es de reseñas, no de almanaque — `reviews.appointment_id` tiene `on delete
 * cascade` y la política de inserción exige `status = 'scheduled'`, así que sin
 * esto un artista podría hacer desaparecer una reseña mala cancelando el turno
 * del que nació.
 *
 * Además es correcto por sí solo: cancelar es liberar un horario, y un horario
 * que ya pasó no se libera. Lo que se cancelaba antes de que empiece se sigue
 * cancelando igual.
 */
create or replace function public.cancel_appointment(p_appointment_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ends_at timestamptz;
begin
  select a.ends_at into v_ends_at
  from public.appointments a
  left join public.professionals p on p.id = a.professional_id
  where a.id = p_appointment_id
    and a.status = 'scheduled'
    and (
      a.user_id = (select auth.uid())
      or p.owner_user_id = (select auth.uid())
    );

  if v_ends_at is null then
    raise exception 'no se puede cancelar este turno' using errcode = '42501';
  end if;

  -- Un mensaje propio: "no se puede cancelar este turno" a secas haría pensar
  -- que el turno no es suyo, y lo que pasa es otra cosa.
  if v_ends_at < now() then
    raise exception 'un turno que ya pasó no se cancela'
      using errcode = '22023';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = (select auth.uid())
  where id = p_appointment_id;
end;
$$;

comment on function public.cancel_appointment is
  'Cancela un turno futuro, de cualquiera de las dos partes. El pasado no se cancela: sería la forma de borrar una reseña. Ver ADR-019.';

-- --- los turnos que se pueden reseñar -----------------------------------------

/**
 * Los turnos propios que ya pasaron y todavía no tienen reseña.
 *
 * Existe para dibujar el botón sin pedirle a la app que repita el candado de la
 * política. La lógica de "quién puede reseñar" vive en un solo lugar; esto la
 * consulta.
 *
 * `security invoker`: los turnos propios ya son legibles, y las reseñas de un
 * perfil publicado también.
 */
create or replace function public.get_reviewable_appointments()
returns table (
  appointment_id uuid,
  professional_id uuid,
  professional_slug text,
  professional_display_name text,
  conversation_id uuid,
  ends_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.id, a.professional_id, p.slug, p.display_name, a.conversation_id,
         a.ends_at
  from public.appointments a
  join public.professionals p on p.id = a.professional_id
  where a.user_id = (select auth.uid())
    and a.status = 'scheduled'
    and a.ends_at < now()
    and not exists (
      select 1 from public.reviews r where r.appointment_id = a.id
    )
  order by a.ends_at desc;
$$;

revoke all on function public.get_reviewable_appointments() from public, anon;
grant execute on function public.get_reviewable_appointments() to authenticated;

comment on function public.get_reviewable_appointments is
  'Turnos propios ya pasados y sin reseñar. Ver ADR-019.';
