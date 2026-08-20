-- El brief y la propuesta: qué se pide, qué se responde, y quién ve qué.
--
-- Tres garantías, y las tres se rompen de formas distintas:
--
-- 1. **Un interés sin precio no existe.** Es todo el punto de ADR-020: una
--    lista de cinco nombres sin número obliga a las mismas cinco
--    conversaciones que había antes de MESH.
--
-- 2. **Un `pass` no lleva nada, y no lo ve nadie.** Ni precio, ni nota. Una
--    nota sobre una persona que nadie va a leer nunca es basura con fecha.
--
-- 3. **Los rasgos de una búsqueda privada son tan privados como sus fotos.**
--    `get_open_search_traits` solo abre los de una búsqueda abierta.
--
-- Ver ADR-020.

begin;
select plan(18);

-- --- fixtures (como postgres) ------------------------------------------------

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000b1', 'busca@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000b2', 'artista-a@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000b3', 'artista-b@example.test');

insert into public.profiles (id) values
  ('aaaaaaaa-0000-0000-0000-0000000000b1'),
  ('aaaaaaaa-0000-0000-0000-0000000000b2'),
  ('aaaaaaaa-0000-0000-0000-0000000000b3')
on conflict (id) do nothing;

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000b1', id, 'propone-a', 'Propone A',
       'proponea', true, 'aaaaaaaa-0000-0000-0000-0000000000b2', now()
from public.categories where slug = 'tattoo';

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000b2', id, 'propone-b', 'Propone B',
       'proponeb', true, 'aaaaaaaa-0000-0000-0000-0000000000b3', now()
from public.categories where slug = 'tattoo';

-- Una búsqueda abierta y una privada, de la misma persona.
insert into public.projects
  (id, user_id, category_id, title, status, is_open_to_professionals)
select 'ffffffff-0000-0000-0000-0000000000b1',
       'aaaaaaaa-0000-0000-0000-0000000000b1', id,
       'Algo de línea fina en el antebrazo', 'active', true
from public.categories where slug = 'tattoo';

insert into public.projects
  (id, user_id, category_id, title, status, is_open_to_professionals)
select 'ffffffff-0000-0000-0000-0000000000b2',
       'aaaaaaaa-0000-0000-0000-0000000000b1', id,
       'Algo que todavía no muestro', 'active', false
from public.categories where slug = 'tattoo';

-- --- el vocabulario es público -----------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b1","role":"authenticated"}';

select is(
  (select count(*)::int from public.traits where dimension = 'body_area'),
  10,
  'el vocabulario de zonas del cuerpo se lee: es taxonomía, no dato de nadie'
);

select is(
  (select count(distinct dimension)::int from public.traits),
  3,
  'y están las tres dimensiones'
);

-- --- la persona arma su brief ------------------------------------------------

select lives_ok(
  $$insert into public.project_traits (project_id, trait_id)
    select 'ffffffff-0000-0000-0000-0000000000b1', id
    from public.traits where slug in ('antebrazo', 'chico', 'negro')$$,
  'la persona describe su búsqueda con rasgos del vocabulario'
);

select is(
  (select count(*)::int from public.project_traits
   where project_id = 'ffffffff-0000-0000-0000-0000000000b1'),
  3,
  'y quedan los tres'
);

-- Los de la privada también se cargan: privada no es incompleta.
insert into public.project_traits (project_id, trait_id)
select 'ffffffff-0000-0000-0000-0000000000b2', id
from public.traits where slug = 'espalda';

-- --- somos el artista A ------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b2","role":"authenticated"}';

-- **El test que sostiene ADR-020.**
select throws_ok(
  $$insert into public.project_interests (project_id, professional_id, verdict)
    values ('ffffffff-0000-0000-0000-0000000000b1',
            'cccccccc-0000-0000-0000-0000000000b1', 'interest')$$,
  '23514',
  null,
  'un interés sin propuesta no entra'
);

select throws_ok(
  $$insert into public.project_interests
      (project_id, professional_id, verdict,
       price_min_cents, price_max_cents, price_currency, sessions)
    values ('ffffffff-0000-0000-0000-0000000000b1',
            'cccccccc-0000-0000-0000-0000000000b1', 'interest',
            20000000, 8000000, 'ARS', 1)$$,
  '23514',
  null,
  'ni una con el mínimo más alto que el máximo'
);

select lives_ok(
  $$insert into public.project_interests
      (project_id, professional_id, verdict,
       price_min_cents, price_max_cents, price_currency, sessions, note)
    values ('ffffffff-0000-0000-0000-0000000000b1',
            'cccccccc-0000-0000-0000-0000000000b1', 'interest',
            8000000, 12000000, 'ARS', 2,
            'Estimado. Lo confirmo cuando vea la piel')$$,
  'con rango, sesiones y una condición escrita, sí'
);

-- Los rasgos de la abierta se leen sin saber de quién es.
select is(
  (select count(*)::int from public.get_open_search_traits(
     'ffffffff-0000-0000-0000-0000000000b1')),
  3,
  'el artista ve los rasgos de una búsqueda abierta'
);

-- **El test que cuida la búsqueda privada.**
select is(
  (select count(*)::int from public.get_open_search_traits(
     'ffffffff-0000-0000-0000-0000000000b2')),
  0,
  'y no ve los de una privada, ni sabiendo su id'
);

select is(
  (select count(*)::int from public.project_traits),
  0,
  'ni lee la tabla de rasgos de nadie'
);

-- --- somos el artista B ------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b3","role":"authenticated"}';

select throws_ok(
  $$insert into public.project_interests
      (project_id, professional_id, verdict, note)
    values ('ffffffff-0000-0000-0000-0000000000b1',
            'cccccccc-0000-0000-0000-0000000000b2', 'pass',
            'no me interesa porque...')$$,
  '23514',
  null,
  'un paso no lleva nota: nadie la va a leer nunca'
);

select lives_ok(
  $$insert into public.project_interests
      (project_id, professional_id, verdict)
    values ('ffffffff-0000-0000-0000-0000000000b1',
            'cccccccc-0000-0000-0000-0000000000b2', 'pass')$$,
  'un paso pelado sí'
);

-- No ve la propuesta del otro: una propuesta es entre el artista y la persona.
select is(
  (select count(*)::int from public.project_interests
   where professional_id = 'cccccccc-0000-0000-0000-0000000000b1'),
  0,
  'un artista no ve la propuesta de otro'
);

select is(
  (select count(*)::int from public.get_search_interests(
     'ffffffff-0000-0000-0000-0000000000b1')),
  0,
  'ni las propuestas de una búsqueda que no es suya'
);

-- --- somos la persona --------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b1","role":"authenticated"}';

-- Una propuesta, no dos: el `pass` de B no aparece.
select is(
  (select count(*)::int from public.get_search_interests(
     'ffffffff-0000-0000-0000-0000000000b1')),
  1,
  'la persona ve la propuesta, y solo la propuesta'
);

select is(
  (select price_max_cents from public.get_search_interests(
     'ffffffff-0000-0000-0000-0000000000b1')),
  12000000,
  'con el número que escribió el artista'
);

select is(
  (select note from public.get_search_interests(
     'ffffffff-0000-0000-0000-0000000000b1')),
  'Estimado. Lo confirmo cuando vea la piel',
  'y con su condición'
);

-- Sin argumento, todas las búsquedas propias: es la lista que la persona mira
-- en Chats, que no razona por proyecto sino por "quién me respondió".
select is(
  (select count(*)::int from public.get_search_interests()),
  1,
  'y la lista sin filtrar trae lo mismo'
);

reset role;
select * from finish();
rollback;
