-- Tu semana: quién ve qué turno, y con qué nombre.
--
-- Cuatro garantías:
--
-- 1. **Cada parte ve el turno**, del lado que sea.
--
-- 2. **Y ve el nombre de la otra.** Es lo único que esta función abre, y solo
--    con un turno confirmado: nadie puede correr un turno de tatuaje contra un
--    identificador anónimo. Fuera de la agenda, `profiles` sigue cerrado.
--
-- 3. **Un tercero no ve nada.** Ni con el id del turno en la mano.
--
-- 4. **Lo cancelado y lo que ya pasó no aparecen.** La agenda es para
--    planificar; lo de atrás se ve en el chat, donde además se puede reseñar.
--
-- Enmienda a ADR-018.

begin;
select plan(11);

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000c5', 'persona@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000c6', 'artista@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000c7', 'tercero@example.test');

insert into public.profiles (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-0000000000c5', 'Ana'),
  ('aaaaaaaa-0000-0000-0000-0000000000c6', null),
  ('aaaaaaaa-0000-0000-0000-0000000000c7', 'Curioso')
on conflict (id) do update set display_name = excluded.display_name;

update public.profiles set adult_confirmed_at = now();

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000c5', id, 'la-aguja', 'La Aguja',
       'laaguja', true, 'aaaaaaaa-0000-0000-0000-0000000000c6', now()
from public.categories where slug = 'tattoo';

insert into public.conversations (id, user_id, professional_id) values
  ('dddddddd-0000-0000-0000-0000000000c5',
   'aaaaaaaa-0000-0000-0000-0000000000c5',
   'cccccccc-0000-0000-0000-0000000000c5');

-- Un turno que viene, y uno que ya pasó.
insert into public.appointments
  (id, conversation_id, professional_id, user_id, starts_at, ends_at)
values
  ('bbbbbbbb-0000-0000-0000-0000000000c5',
   'dddddddd-0000-0000-0000-0000000000c5',
   'cccccccc-0000-0000-0000-0000000000c5',
   'aaaaaaaa-0000-0000-0000-0000000000c5',
   now() + interval '3 days', now() + interval '3 days 2 hours'),
  ('bbbbbbbb-0000-0000-0000-0000000000c6',
   'dddddddd-0000-0000-0000-0000000000c5',
   'cccccccc-0000-0000-0000-0000000000c5',
   'aaaaaaaa-0000-0000-0000-0000000000c5',
   now() - interval '10 days', now() - interval '10 days' + interval '2 hours');

-- --- la persona ---------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c5","role":"authenticated"}';

select is(
  (select count(*)::int from public.get_my_appointments()),
  1,
  'la persona ve el turno que viene, y solo el que viene'
);

select is(
  (select counterpart_name from public.get_my_appointments()),
  'La Aguja',
  'con el nombre del artista'
);

select is(
  (select viewer_is_professional from public.get_my_appointments()),
  false,
  'y sabe que mira del lado de quien se tatúa'
);

-- --- el artista ------------------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c6","role":"authenticated"}';

select is(
  (select count(*)::int from public.get_my_appointments()),
  1,
  'el artista ve el mismo turno'
);

-- **El test de la decisión de privacidad.**
select is(
  (select counterpart_name from public.get_my_appointments()),
  'Ana',
  'y ve el nombre de la persona: un turno no se corre contra un identificador'
);

select is(
  (select viewer_is_professional from public.get_my_appointments()),
  true,
  'y sabe que mira del lado de la agenda'
);

-- **El test que acota la excepción.** La agenda abre el nombre; la tabla no.
select is(
  (select count(*)::int from public.profiles
   where id = 'aaaaaaaa-0000-0000-0000-0000000000c5'),
  0,
  'fuera de la agenda, la ficha de la persona sigue cerrada'
);

-- --- un tercero ------------------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c7","role":"authenticated"}';

select is(
  (select count(*)::int from public.get_my_appointments()),
  0,
  'un tercero no ve ningún turno'
);

-- --- cancelado ---------------------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c6","role":"authenticated"}';

select lives_ok(
  $$select public.cancel_appointment('bbbbbbbb-0000-0000-0000-0000000000c5')$$,
  'el artista cancela el turno'
);

select is(
  (select count(*)::int from public.get_my_appointments()),
  0,
  'y desaparece de la agenda de los dos'
);

-- Sin nombre puesto, no se inventa uno.
reset role;
insert into public.appointments
  (id, conversation_id, professional_id, user_id, starts_at, ends_at)
values
  ('bbbbbbbb-0000-0000-0000-0000000000c7',
   'dddddddd-0000-0000-0000-0000000000c5',
   'cccccccc-0000-0000-0000-0000000000c5',
   'aaaaaaaa-0000-0000-0000-0000000000c5',
   now() + interval '5 days', now() + interval '5 days 2 hours');

update public.profiles set display_name = null
where id = 'aaaaaaaa-0000-0000-0000-0000000000c5';

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c6","role":"authenticated"}';

select is(
  (select counterpart_name from public.get_my_appointments()),
  null,
  'si no puso nombre, no se inventa: la pantalla lo dice'
);

reset role;
select * from finish();
rollback;
