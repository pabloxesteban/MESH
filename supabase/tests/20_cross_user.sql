-- Aislamiento entre usuarios.
--
-- Este es el test que importa. Todo lo demás del esquema puede estar bien y si
-- este falla, el producto filtra datos de personas.
--
-- Se ejecuta con `set local role authenticated` más un claim `sub`, que es
-- exactamente lo que PostgREST hace con un JWT. Como `postgres` tiene
-- BYPASSRLS, correr estos tests sin cambiar de rol los haría pasar siempre —
-- que es la forma más común de tener una suite de RLS que no prueba nada.

begin;
select plan(16);

-- --- fixtures (como postgres) ------------------------------------------------

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@example.test'),
  ('aaaaaaaa-0000-0000-0000-00000000000b', 'b@example.test');

insert into public.media_assets (id, bucket, path, mime_type) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'portfolio', 'pub/1.jpg', 'image/jpeg'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'portfolio', 'unpub/1.jpg', 'image/jpeg');

-- Media privada de A: una referencia de proyecto. Es el caso que más duele si
-- se filtra — es una imagen que alguien subió, no catálogo.
insert into public.media_assets (id, bucket, path, mime_type, owner_user_id)
values (
  'bbbbbbbb-0000-0000-0000-00000000000a', 'references', 'a/ref.jpg', 'image/jpeg',
  'aaaaaaaa-0000-0000-0000-00000000000a'
);

insert into public.professionals (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-000000000001', id, 'publicado', 'Publicado', 'publicado', true
from public.categories where slug = 'tattoo';

insert into public.professionals (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-000000000002', id, 'borrador', 'Borrador', 'borrador', false
from public.categories where slug = 'tattoo';

insert into public.portfolio_items (id, professional_id, media_id) values
  ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001'),
  ('dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002');

insert into public.interactions (user_id, portfolio_item_id, verdict, source)
values ('aaaaaaaa-0000-0000-0000-00000000000a', 'dddddddd-0000-0000-0000-000000000001', 'like', 'discover');

insert into public.projects (id, user_id, category_id, title)
select 'eeeeeeee-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', id, 'Proyecto de A'
from public.categories where slug = 'tattoo';

insert into public.project_references (project_id, media_id)
values ('eeeeeeee-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-00000000000a');

insert into public.taste_profiles (user_id, category_id, algo_version)
select 'aaaaaaaa-0000-0000-0000-00000000000a', id, 'taste/1'
from public.categories where slug = 'tattoo';

insert into public.matches (user_id, professional_id, score, band, matching_version, taste_version)
values (
  'aaaaaaaa-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-000000000001',
  0.8, 'good', 'match/1', 'taste/1'
);

-- --- ahora somos B -----------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000b","role":"authenticated"}';

select is(
  (select count(*) from public.interactions),
  0::bigint,
  'B no ve ninguna interacción de A'
);

select is(
  (select count(*) from public.projects),
  0::bigint,
  'B no ve ningún proyecto de A'
);

select is(
  (select count(*) from public.project_references),
  0::bigint,
  'B no ve las referencias del proyecto de A'
);

select is(
  (select count(*) from public.taste_profiles),
  0::bigint,
  'B no ve el perfil de gusto de A'
);

select is(
  (select count(*) from public.matches),
  0::bigint,
  'B no ve los matches de A'
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'B se ve solo a sí mismo en profiles'
);

-- La media privada de A es el peor caso: es una imagen que alguien subió,
-- y su `path` es la llave para pedirla al bucket.
select is(
  (select count(*) from public.media_assets where bucket = 'references'),
  0::bigint,
  'B no ve la media privada de A'
);

select is(
  (select count(*) from public.professionals),
  1::bigint,
  'B ve el profesional publicado y no el borrador'
);

select is(
  (select count(*) from public.portfolio_items),
  1::bigint,
  'B no ve la obra de un profesional sin publicar'
);

select is(
  (select count(*) from public.media_assets),
  1::bigint,
  'B ve la media del catálogo publicado y nada más'
);

-- --- escrituras cruzadas -----------------------------------------------------

-- Sin `where`: B intenta pisar y borrar la tabla entera. No falla — RLS no
-- devuelve un error, simplemente no encuentra filas. Que no falle es
-- justamente por qué hay que verificar el efecto, y no que la sentencia corrió.
update public.interactions set verdict = 'pass';
delete from public.interactions;

select throws_ok(
  $$
    insert into public.interactions (user_id, portfolio_item_id, verdict, source)
    values (
      'aaaaaaaa-0000-0000-0000-00000000000a',
      'dddddddd-0000-0000-0000-000000000001',
      'like', 'discover'
    )
  $$,
  42501,
  null,
  'B no puede insertar una interacción a nombre de A'
);

select throws_ok(
  $$
    insert into public.project_styles (project_id, style_id, weight)
    select 'eeeeeeee-0000-0000-0000-00000000000a', id, 1.0
    from public.styles where slug = 'fine-line'
  $$,
  42501,
  null,
  'B no puede colgar estilos del proyecto de A'
);

-- --- tablas que el cliente no puede leer -------------------------------------

select throws_ok(
  'select * from public.analytics_events',
  42501,
  null,
  'Nadie puede leer analytics_events desde el cliente'
);

select throws_ok(
  'select * from public.audit_events',
  42501,
  null,
  'Nadie puede tocar audit_events desde el cliente'
);

reset role;

-- Ahora, de vuelta como postgres, se mira el daño real.
select is(
  (select count(*) from public.interactions
   where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
  1::bigint,
  'El delete sin where de B no borró la interacción de A'
);

select is(
  (select verdict::text from public.interactions
   where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
  'like',
  'El update sin where de B no cambió el veredicto de A'
);

select * from finish();
rollback;
