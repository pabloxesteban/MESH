-- Lo más guardado, y que el artista se entere.
--
-- Esto **enmienda [ADR-016](../../docs/decisions/ADR-016-saved-items.md)**, que
-- decidió lo contrario hace un día: nada de contadores, nada de ranking, nada
-- de avisos. Fue una decisión de producto explícita revertirlo. Ver ADR-017.
--
-- Lo que ADR-016 quería evitar sigue evitado en la parte que importa de verdad:
--
-- **El artista nunca sabe QUIÉN guardó su obra.** Ninguna de las dos funciones
-- devuelve `user_id`, y la política de `saved_items` sigue sin dejar leer una
-- fila ajena. Se abre el AGREGADO, no la identidad. Lo primero es una señal de
-- demanda; lo segundo es decirle a un artista quién lo está mirando, que es
-- otra cosa y nadie la pidió.
--
-- Las dos funciones son `security definer` porque tienen que contar filas que
-- quien pregunta no puede leer — que es exactamente el punto. Por eso cada una
-- devuelve columnas elegidas a mano y ninguna acepta un filtro libre.

-- Consulta detrás del índice: las dos funciones de acá, que recortan por
-- ventana de tiempo antes de agrupar.
create index saved_items_created_idx on public.saved_items (created_at desc);

-- --- el ranking público -------------------------------------------------------

/**
 * Las obras más guardadas de una ventana.
 *
 * Devuelve el conteo, que es un hecho medido y no una estimación. No hay
 * puesto, ni medalla, ni "subió 3 lugares": el orden ya es el ranking, y lo
 * demás es la maquinaria que convierte una lista en un juego.
 */
create or replace function public.get_top_saved(
  p_category_slug text,
  p_since timestamptz,
  p_limit integer default 24
)
returns table (
  portfolio_item_id uuid,
  saves integer,
  professional_slug text,
  professional_display_name text,
  is_fixture boolean,
  media_path text,
  media_blurhash text,
  media_width integer,
  media_height integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pi.id,
    count(si.id)::int as saves,
    p.slug,
    p.display_name,
    p.is_fixture,
    ma.path,
    ma.blurhash,
    ma.width,
    ma.height
  from public.saved_items si
  join public.portfolio_items pi on pi.id = si.portfolio_item_id
  join public.professionals p on p.id = pi.professional_id
  join public.categories c on c.id = p.category_id
  join public.media_assets ma on ma.id = pi.media_id
  where si.created_at >= p_since
    -- Solo obra visible. Un ranking que incluya perfiles despublicados los
    -- resucita por la ventana de atrás.
    and p.is_published
    and c.slug = p_category_slug
  group by pi.id, p.slug, p.display_name, p.is_fixture,
           ma.path, ma.blurhash, ma.width, ma.height
  -- El id desempata para que dos obras con el mismo conteo no se intercambien
  -- de lugar entre dos consultas. Un ranking que baila sin que cambie nada se
  -- lee como roto.
  order by saves desc, pi.id
  limit least(greatest(p_limit, 1), 60);
$$;

revoke all on function public.get_top_saved(text, timestamptz, integer)
  from public, anon;
grant execute on function public.get_top_saved(text, timestamptz, integer)
  to authenticated;

comment on function public.get_top_saved is
  'Lo más guardado de una ventana. Agregado y sin identidades. Ver ADR-017.';

-- --- lo que ve el artista de SU obra ------------------------------------------

/**
 * Cuántas veces guardaron cada obra propia, y cuándo fue la última.
 *
 * `p_since` sirve para "qué pasó desde que miraste": la app guarda cuándo fue
 * la última visita y pregunta por lo nuevo. Así el artista se entera de cada
 * guardado sin que exista una tabla de avisos que después haya que limpiar.
 *
 * **Sin `user_id` en ninguna columna.** El artista ve que guardaron, no quién.
 */
create or replace function public.get_own_save_counts(
  p_since timestamptz default null
)
returns table (
  portfolio_item_id uuid,
  saves integer,
  saves_since integer,
  last_saved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pi.id,
    count(si.id)::int,
    count(si.id) filter (
      where p_since is null or si.created_at > p_since
    )::int,
    max(si.created_at)
  from public.portfolio_items pi
  join public.professionals p on p.id = pi.professional_id
  left join public.saved_items si on si.portfolio_item_id = pi.id
  -- El dueño y nadie más. Sin esto, `security definer` convertiría la función
  -- en una forma de contar los guardados de cualquiera.
  where p.owner_user_id = (select auth.uid())
  group by pi.id
  order by count(si.id) desc, pi.id;
$$;

revoke all on function public.get_own_save_counts(timestamptz) from public, anon;
grant execute on function public.get_own_save_counts(timestamptz) to authenticated;

comment on function public.get_own_save_counts is
  'Guardados de la obra PROPIA. Nunca dice quién guardó. Ver ADR-017.';

-- --- cuándo miró por última vez -----------------------------------------------

-- En `profiles` y no en `professionals`: es una preferencia de quien usa la
-- app, y `professionals` no tiene política de UPDATE para el cliente — todo lo
-- que el artista escribe sobre su fila pasa por una RPC.
alter table public.profiles
  add column saves_seen_at timestamptz;

comment on column public.profiles.saves_seen_at is
  'Última vez que el artista miró sus guardados. Ver ADR-017.';

create or replace function public.mark_saves_seen()
returns timestamptz
language sql
volatile
security invoker
set search_path = ''
as $$
  update public.profiles
  set saves_seen_at = now()
  where id = (select auth.uid())
  returning saves_seen_at;
$$;

revoke all on function public.mark_saves_seen() from public, anon;
grant execute on function public.mark_saves_seen() to authenticated;

comment on function public.mark_saves_seen is
  'Marca los guardados como vistos. `security invoker`: escribe la fila propia y RLS alcanza.';
