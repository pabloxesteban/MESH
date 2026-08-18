-- El mazo necesita saber si una pieza es de un registro de prueba.
--
-- Hasta ahora los fixtures se reconocían por el nombre: se llamaban
-- "[Fixture] Irezumi". Funcionaba, y ensuciaba todo lo que tocaba el nombre —
-- capturas, el mensaje de contacto precargado, los eventos de analytics.
--
-- La marca se movió del dato a la superficie: el nombre queda limpio y CADA
-- pantalla que muestra un fixture lo dice con una insignia. Para eso el feed
-- tiene que devolver la bandera, que antes solo salía en el perfil.
--
-- Se dropea y se recrea porque `create or replace` no puede cambiar las
-- columnas de salida de una función que devuelve una tabla.

drop function if exists public.get_discovery_feed(text, integer, text);

create function public.get_discovery_feed(
  p_category_slug text,
  p_limit integer default 12,
  p_cursor text default null
)
returns table (
  feed_cursor text,
  portfolio_item_id uuid,
  professional_id uuid,
  professional_slug text,
  professional_display_name text,
  professional_is_fixture boolean,
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
    where not exists (
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
    p.is_fixture as professional_is_fixture,
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
  'Mazo de descubrimiento paginado por cursor. Ver docs/product/matching.md §7.';

-- `public` incluye a `anon`. Solo se ejecuta con sesión, aunque sea anónima.
revoke all on function public.get_discovery_feed(text, integer, text)
  from public, anon;
grant execute on function public.get_discovery_feed(text, integer, text)
  to authenticated;
