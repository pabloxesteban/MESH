-- professionals: la oferta. Curada en V1.
--
-- No existe `ProfessionalProfile` como tabla aparte: una partición 1:1 agrega
-- un join, un segundo juego de políticas y una clase de bugs de "falta la fila
-- de perfil" a cambio de nada. La separación que sí importa —un *usuario* no es
-- un *profesional*— vive en `owner_user_id`, que es nullable porque en V1 todo
-- el catálogo es curado y sin reclamar. Ver ADR-003.
--
-- El cliente solo lee. No hay flujo de reclamo en V1, así que no hay grant de
-- escritura ni políticas de escritura. `owner_user_id` existe para que agregar
-- ese flujo después sea una política nueva y no una migración de datos.

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  -- SET NULL: si quien reclamó el perfil borra su cuenta, el perfil curado
  -- vuelve a estar sin reclamar. Borrar la cuenta no puede borrar el catálogo.
  owner_user_id uuid references public.profiles(id) on delete set null,
  category_id uuid not null references public.categories(id) on delete restrict,
  -- citext: los deep links `mesh://artist/{slug}` no deberían depender de cómo
  -- el sistema operativo capitalizó lo que alguien pegó.
  slug extensions.citext not null unique,
  display_name text not null check (length(display_name) between 1 and 80),
  bio text check (bio is null or length(bio) between 1 and 1000),
  location_id uuid references public.locations(id) on delete set null,
  travels boolean not null default false,

  price_min_cents integer check (price_min_cents >= 0),
  price_max_cents integer check (price_max_cents >= 0),
  price_currency char(3) check (price_currency ~ '^[A-Z]{3}$'),
  priced_at date,

  availability_status public.availability_status,
  availability_updated_at date,

  instagram_handle text check (instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  whatsapp_e164 text check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),

  avatar_media_id uuid references public.media_assets(id) on delete set null,
  hero_media_id uuid references public.media_assets(id) on delete set null,

  is_published boolean not null default false,
  is_fixture boolean not null default false,
  claimed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Un precio sin fecha no es información: en Argentina, un rango de hace ocho
  -- meses es un número inventado. O están las cuatro columnas, o ninguna.
  constraint professionals_price_complete check (
    (price_min_cents is null
      and price_max_cents is null
      and price_currency is null
      and priced_at is null)
    or (price_min_cents is not null
      and price_max_cents is not null
      and price_currency is not null
      and priced_at is not null
      and price_min_cents <= price_max_cents)
  ),

  -- Misma regla para disponibilidad: sin fecha no podemos saber si está vieja,
  -- y afirmar una disponibilidad que no podemos sostener es la misma clase de
  -- error que inventar una reseña. Ver ADR-005.
  constraint professionals_availability_complete check (
    (availability_status is null and availability_updated_at is null)
    or (availability_status is not null and availability_updated_at is not null)
  ),

  -- Un profesional publicado al que no se puede contactar es un callejón sin
  -- salida: la única acción de la app es escribirle.
  constraint professionals_published_is_contactable check (
    not is_published
    or instagram_handle is not null
    or whatsapp_e164 is not null
  ),

  constraint professionals_claimed_has_owner check (
    (claimed_at is null) = (owner_user_id is null)
  )
);

comment on table public.professionals is
  'Oferta. V1: catálogo curado, escrito solo por tools/seed con service role.';

comment on column public.professionals.is_fixture is
  'Contenido de prueba. El seeder rechaza fixtures en producción.';

create trigger professionals_set_updated_at
  before update on public.professionals
  for each row execute function public.set_updated_at();

-- Consulta detrás del índice: el catálogo publicado de una categoría, que es la
-- entrada tanto del matching como del feed.
create index professionals_category_published_idx
  on public.professionals (category_id)
  where is_published;

alter table public.professionals enable row level security;
alter table public.professionals force row level security;

revoke all on public.professionals from anon, authenticated;
grant select on public.professionals to authenticated;

-- Los no publicados no existen para el cliente: ni la fila, ni la respuesta que
-- delataría que el id es válido.
create policy professionals_select_published on public.professionals
  for select to authenticated
  using (is_published);

-- --- professional_styles -----------------------------------------------------

create table public.professional_styles (
  professional_id uuid not null
    references public.professionals(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete restrict,
  proficiency numeric(4, 3) not null check (proficiency > 0 and proficiency <= 1),
  is_primary boolean not null default false,
  primary key (professional_id, style_id)
);

comment on table public.professional_styles is
  'Qué hace un artista y con cuánto peso. Entrada del componente de estilo del matching.';

-- Como mucho 3 estilos primarios por artista: si todo es primario, nada lo es.
--
-- Esto no se puede expresar con un CHECK (mira otras filas) ni con un índice
-- único (no cuenta). Un trigger AFTER por fila alcanza porque el invariante es
-- monótono: si cada insert deja el conteo en ≤3, nunca lo supera.
create or replace function public.enforce_primary_style_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  primary_count integer;
begin
  if not new.is_primary then
    return new;
  end if;

  select count(*) into primary_count
  from public.professional_styles
  where professional_id = new.professional_id and is_primary;

  if primary_count > 3 then
    raise exception
      'Como mucho 3 estilos primarios por profesional (% tiene %)',
      new.professional_id, primary_count
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- AFTER, por fila: el conteo tiene que incluir la fila recién insertada.
create trigger professional_styles_primary_cap
  after insert or update of is_primary on public.professional_styles
  for each row execute function public.enforce_primary_style_cap();

-- Consulta detrás del índice: "qué artistas hacen este estilo", el join que
-- arma el catálogo para el matching.
create index professional_styles_style_idx
  on public.professional_styles (style_id);

alter table public.professional_styles enable row level security;
alter table public.professional_styles force row level security;

revoke all on public.professional_styles from anon, authenticated;
grant select on public.professional_styles to authenticated;

-- Visible solo si el profesional es visible: si no, la tabla de estilos sería
-- un canal lateral que delata la existencia de artistas sin publicar.
create policy professional_styles_select_published on public.professional_styles
  for select to authenticated
  using (
    exists (
      select 1
      from public.professionals p
      where p.id = professional_styles.professional_id and p.is_published
    )
  );
