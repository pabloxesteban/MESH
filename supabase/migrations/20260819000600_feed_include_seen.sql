-- El feed, ahora también para una grilla que se recorre.
--
-- Descubrir deja de ser una sola cosa. El mazo sigue siendo el mazo —una obra
-- por vez, y lo decidido no vuelve— y al lado aparece una grilla que se
-- recorre, se compara y se filtra. Ver
-- docs/design/MESH-VISUAL-DIRECTION-2.md.
--
-- Esconder lo ya visto es correcto en un mazo y es un error en una grilla. En
-- el mazo, una obra que vuelve después de que la marcaste es una decisión que
-- no se respetó. En una grilla es al revés: alguien que dio me gusta a treinta
-- obras abriría Descubrir y no encontraría **ninguna** de ellas, que es
-- exactamente lo contrario de "explorar".
--
-- Por eso el filtro pasa a ser un parámetro y no una regla del RPC: quien
-- pregunta sabe qué superficie es.
--
-- `drop` y no un overload: dos funciones con el mismo nombre y distinta
-- cantidad de argumentos dejan a PostgREST eligiendo por forma del payload, y
-- una llamada vieja seguiría funcionando en silencio contra la versión vieja.
-- Ver el mismo criterio en `set_studio_location`.

drop function if exists public.get_discovery_feed(text, integer, text);

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

comment on function public.get_discovery_feed is
  'Descubrimiento paginado por cursor. Con p_include_seen, la grilla; sin él, el mazo. Ver docs/product/matching.md §7.';

-- `public` incluye a `anon`. Solo se ejecuta con sesión, aunque sea anónima.
revoke all on function
  public.get_discovery_feed(text, integer, text, boolean)
  from public, anon;
grant execute on function
  public.get_discovery_feed(text, integer, text, boolean)
  to authenticated;
