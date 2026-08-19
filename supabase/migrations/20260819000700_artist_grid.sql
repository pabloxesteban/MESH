-- La grilla de artistas: cómo alguien ve a los tatuadores cerca suyo.
--
-- Es el nuevo Inicio. Reemplaza al mazo y a los encajes con algo mucho más
-- simple de explicar: **quién tatúa cerca tuyo, con una muestra de su trabajo.**
-- Ver docs/design/MESH-DESIGN-DECISIONS.md D-010.
--
-- Devuelve el artista con lo que hace falta para su tarjeta —nombre, avatar,
-- barrio, coordenadas del estudio— y hasta seis piezas para el carrusel. Un
-- round trip, no uno por artista.
--
-- **Lo que este RPC NO hace: ordenar.** La distancia se calcula en
-- `packages/domain` con `haversineKm`, que ya existe y está testeada, y el
-- orden sale de una función pura y versionada. Meter el orden acá lo dejaría
-- fuera del alcance de los tests unitarios y contra la regla de CLAUDE.md de
-- que lo que decide qué se muestra primero vive en el dominio.
--
-- Lo único que sí trae de orden es una mezcla estable por usuario, para el caso
-- sin ubicación: sin eso el orden sería el de inserción y los últimos en
-- registrarse quedarían últimos para siempre.

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
  -- Mezcla estable por usuario. Cada persona ve un orden propio y siempre el
  -- mismo; el orden final por cercanía lo hace el dominio.
  order by md5(v.user_id::text || p.id::text)
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

comment on function public.get_artist_grid is
  'Los artistas publicados con obra, cada uno con hasta N piezas para su carrusel. El orden por cercanía lo hace packages/domain. Ver D-010.';

revoke all on function public.get_artist_grid(text, integer, integer)
  from public, anon;
grant execute on function public.get_artist_grid(text, integer, integer)
  to authenticated;
