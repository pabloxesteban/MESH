-- Colecciones: una etiqueta sobre lo guardado, y el candado de dos
-- condiciones que la sostiene.
--
-- El caso que este archivo existe para cubrir: `collection_items` no tiene
-- `user_id` propio, así que su INSERT prueba propiedad contra las DOS tablas
-- que referencia. Una sola condición se come uno de los dos lados:
--
--   · sin la de `collections`, cualquiera escribe en la colección de otro.
--   · sin la de `saved_items`, cualquiera cuelga de su propia colección una
--     obra que otra persona guardó — y de paso se entera de que la guardó.
--
-- También el cascade de dos saltos que ADR-030 promete sin trigger: borrar el
-- `portfolio_item` cascadea `saved_items` (ya cubierto en 48) y eso, a su vez,
-- se lleva puesta la fila de `collection_items` que lo etiquetaba.
--
-- Ver ADR-030.

begin;
select plan(17);

-- --- fixtures (como postgres) ------------------------------------------------

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'coleccion-a@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000f2', 'coleccion-b@example.test');
-- `handle_new_user()` crea las filas de `profiles` solo, como en 48.

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000f1', id, 'coleccionable',
       'Coleccionable', 'coleccionable', true
from public.categories where slug = 'tattoo';

insert into public.media_assets (id, bucket, path, mime_type) values
  ('bbbbbbbb-0000-0000-0000-0000000000f1', 'portfolio', 'f/1.jpg', 'image/jpeg'),
  ('bbbbbbbb-0000-0000-0000-0000000000f2', 'portfolio', 'f/2.jpg', 'image/jpeg'),
  ('bbbbbbbb-0000-0000-0000-0000000000f3', 'portfolio', 'f/3.jpg', 'image/jpeg');

insert into public.portfolio_items (id, professional_id, media_id) values
  ('dddddddd-0000-0000-0000-0000000000f1', 'cccccccc-0000-0000-0000-0000000000f1',
   'bbbbbbbb-0000-0000-0000-0000000000f1'),
  ('dddddddd-0000-0000-0000-0000000000f2', 'cccccccc-0000-0000-0000-0000000000f1',
   'bbbbbbbb-0000-0000-0000-0000000000f2'),
  -- La tercera, aparte: es la que se borra para probar el cascade de dos
  -- saltos, y no queremos que su borrado le pegue a los tests anteriores.
  ('dddddddd-0000-0000-0000-0000000000f3', 'cccccccc-0000-0000-0000-0000000000f1',
   'bbbbbbbb-0000-0000-0000-0000000000f3');

-- A guarda la 1, B guarda la 2. Cada quien lo suyo.
insert into public.saved_items (id, user_id, portfolio_item_id) values
  ('ffffffff-0000-0000-0000-0000000000f1',
   'aaaaaaaa-0000-0000-0000-0000000000f1',
   'dddddddd-0000-0000-0000-0000000000f1'),
  ('ffffffff-0000-0000-0000-0000000000f2',
   'aaaaaaaa-0000-0000-0000-0000000000f2',
   'dddddddd-0000-0000-0000-0000000000f2');

-- --- somos A ------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000f1","role":"authenticated"}';

-- 1. El dueño puede crear su colección.
select lives_ok(
  $$insert into public.collections (id, user_id, name) values
    ('11111111-0000-0000-0000-0000000000f1',
     'aaaaaaaa-0000-0000-0000-0000000000f1', 'Ideas')$$,
  'A crea su propia colección'
);

-- 2. Y verla.
select is(
  (select name from public.collections
   where id = '11111111-0000-0000-0000-0000000000f1'),
  'Ideas',
  'A ve su propia colección'
);

-- Agrega su propia obra guardada a su propia colección: las dos condiciones
-- se cumplen, tiene que andar.
select lives_ok(
  $$insert into public.collection_items (collection_id, saved_item_id) values
    ('11111111-0000-0000-0000-0000000000f1',
     'ffffffff-0000-0000-0000-0000000000f1')$$,
  'A agrega su propia obra guardada a su propia colección'
);

-- --- somos B ------------------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000f2","role":"authenticated"}';

-- B crea la suya, para tener con qué probar el otro lado del candado.
select lives_ok(
  $$insert into public.collections (id, user_id, name) values
    ('11111111-0000-0000-0000-0000000000f2',
     'aaaaaaaa-0000-0000-0000-0000000000f2', 'Referencias')$$,
  'B crea su propia colección'
);

-- 3. B no ve la colección de A. Acceso cruzado bloqueado.
select is(
  (select count(*)::int from public.collections
   where id = '11111111-0000-0000-0000-0000000000f1'),
  0,
  'B no ve la colección de A'
);

