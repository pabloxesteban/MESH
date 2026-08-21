-- Borrar la cuenta: qué se va, qué sobrevive, y a quién no puede borrar.
--
-- Cuatro garantías:
--
-- 1. **Se va todo lo de la persona**, por cascade: proyectos, conversaciones,
--    mensajes, reseñas, guardados, hilos del asistente, denuncias y bloqueos.
--
-- 2. **Se va también su perfil de artista.** Aunque MESH lo haya curado: la
--    fila lleva su nombre y sus fotos, y dejarla publicada sería retener lo que
--    la persona pidió que no retengamos.
--
-- 3. **Sobrevive el registro de que se borró**, sin nada adentro. `audit_events`
--    no tiene FK a `profiles` justamente para esto: un cascade ahí haría que
--    borrar la cuenta borrara la evidencia de haberla borrado.
--
-- 4. **No puede borrar a nadie más.** La función no recibe a quién borrar.
--
-- Ver ADR-024.

begin;
select plan(10);

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'seva@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000f2', 'sequeda@example.test');

insert into public.profiles (id) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1'),
  ('aaaaaaaa-0000-0000-0000-0000000000f2')
on conflict (id) do nothing;

-- f1 es artista Y busca: el caso que más cosas arrastra.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000f1', id, 'se-va', 'Se Va',
       'seva', true, 'aaaaaaaa-0000-0000-0000-0000000000f1', now()
from public.categories where slug = 'tattoo';

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000f2', id, 'se-queda', 'Se Queda',
       'sequeda', true, 'aaaaaaaa-0000-0000-0000-0000000000f2', now()
from public.categories where slug = 'tattoo';

insert into public.projects (id, user_id, category_id, title, status)
select 'ffffffff-0000-0000-0000-0000000000f1',
       'aaaaaaaa-0000-0000-0000-0000000000f1', id, 'Su búsqueda', 'active'
from public.categories where slug = 'tattoo';

-- Le escribió al otro artista, así que hay conversación y mensajes.
insert into public.conversations (id, user_id, professional_id) values
  ('dddddddd-0000-0000-0000-0000000000f1',
   'aaaaaaaa-0000-0000-0000-0000000000f1',
   'cccccccc-0000-0000-0000-0000000000f2');

insert into public.messages (conversation_id, sender_user_id, body) values
  ('dddddddd-0000-0000-0000-0000000000f1',
   'aaaaaaaa-0000-0000-0000-0000000000f1', 'hola');

insert into public.assistant_threads (id, user_id, category_id)
select 'eeeeeeee-0000-0000-0000-0000000000f1',
       'aaaaaaaa-0000-0000-0000-0000000000f1', id
from public.categories where slug = 'tattoo';

insert into public.assistant_turns (thread_id, role, body) values
  ('eeeeeeee-0000-0000-0000-0000000000f1', 'person', 'quiero algo chico');

insert into public.blocks (blocker_user_id, blocked_professional_id) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1',
   'cccccccc-0000-0000-0000-0000000000f2');

insert into public.reports
  (reporter_user_id, target_kind, reason, professional_id)
values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'professional', 'spam',
        'cccccccc-0000-0000-0000-0000000000f2');

-- --- sin sesión no se borra nada ---------------------------------------------

set local role authenticated;

select throws_ok(
  'select public.delete_own_account()',
  '28000',
  null,
  'sin sesión no se borra ninguna cuenta'
);

-- --- somos f1, que se va ------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000f1","role":"authenticated"}';

select lives_ok(
  'select public.delete_own_account()',
  'la persona borra su propia cuenta'
);

reset role;

select is(
  (select count(*)::int from auth.users
   where id = 'aaaaaaaa-0000-0000-0000-0000000000f1'),
  0,
  'y deja de existir'
);

select is(
  (select count(*)::int from public.profiles
   where id = 'aaaaaaaa-0000-0000-0000-0000000000f1'),
  0,
  'su perfil se va por cascade'
);

-- **El test del bug que esto arregla.** Antes, este borrado fallaba: el
-- `set null` de `owner_user_id` chocaba con el check de `claimed_at`.
select is(
  (select count(*)::int from public.professionals
   where id = 'cccccccc-0000-0000-0000-0000000000f1'),
  0,
  'su perfil de artista se va con ella, aunque estuviera publicado'
);

select is(
  (select count(*)::int from public.projects
   where id = 'ffffffff-0000-0000-0000-0000000000f1'),
  0,
  'sus búsquedas también'
);

select is(
  (select count(*)::int from public.messages),
  0,
  'y sus mensajes, con la conversación entera'
);

select is(
  (select count(*)::int from public.assistant_turns),
  0,
  'y lo que le contó al asistente'
);

-- **El test que hace que la auditoría sirva.**
select is(
  (select count(*)::int from public.audit_events
   where action = 'account_deleted'
     and actor_user_id = 'aaaaaaaa-0000-0000-0000-0000000000f1'),
  1,
  'sobrevive el registro de que se borró: audit_events no tiene FK a propósito'
);

-- Y el otro artista sigue entero.
select is(
  (select count(*)::int from public.professionals
   where id = 'cccccccc-0000-0000-0000-0000000000f2'),
  1,
  'la cuenta de al lado no se toca'
);

select * from finish();
rollback;
