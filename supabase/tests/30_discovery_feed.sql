-- get_discovery_feed: orden, exclusión, diversidad y paginación.
--
-- Las cuatro propiedades de docs/product/matching.md §7. Ninguna es evidente
-- mirando la consulta, y las cuatro se rompen en silencio: un feed mal ordenado
-- sigue devolviendo obra.

begin;
select plan(10);

-- --- fixtures: 3 profesionales × 4 piezas ------------------------------------

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@example.test'),
  ('aaaaaaaa-0000-0000-0000-00000000000b', 'b@example.test');

insert into public.professionals (id, category_id, slug, display_name, instagram_handle, is_published)
select
  ('cccccccc-0000-0000-0000-00000000000' || n)::uuid,
  (select id from public.categories where slug = 'tattoo'),
  'artista-' || n, 'Artista ' || n, 'artista' || n, true
from generate_series(1, 3) as n;

insert into public.professionals (id, category_id, slug, display_name, instagram_handle, is_published)
select
  'cccccccc-0000-0000-0000-0000000000ff',
  (select id from public.categories where slug = 'tattoo'),
  'sin-publicar', 'Sin publicar', 'sinpublicar', false;

insert into public.media_assets (id, bucket, path, mime_type)
select
  ('bbbbbbbb-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  'portfolio', 'obra/' || n || '.jpg', 'image/jpeg'
from generate_series(1, 13) as n;

insert into public.portfolio_items (id, professional_id, media_id)
select
  ('dddddddd-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  ('cccccccc-0000-0000-0000-00000000000' || (((n - 1) % 3) + 1))::uuid,
  ('bbbbbbbb-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid
from generate_series(1, 12) as n;

-- Una pieza más, del profesional sin publicar.
insert into public.portfolio_items (id, professional_id, media_id)
values (
  'dddddddd-0000-0000-0000-0000000000ff',
  'cccccccc-0000-0000-0000-0000000000ff',
  'bbbbbbbb-0000-0000-0000-000000000013'
);

insert into public.portfolio_item_styles (portfolio_item_id, style_id, weight)
select
  ('dddddddd-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  (select id from public.styles where slug = 'fine-line'),
  1.0
from generate_series(1, 12) as n;

-- --- sin sesión --------------------------------------------------------------

set local role authenticated;

select is(
  (select count(*) from public.get_discovery_feed('tattoo', 50, null)),
  0::bigint,
  'Sin sesión el feed viene vacío — no hay camino de lectura sin auth.uid()'
);

-- --- como A ------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';

select is(
  (select count(*) from public.get_discovery_feed('tattoo', 50, null)),
  12::bigint,
  'El feed trae las 12 piezas publicadas y ninguna del profesional sin publicar'
);

select is_empty(
  $$
    select portfolio_item_id
    from public.get_discovery_feed('tattoo', 50, null)
    where portfolio_item_id = 'dddddddd-0000-0000-0000-0000000000ff'
  $$,
  'La obra de un profesional sin publicar no aparece'
);

select is(
  (select count(*) from public.get_discovery_feed('inexistente', 50, null)),
  0::bigint,
  'Una categoría que no existe devuelve vacío, no todo'
);

-- Diversidad: nunca dos piezas seguidas del mismo profesional.
select is_empty(
  $$
    select professional_id
    from (
      select
        professional_id,
        lag(professional_id) over (order by feed_cursor) as previous
      from public.get_discovery_feed('tattoo', 50, null)
    ) ordenado
    where professional_id = previous
  $$,
  'Nunca dos piezas consecutivas del mismo profesional'
);

-- Determinismo: dos llamadas idénticas devuelven el mismo orden. Si esto falla,
-- la paginación repite y saltea obra.
select results_eq(
  $$ select portfolio_item_id from public.get_discovery_feed('tattoo', 50, null) order by feed_cursor $$,
  $$ select portfolio_item_id from public.get_discovery_feed('tattoo', 50, null) order by feed_cursor $$,
  'Dos llamadas idénticas devuelven el mismo orden'
);

-- Paginación por cursor: dos páginas de 6 reconstruyen exactamente el feed.
select results_eq(
  $$
    select portfolio_item_id from public.get_discovery_feed('tattoo', 6, null)
    union all
    select portfolio_item_id from public.get_discovery_feed(
      'tattoo', 6,
      (select max(feed_cursor) from public.get_discovery_feed('tattoo', 6, null))
    )
  $$,
  $$ select portfolio_item_id from public.get_discovery_feed('tattoo', 50, null) $$,
  'Dos páginas de 6 reconstruyen el feed completo, sin repetir ni saltear'
);

-- Exclusión: lo que ya vi no vuelve.
insert into public.interactions (user_id, portfolio_item_id, verdict, source)
select
  'aaaaaaaa-0000-0000-0000-00000000000a',
  portfolio_item_id,
  'like', 'discover'
from public.get_discovery_feed('tattoo', 4, null);

select is(
  (select count(*) from public.get_discovery_feed('tattoo', 50, null)),
  8::bigint,
  'Las piezas ya vistas no vuelven al mazo'
);

-- Y el orden del resto no se movió: la profundidad se calcula antes de
-- descartar lo visto, así que interactuar no corre la numeración.
select is(
  (select feed_cursor from public.get_discovery_feed('tattoo', 1, null)),
  (select feed_cursor from public.get_discovery_feed('tattoo', 50, null) offset 0 limit 1),
  'El cursor de la primera pieza restante es estable'
);

-- --- como B: otro orden ------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000b","role":"authenticated"}';

select isnt(
  (select string_agg(portfolio_item_id::text, ',' order by feed_cursor)
   from public.get_discovery_feed('tattoo', 50, null)),
  (select string_agg(id::text, ',' order by id)
   from public.portfolio_items
   where professional_id <> 'cccccccc-0000-0000-0000-0000000000ff'),
  'El orden de B no es el orden natural de los ids — la mezcla está haciendo algo'
);

reset role;
select * from finish();
rollback;
