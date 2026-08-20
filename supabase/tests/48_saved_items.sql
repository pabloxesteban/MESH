-- Lo guardado es de quien lo guardó, y de nadie más.
--
-- Guardar parece inofensivo hasta que se piensa qué es la lista: son las ideas
-- de tatuaje de una persona, que dicen bastante sobre ella. Que B pueda leer
-- lo de A es una filtración, no una molestia.
--
-- Y hay un caso que este test cuida en particular: **el artista no puede
-- contar los corazones de su obra.** Sin eso, guardar se convierte en una
-- métrica pública, y una métrica pública termina en notificación carnada. Ver
-- el innegociable 3 de CLAUDE.md y ADR-016.
--
-- Corre con `set local role authenticated` más un claim `sub`, igual que hace
-- PostgREST con un JWT: como `postgres` tiene BYPASSRLS, correrlo sin cambiar
-- de rol haría pasar todo siempre.

begin;
select plan(9);

-- --- fixtures (como postgres) ------------------------------------------------

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'guarda-a@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000b1', 'guarda-b@example.test'),
  -- El dueño del perfil profesional: es quien NO tiene que poder contar.
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'artista@example.test');

insert into public.media_assets (id, bucket, path, mime_type) values
  ('bbbbbbbb-0000-0000-0000-0000000000a1', 'portfolio', 'g/1.jpg', 'image/jpeg'),
  ('bbbbbbbb-0000-0000-0000-0000000000a2', 'portfolio', 'g/2.jpg', 'image/jpeg');

-- `claimed_at` junto con `owner_user_id`: la restricción
-- `professionals_claimed_has_owner` exige que los dos estén o no estén. Un
-- perfil con dueño y sin fecha de reclamo no existe.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select
  'cccccccc-0000-0000-0000-0000000000a1', id, 'guardable', 'Guardable', 'guardable',
  true, 'aaaaaaaa-0000-0000-0000-0000000000c1', now()
from public.categories where slug = 'tattoo';

insert into public.portfolio_items (id, professional_id, media_id) values
  ('dddddddd-0000-0000-0000-0000000000a1', 'cccccccc-0000-0000-0000-0000000000a1',
   'bbbbbbbb-0000-0000-0000-0000000000a1'),
  ('dddddddd-0000-0000-0000-0000000000a2', 'cccccccc-0000-0000-0000-0000000000a1',
   'bbbbbbbb-0000-0000-0000-0000000000a2');

-- A guarda una obra.
insert into public.saved_items (id, user_id, portfolio_item_id) values
  ('ffffffff-0000-0000-0000-0000000000a1',
   'aaaaaaaa-0000-0000-0000-0000000000a1',
   'dddddddd-0000-0000-0000-0000000000a1');

-- --- somos B -----------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b1","role":"authenticated"}';

select is(
  (select count(*)::int from public.saved_items),
  0,
  'B no ve nada de lo que guardó A'
);

select is(
  (select count(*)::int from public.saved_items
   where id = 'ffffffff-0000-0000-0000-0000000000a1'),
  0,
  'ni preguntando por el id exacto'
);

-- Borrar lo de otro tiene que afectar cero filas, no fallar: la política lo
-- vuelve invisible, y una fila invisible no se puede borrar.
with borradas as (
  delete from public.saved_items
  where id = 'ffffffff-0000-0000-0000-0000000000a1'
  returning 1
)
select is((select count(*)::int from borradas), 0, 'B no puede borrar lo de A');

select throws_ok(
  $$insert into public.saved_items (user_id, portfolio_item_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000a1',
            'dddddddd-0000-0000-0000-0000000000a2')$$,
  '42501',
  null,
  'B no puede guardar a nombre de A'
);

select lives_ok(
  $$insert into public.saved_items (user_id, portfolio_item_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000b1',
            'dddddddd-0000-0000-0000-0000000000a1')$$,
  'B sí puede guardar para sí mismo'
);

select is(
  (select count(*)::int from public.saved_items),
  1,
  'y solo ve lo suyo'
);

select throws_ok(
  $$insert into public.saved_items (user_id, portfolio_item_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000b1',
            'dddddddd-0000-0000-0000-0000000000a1')$$,
  '23505',
  null,
  'guardar dos veces la misma obra no crea dos filas'
);

-- --- somos el artista dueño de la obra ---------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c1","role":"authenticated"}';

select is(
  (select count(*)::int from public.saved_items
   where portfolio_item_id = 'dddddddd-0000-0000-0000-0000000000a1'),
  0,
  'el artista NO puede contar los corazones de su propia obra'
);

-- --- somos A otra vez --------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

with borradas as (
  delete from public.saved_items
  where portfolio_item_id = 'dddddddd-0000-0000-0000-0000000000a1'
  returning 1
)
select is(
  (select count(*)::int from borradas),
  1,
  'A desguarda lo suyo y solo lo suyo'
);

reset role;
select * from finish();
rollback;