-- 4a. B intenta escribir en la colección de A, con su propia obra guardada
-- (que sí es suya). La primera condición del with check falla: la colección
-- no es de B.
select throws_ok(
  $$insert into public.collection_items (collection_id, saved_item_id) values
    ('11111111-0000-0000-0000-0000000000f1',
     'ffffffff-0000-0000-0000-0000000000f2')$$,
  '42501',
  null,
  'B no puede escribir en la colección de A, ni con su propia obra'
);

-- 4b. B intenta colgar de SU PROPIA colección la obra que guardó A. La
-- segunda condición del with check falla: el saved_item no es de B. Este es
-- el caso que una sola condición se comería.
select throws_ok(
  $$insert into public.collection_items (collection_id, saved_item_id) values
    ('11111111-0000-0000-0000-0000000000f2',
     'ffffffff-0000-0000-0000-0000000000f1')$$,
  '42501',
  null,
  'B no puede colgar de su colección una obra que guardó A'
);

-- Ninguno de los dos intentos dejó fila. Se verifica como postgres —RLS
-- también le escondería a B la fila de A, y esto no es lo que se está
-- probando acá.
reset role;
select is(
  (select count(*)::int from public.collection_items
   where saved_item_id in (
     'ffffffff-0000-0000-0000-0000000000f1',
     'ffffffff-0000-0000-0000-0000000000f2'
   )),
  1,
  'de los tres intentos, solo la fila legítima de A quedó escrita'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000f2","role":"authenticated"}';

-- B intenta borrar la pertenencia de la colección de A: cero filas afectadas,
-- no un error — la política la vuelve invisible.
with borradas as (
  delete from public.collection_items
  where collection_id = '11111111-0000-0000-0000-0000000000f1'
  returning 1
)
select is((select count(*)::int from borradas), 0, 'B no puede borrar la pertenencia de A');

-- --- somos A de nuevo: borrar la colección no desguarda la obra ---------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000f1","role":"authenticated"}';

select lives_ok(
  $$delete from public.collections
    where id = '11111111-0000-0000-0000-0000000000f1'$$,
  'A borra su propia colección'
);

select is(
  (select count(*)::int from public.collection_items
   where collection_id = '11111111-0000-0000-0000-0000000000f1'),
  0,
  'borrar la colección se lleva la pertenencia'
);

select is(
  (select count(*)::int from public.saved_items
   where id = 'ffffffff-0000-0000-0000-0000000000f1'),
  1,
  'pero la obra sigue guardada: solo se perdió la agrupación'
);

-- --- el cascade de dos saltos: portfolio_item -> saved_items -> collection_items --

-- A guarda y colecciona la tercera pieza, la que se va a borrar desde abajo.
select lives_ok(
  $$insert into public.saved_items (id, user_id, portfolio_item_id) values
    ('ffffffff-0000-0000-0000-0000000000f3',
     'aaaaaaaa-0000-0000-0000-0000000000f1',
     'dddddddd-0000-0000-0000-0000000000f3')$$,
  'A guarda la tercera pieza'
);

select lives_ok(
  $$insert into public.collections (id, user_id, name) values
    ('11111111-0000-0000-0000-0000000000f3',
     'aaaaaaaa-0000-0000-0000-0000000000f1', 'Para el cascade')$$,
  'A crea una segunda colección'
);

select lives_ok(
  $$insert into public.collection_items (collection_id, saved_item_id) values
    ('11111111-0000-0000-0000-0000000000f3',
     'ffffffff-0000-0000-0000-0000000000f3')$$,
  'y le agrega la tercera pieza'
);

reset role;

-- Como dueño del contenido: se borra la pieza de portfolio.
delete from public.portfolio_items
where id = 'dddddddd-0000-0000-0000-0000000000f3';

-- El salto ya cubierto en 48_saved_items.sql: el saved_item cascadea.
select is(
  (select count(*)::int from public.saved_items
   where id = 'ffffffff-0000-0000-0000-0000000000f3'),
  0,
  'borrar el portfolio_item cascadea el saved_item (salto 1, confirmado acá también)'
);

-- El salto nuevo de esta ADR: la pertenencia también desaparece, sin fila
-- huérfana apuntando a un saved_item que ya no existe.
select is(
  (select count(*)::int from public.collection_items
   where saved_item_id = 'ffffffff-0000-0000-0000-0000000000f3'),
  0,
  'y la pertenencia a la colección cascadea con él (salto 2, sin huérfanos)'
);

select * from finish();
rollback;
