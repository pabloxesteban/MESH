-- get_artist_grid: quién entra a la grilla de Inicio, y con qué.
--
-- Es el RPC del nuevo Inicio (ver docs/design/MESH-DESIGN-DECISIONS.md D-010).
-- Lo que importa verificar acá son tres cosas que se rompen sin hacer ruido:
--
-- · Quién aparece. Un artista sin publicar o sin una sola obra no puede
--   entrar, y uno publicado con obra no puede quedar afuera.
-- · Qué trae. El carrusel tiene un tope y las destacadas van primero; las
--   coordenadas y el barrio salen tal como están, sin rellenar.
-- · Qué **no** hace. No ordena por cercanía: eso vive en packages/domain y
--   tiene tests unitarios. Si algún día alguien mete la distancia acá, este
--   archivo se entera.

begin;
select plan(15);

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000e1', 'grid.a@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000e2', 'grid.b@example.test');

-- Publicado, con estudio ubicado y barrio.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   location_id, studio_lat, studio_lng)
select 'cccccccc-0000-0000-0000-0000000000e1', c.id, 'con-estudio', 'Con Estudio',
       'conestudio', true,
       (select id from public.locations where slug = 'palermo'),
       -34.5875, -58.4371
from public.categories c where c.slug = 'tattoo';

-- Publicado, sin ubicación de ninguna clase. Tiene que aparecer igual: no
-- publicar el estudio es voluntario y esconderlo sería un castigo.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000e2', c.id, 'sin-ubicacion',
       'Sin Ubicacion', 'sinubicacion', true
from public.categories c where c.slug = 'tattoo';

-- Publicado, pero sin una sola obra: su tarjeta saldría vacía.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000e3', c.id, 'sin-obra', 'Sin Obra',
       'sinobra', true
from public.categories c where c.slug = 'tattoo';

-- Con obra, pero sin publicar.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000e4', c.id, 'sin-publicar', 'Sin Publicar',
       'sinpublicargrid', false
from public.categories c where c.slug = 'tattoo';

insert into public.media_assets (id, bucket, path, mime_type, width, height)
select
  ('bbbbbbbb-0000-0000-0000-0000000000e' || n)::uuid,
  'portfolio', 'grid/' || n || '.jpg', 'image/jpeg', 800, 1000
from generate_series(1, 9) as n;

insert into public.media_assets (id, bucket, path, mime_type, width, height)
values ('bbbbbbbb-0000-0000-0000-0000000000ea', 'portfolio', 'grid/10.jpg',
        'image/jpeg', 800, 1000);

-- Ocho piezas para el primero: más que el tope del carrusel, a propósito.
insert into public.portfolio_items
  (id, professional_id, media_id, sort_order, is_featured)
select
  ('dddddddd-0000-0000-0000-0000000000e' || n)::uuid,
  'cccccccc-0000-0000-0000-0000000000e1',
  ('bbbbbbbb-0000-0000-0000-0000000000e' || n)::uuid,
  n,
  -- La octava es la destacada: si el tope cortara antes de ordenar, se
  -- perdería, que es exactamente el error que este fixture busca.
  n = 8
from generate_series(1, 8) as n;

-- Una imagen por pieza: portfolio_items tiene unique (media_id).
insert into public.portfolio_items (id, professional_id, media_id)
values
  ('dddddddd-0000-0000-0000-0000000000e9',
   'cccccccc-0000-0000-0000-0000000000e2',
   'bbbbbbbb-0000-0000-0000-0000000000e9'),
  ('dddddddd-0000-0000-0000-0000000000ea',
   'cccccccc-0000-0000-0000-0000000000e4',
   'bbbbbbbb-0000-0000-0000-0000000000ea');

-- --- sin sesión --------------------------------------------------------------

set local role authenticated;

select is(
  (select count(*) from public.get_artist_grid('tattoo')),
  0::bigint,
  'Sin sesión la grilla viene vacía — no hay camino de lectura sin auth.uid()'
);

