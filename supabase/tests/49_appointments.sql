-- El almanaque: que un turno no se pise con otro, y que nadie vea la agenda ajena.
--
-- Dos garantías, y las dos importan por razones distintas:
--
-- 1. **Ocupado significa ocupado.** Si dos turnos del mismo artista pueden
--    solaparse, el almanaque miente y alguien se va a encontrar con otra
--    persona en la puerta. Lo impone una restricción de exclusión, no la app —
--    en TypeScript sería una carrera entre dos pedidos simultáneos.
--
-- 2. **Un hueco ocupado no dice de quién es.** Quien mira el almanaque de un
--    artista tiene que ver qué queda libre sin ver su agenda: con quién, para
--    qué, y a qué hora se tatúa cada persona.
--
-- Ver ADR-018.

begin;
select plan(16);

-- --- fixtures (como postgres) ------------------------------------------------

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000d1', 'cliente@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000d2', 'otro-cliente@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000d3', 'artista-turnos@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000d4', 'otro-artista@example.test');

insert into public.profiles (id) values
  ('aaaaaaaa-0000-0000-0000-0000000000d1'),
  ('aaaaaaaa-0000-0000-0000-0000000000d2'),
  ('aaaaaaaa-0000-0000-0000-0000000000d3'),
  ('aaaaaaaa-0000-0000-0000-0000000000d4')
on conflict (id) do nothing;

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000d1', id, 'con-agenda', 'Con Agenda',
       'conagenda', true, 'aaaaaaaa-0000-0000-0000-0000000000d3', now()
from public.categories where slug = 'tattoo';

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000d2', id, 'otra-agenda', 'Otra Agenda',
       'otraagenda', true, 'aaaaaaaa-0000-0000-0000-0000000000d4', now()
from public.categories where slug = 'tattoo';

insert into public.conversations (id, user_id, professional_id) values
  ('eeeeeeee-0000-0000-0000-0000000000d1',
   'aaaaaaaa-0000-0000-0000-0000000000d1',
   'cccccccc-0000-0000-0000-0000000000d1');

-- --- somos el artista dueño de la agenda -------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d3","role":"authenticated"}';

select lives_ok(
  $$select public.schedule_appointment(
      'eeeeeeee-0000-0000-0000-0000000000d1',
      now() + interval '3 days',
      now() + interval '3 days 2 hours',
      'Fine line en el antebrazo')$$,
  'el artista agenda desde su conversación'
);

-- **El test que sostiene todo el almanaque.**
select throws_ok(
  $$select public.schedule_appointment(
      'eeeeeeee-0000-0000-0000-0000000000d1',
      now() + interval '3 days 1 hour',
      now() + interval '3 days 3 hours')$$,
  '23P01',
  null,
  'un turno que se pisa con otro se rechaza'
);

-- Pegado no es pisado: el rango es `[)`, así que las 16:00 del que termina y
-- las 16:00 del que empieza conviven. Sin esto, una agenda llena de turnos
-- consecutivos sería imposible de cargar.
select lives_ok(
  $$select public.schedule_appointment(
      'eeeeeeee-0000-0000-0000-0000000000d1',
      now() + interval '3 days 2 hours',
      now() + interval '3 days 4 hours')$$,
  'dos turnos consecutivos sí entran'
);

select throws_ok(
  $$select public.schedule_appointment(
      'eeeeeeee-0000-0000-0000-0000000000d1',
      now() - interval '1 day',
      now() - interval '1 day' + interval '2 hours')$$,
  '22023',
  null,
  'el pasado no se agenda'
);

select throws_ok(
  $$select public.schedule_appointment(
      'eeeeeeee-0000-0000-0000-0000000000d1',
      now() + interval '5 days 3 hours',
      now() + interval '5 days')$$,
  '22023',
  null,
  'un turno que termina antes de empezar se rechaza'
);

select lives_ok(
  $$insert into public.availability_rules
      (professional_id, weekday, starts_at, ends_at)
    values ('cccccccc-0000-0000-0000-0000000000d1', 2, '14:00', '20:00')$$,
  'el artista carga su horario semanal'
);

select throws_ok(
  $$insert into public.availability_exceptions
      (professional_id, on_date, is_open, starts_at, ends_at)
    values ('cccccccc-0000-0000-0000-0000000000d1', '2026-12-25', false,
            '14:00', '20:00')$$,
  '23514',
  null,
  'un "cerrado de 14 a 20" no existe y no entra'
);

select lives_ok(
  $$insert into public.availability_exceptions
      (professional_id, on_date, is_open)
    values ('cccccccc-0000-0000-0000-0000000000d1', '2026-12-25', false)$$,
  'un día cerrado sí'
);

-- --- somos EL OTRO artista ---------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d4","role":"authenticated"}';

select is(
  (select count(*)::int from public.appointments),
  0,
  'un artista no ve los turnos de otro'
);

select throws_ok(
  $$select public.schedule_appointment(
      'eeeeeeee-0000-0000-0000-0000000000d1',
      now() + interval '9 days',
      now() + interval '9 days 2 hours')$$,
  '42501',
  null,
  'no puede agendar en la conversación de otro artista'
);

select throws_ok(
  $$insert into public.availability_rules
      (professional_id, weekday, starts_at, ends_at)
    values ('cccccccc-0000-0000-0000-0000000000d1', 3, '10:00', '12:00')$$,
  '42501',
  null,
  'no puede escribir el horario de otro'
);

-- Pero el horario de un artista publicado sí se lee: es lo que la persona
-- viene a mirar antes de escribirle.
select is(
  (select count(*)::int from public.availability_rules
   where professional_id = 'cccccccc-0000-0000-0000-0000000000d1'),
  1,
  'el horario de un artista publicado es público'
);

-- Y los huecos ocupados también, sin decir de quién son.
select is(
  (select count(*)::int from public.get_busy_slots(
     'cccccccc-0000-0000-0000-0000000000d1',
     now(), now() + interval '30 days')),
  2,
  'los huecos tomados se ven, para poder ofrecer los libres'
);

select is(
  (select count(*)::int
   from information_schema.columns
   where table_name = 'get_busy_slots'
     and column_name in ('user_id', 'note', 'conversation_id')),
  0,
  'pero un hueco ocupado no dice de quién es, ni de qué'
);

-- --- somos el cliente --------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d1","role":"authenticated"}';

select is(
  (select count(*)::int from public.appointments),
  2,
  'el cliente ve sus propios turnos'
);

select lives_ok(
  $$select public.cancel_appointment(
      (select id from public.appointments order by starts_at limit 1))$$,
  'y puede cancelar el suyo'
);

reset role;
select * from finish();
rollback;
