-- get_discovery_feed: el mazo, en un solo round trip.
--
-- Por qué es un RPC y no tres queries: el mazo necesita la pieza, su media, su
-- profesional y sus estilos, filtrado por lo que ya vi, mezclado, y con
-- diversidad. Del lado del cliente eso sería bajar el catálogo entero para
-- descartar la mayor parte.
--
-- SECURITY INVOKER, no DEFINER. Corre con los permisos de quien llama, así que
-- las políticas RLS de portfolio_items, professionals e interactions se aplican
-- adentro. Los predicados explícitos que igual están escritos abajo son
-- redundantes a propósito: si algún día alguien afloja una política, la
-- consulta no se abre sola.
--
-- El orden, definido en docs/product/matching.md §7:
--   1. Piezas publicadas de la categoría, sin interacción previa.
--   2. Mezcla determinística por usuario — cada persona ve un orden propio y
--      estable, y la paginación nunca repite ni saltea.
--   3. Diversidad: nunca dos piezas seguidas del mismo profesional.
--
-- El punto 3 se resuelve **repartiendo cada profesional a lo largo de todo el
-- feed**, no por vueltas.
--
-- La versión anterior era un round robin por profundidad: todas las primeras
-- obras, después todas las segundas. Funciona perfecto mientras todos tengan la
-- misma cantidad de obra, y se rompe apenas no la tienen — que es siempre. Con
-- artistas de 5, 6 y 4 piezas, el que tiene más se queda solo al final y
-- aparece dos veces seguidas. El test de pgTAP no lo veía porque usaba tres
-- artistas con cuatro piezas cada uno; lo encontró el test de integración,
-- contra el contenido real.
--
-- Lo que se hace ahora: a la obra número `i` de un profesional con `n` piezas se
-- le asigna la posición `(i - 0,5) / n`. Un artista con seis piezas se reparte
-- sobre todo el recorrido, uno con cuatro también, y el orden global sale
-- intercalado sin que nadie se agrupe en ninguna punta.
--
-- Sigue sin poder garantizarse lo imposible: cuando queda obra sin ver de un
-- solo profesional, dos piezas seguidas de esa persona son inevitables. La
-- garantía real, y la que verifican los tests, es que **no haya repeticiones
-- adyacentes evitables** — o sea, mientras más de un profesional tenga obra
-- pendiente.
--
-- Tanto la posición como el total se calculan sobre TODAS las piezas
-- publicadas, antes de descartar las ya vistas. Si se calcularan después, cada
-- me gusta correría la numeración de todo lo que sigue y la paginación por
-- cursor empezaría a saltear obra.

create or replace function public.get_discovery_feed(
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