-- --- con sesión --------------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e1","role":"authenticated"}';

select is(
  (select count(*) from public.get_artist_grid('tattoo')),
  2::bigint,
  'Solo los publicados con obra: dos de cuatro'
);

select is_empty(
  $$ select slug from public.get_artist_grid('tattoo') where slug = 'sin-obra' $$,
  'Un artista sin una sola obra no entra: su tarjeta saldría vacía'
);

select is_empty(
  $$ select slug from public.get_artist_grid('tattoo') where slug = 'sin-publicar' $$,
  'Un artista sin publicar no entra aunque tenga obra'
);

select isnt_empty(
  $$ select slug from public.get_artist_grid('tattoo') where slug = 'sin-ubicacion' $$,
  'Quien no publicó su ubicación aparece igual — no compartirla es voluntario'
);

select is(
  (select count(*) from public.get_artist_grid('inexistente')),
  0::bigint,
  'Una categoría que no existe devuelve vacío, no todo'
);

-- --- qué trae cada tarjeta ---------------------------------------------------

select is(
  (select jsonb_array_length(pieces) from public.get_artist_grid('tattoo')
   where slug = 'con-estudio'),
  6,
  'El carrusel trae seis piezas aunque el artista tenga ocho'
);

select is(
  (select jsonb_array_length(pieces) from public.get_artist_grid('tattoo', 100, 2)
   where slug = 'con-estudio'),
  2,
  'p_pieces manda: dos piezas cuando se piden dos'
);

select isnt_empty(
  $$
    select 1 from public.get_artist_grid('tattoo')
    where slug = 'con-estudio'
      and pieces @> '[{"id": "dddddddd-0000-0000-0000-0000000000e8"}]'
  $$,
  'La pieza destacada entra al carrusel aunque sea la octava por orden'
);

-- La tarjeta no muestra los estilos —tres etiquetas de colores por artista
-- convierten la grilla en una carta de colores— así que el RPC tampoco los
-- trae. Los estilos viven en el perfil.
select ok(
  (select pg_get_function_result(
     'public.get_artist_grid(text, integer, integer, text)'::regprocedure)
   ) not like '%style%',
  'La grilla no devuelve estilos: no los muestra, no los baja'
);

select results_eq(
  $$
    select neighborhood_slug, studio_lat, studio_lng
    from public.get_artist_grid('tattoo') where slug = 'con-estudio'
  $$,
  $$ select 'palermo'::text, (-34.5875)::double precision, (-58.4371)::double precision $$,
  'El barrio y las coordenadas salen tal como están'
);

select results_eq(
  $$
    select neighborhood_slug, studio_lat, studio_lng
    from public.get_artist_grid('tattoo') where slug = 'sin-ubicacion'
  $$,
  $$ select null::text, null::double precision, null::double precision $$,
  'Sin ubicación las tres columnas vienen nulas — no se rellena nada'
);

-- --- el orden ----------------------------------------------------------------

select results_eq(
  $$ select slug from public.get_artist_grid('tattoo') $$,
  $$ select slug from public.get_artist_grid('tattoo') $$,
  'Dos llamadas idénticas devuelven el mismo orden'
);

-- La distancia no está acá y no tiene que estarlo: el orden por cercanía es una
-- función pura y versionada de packages/domain, con tests unitarios. Este test
-- es el que se entera si alguien la baja a SQL.
select ok(
  (select pg_get_function_result(
     'public.get_artist_grid(text, integer, integer, text)'::regprocedure)
   ) not like '%distance%',
  'La grilla no devuelve distancia: el orden por cercanía vive en el dominio'
);

-- --- permisos ----------------------------------------------------------------

select ok(
  not has_function_privilege('anon', 'public.get_artist_grid(text, integer, integer, text)', 'execute'),
  'anon no puede ejecutar la grilla'
);

select * from finish();
rollback;
