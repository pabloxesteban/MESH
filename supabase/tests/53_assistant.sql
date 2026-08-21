-- El asistente: quién lee el hilo, y quién puede escribir del lado del bot.
--
-- Tres garantías, y la segunda es la que sostiene ADR-021 entera:
--
-- 1. **El hilo es de una sola persona.** Nadie más lo lee — ni otro usuario, ni
--    un artista con un perfil publicado, ni sabiendo el id.
--
-- 2. **El cliente no puede escribir del lado del asistente.** Si pudiera,
--    fabricaría una respuesta y la mostraría como si MESH la hubiera dicho: un
--    precio, una disponibilidad, un "fulano te lo hace". Las reglas 3, 4 y 5 de
--    ADR-021 se rompen ahí y en ningún otro lado.
--
-- 3. **Un hilo se cuelga de una búsqueda propia, nunca de una ajena.**
--
-- Ver ADR-021.

begin;
select plan(16);

-- --- fixtures (como postgres) ------------------------------------------------

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'pide@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000c2', 'curiosa@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000c3', 'artista@example.test');

insert into public.profiles (id) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1'),
  ('aaaaaaaa-0000-0000-0000-0000000000c2'),
  ('aaaaaaaa-0000-0000-0000-0000000000c3')
on conflict (id) do nothing;

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000c1', id, 'mira-hilos', 'Mira Hilos',
       'mirahilos', true, 'aaaaaaaa-0000-0000-0000-0000000000c3', now()
from public.categories where slug = 'tattoo';

-- Una búsqueda de cada persona, para probar el enganche cruzado.
insert into public.projects (id, user_id, category_id, title, status)
select 'ffffffff-0000-0000-0000-0000000000c1',
       'aaaaaaaa-0000-0000-0000-0000000000c1', id, 'Lo que salió del hilo',
       'active'
from public.categories where slug = 'tattoo';

insert into public.projects (id, user_id, category_id, title, status)
select 'ffffffff-0000-0000-0000-0000000000c2',
       'aaaaaaaa-0000-0000-0000-0000000000c2', id, 'La búsqueda de otra',
       'active'
from public.categories where slug = 'tattoo';

-- --- la persona abre su hilo --------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c1","role":"authenticated"}';

select lives_ok(
  $$insert into public.assistant_threads (id, user_id, category_id)
    select 'eeeeeeee-0000-0000-0000-0000000000c1',
           'aaaaaaaa-0000-0000-0000-0000000000c1', id
    from public.categories where slug = 'tattoo'$$,
  'la persona abre un hilo con el asistente'
);

select throws_ok(
  $$insert into public.assistant_threads (user_id, category_id)
    select 'aaaaaaaa-0000-0000-0000-0000000000c2', id
    from public.categories where slug = 'tattoo'$$,
  '42501',
  null,
  'y no puede abrir uno a nombre de otra'
);

select lives_ok(
  $$insert into public.assistant_turns (thread_id, role, body)
    values ('eeeeeeee-0000-0000-0000-0000000000c1', 'person',
            'quiero algo chiquito para mi viejo')$$,
  'escribe su turno'
);

-- **El test que sostiene ADR-021.**
select throws_ok(
  $$insert into public.assistant_turns (thread_id, role, body)
    values ('eeeeeeee-0000-0000-0000-0000000000c1', 'assistant',
            'te sale entre 80 y 120 mil, y Mira Hilos tiene lugar el jueves')$$,
  '42501',
  null,
  'pero no puede escribir del lado del asistente'
);

select is(
  (select count(*)::int from public.assistant_turns),
  1,
  'así que en el hilo hay un solo turno, el suyo'
);

-- El turno del asistente entra por el servidor, que no pasa por RLS.
set local role postgres;
insert into public.assistant_turns (thread_id, role, body)
values ('eeeeeeee-0000-0000-0000-0000000000c1', 'assistant',
        '¿En qué parte del cuerpo lo pensás?');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c1","role":"authenticated"}';

select is(
  (select count(*)::int from public.assistant_turns),
  2,
  'el turno del asistente lo escribió el servidor, y ella lo lee'
);

select isnt(
  (select last_turn_at from public.assistant_threads
   where id = 'eeeeeeee-0000-0000-0000-0000000000c1'),
  null,
  'y el hilo quedó marcado con la fecha del último turno'
);

-- Inmutables: ni editar ni borrar un turno suelto.
select throws_ok(
  $$update public.assistant_turns set body = 'otra cosa'$$,
  '42501',
  null,
  'un turno no se edita'
);

select throws_ok(
  $$delete from public.assistant_turns$$,
  '42501',
  null,
  'ni se borra de a uno'
);

-- --- el pedido sale del hilo ---------------------------------------------------

select lives_ok(
  $$select public.attach_thread_project(
      'eeeeeeee-0000-0000-0000-0000000000c1',
      'ffffffff-0000-0000-0000-0000000000c1')$$,
  'la búsqueda que salió del hilo se cuelga del hilo'
);

select throws_ok(
  $$select public.attach_thread_project(
      'eeeeeeee-0000-0000-0000-0000000000c1',
      'ffffffff-0000-0000-0000-0000000000c2')$$,
  '42501',
  null,
  'pero no se le cuelga la búsqueda de otra persona'
);

-- --- somos otra persona ---------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c2","role":"authenticated"}';

select is(
  (select count(*)::int from public.assistant_threads),
  0,
  'otra persona no ve el hilo, ni sabiendo que existe'
);

select is(
  (select count(*)::int from public.assistant_turns),
  0,
  'ni un solo turno de adentro'
);

select throws_ok(
  $$insert into public.assistant_turns (thread_id, role, body)
    values ('eeeeeeee-0000-0000-0000-0000000000c1', 'person',
            'me meto en tu conversación')$$,
  '42501',
  null,
  'ni puede escribir adentro'
);

-- --- somos el artista -------------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c3","role":"authenticated"}';

-- **El test que dice qué NO cruza hacia el artista.** Le puede llegar el pedido
-- confirmado por `get_open_searches`; la conversación de la que salió, jamás.
select is(
  (select count(*)::int from public.assistant_turns),
  0,
  'un artista no lee la conversación de la que salió el pedido'
);

-- --- borrar el hilo -----------------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c1","role":"authenticated"}';

delete from public.assistant_threads
where id = 'eeeeeeee-0000-0000-0000-0000000000c1';

select is(
  (select count(*)::int from public.assistant_turns),
  0,
  'y su dueña puede tirar el hilo entero, con todo lo que dijo adentro'
);

reset role;
select * from finish();
rollback;
