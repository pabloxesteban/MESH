-- El orden de Inicio se remezcla en cada sesión.
--
-- Hasta hoy la grilla ordenaba por `md5(user_id || professional_id)`: una
-- mezcla **estable por persona**. Cada uno veía un orden distinto del de al
-- lado, sí, pero **siempre el mismo orden**, para siempre. Para un artista eso
-- significa que hay un grupo de personas que nunca lo van a ver primero y otro
-- que siempre sí, sorteado el día que se registraron y sin revancha. En un
-- catálogo de quince eso es la diferencia entre conseguir trabajo y no.
--
-- Ahora la mezcla la siembra el cliente, con una semilla que dura lo que dura
-- la sesión. Dos consecuencias, y las dos son buscadas:
--
-- · **Ningún artista queda clavado arriba.** Cerrás y abrís, y el orden es otro.
-- · **Mientras estás adentro, el orden no se mueve.** La semilla es la misma en
--   toda la sesión, así que volver de un perfil no te reordena la lista bajo
--   los dedos. Una lista que se rebaraja sola mientras la mirás es peor que una
--   clavada.
--
-- Lo que **no** cambia: el orden final por cercanía sigue siendo del dominio, y
-- sigue sin filtrar a nadie. Esta mezcla decide los empates, no la lista. Ver
-- `packages/domain/src/geo/proximity.ts`, que desde hoy ordena por anillo de
-- distancia justamente para que haya empates que decidir.

-- Se dropea la de tres argumentos antes de crear la de cuatro.
--
-- `create or replace` con una firma distinta **no reemplaza: sobrecarga**, y
-- deja dos funciones con el mismo nombre. El síntoma no es sutil pero llega
-- tarde: el `comment on` de abajo falla con "function name is not unique", y si
-- no fallara, cada cliente estaría llamando a una versión distinta según cuántos
-- argumentos mande.
drop function if exists public.get_artist_grid(text, integer, integer);

create or replace function public.get_artist_grid(
  p_category_slug text,
  p_limit integer default 100,
  p_pieces integer default 6,
  -- La semilla de la sesión. `null` cae al comportamiento viejo —mezcla estable
  -- por usuario— para que un cliente sin actualizar siga funcionando.
  p_seed text default null
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
    -- A quien bloqueaste no lo volvés a ver.
    and not exists (
      select 1 from public.blocks b
      where b.blocker_user_id = v.user_id
        and b.blocked_professional_id = p.id
    )
  order by md5(coalesce(p_seed, v.user_id::text) || p.id::text)
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

comment on function public.get_artist_grid(text, integer, integer, text) is
  'Los artistas publicados con obra, mezclados con la semilla de la sesión. El orden por cercanía lo hace packages/domain. Ver D-010 y ADR-030.';

revoke all on function public.get_artist_grid(text, integer, integer, text)
  from public, anon;
grant execute on function public.get_artist_grid(text, integer, integer, text)
  to authenticated;
