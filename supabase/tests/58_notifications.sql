-- Avisos: cuándo se escribe uno, quién lo recibe, y qué no puede contener.
--
-- Cinco garantías, y la primera es la que hace que esta tabla no se convierta
-- en lo que el innegociable 3 prohíbe:
--
-- 1. **Un aviso no tiene texto.** La tabla no tiene dónde escribirlo. Nadie
--    puede inventar urgencia ni filtrar contenido ajeno.
--
-- 2. **El cliente no escribe avisos.** Un aviso es la consecuencia de un hecho.
--
-- 3. **Apagado no escribe nada**, no es que escriba y no muestre.
--
-- 4. **Una cancelación le llega al OTRO**, nunca a quien canceló.
--
-- 5. **Nadie ve la bandeja de nadie.**
--
-- Ver ADR-027.

begin;
select plan(14);

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'persona@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'artista@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000a3', 'callado@example.test');

insert into public.profiles (id) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2'),
  ('aaaaaaaa-0000-0000-0000-0000000000a3')
on conflict (id) do nothing;

-- Todos mayores: la puerta de ADR-025 vive adentro de `schedule_appointment`.
update public.profiles set adult_confirmed_at = now();

-- a3 apagó los avisos.
update public.profiles set notifications_opt_in = false
where id = 'aaaaaaaa-0000-0000-0000-0000000000a3';

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000a1', id, 'avisa', 'Avisa',
       'avisa', true, 'aaaaaaaa-0000-0000-0000-0000000000a2', now()
from public.categories where slug = 'tattoo';

insert into public.conversations (id, user_id, professional_id) values
  ('dddddddd-0000-0000-0000-0000000000a1',
   'aaaaaaaa-0000-0000-0000-0000000000a1',
   'cccccccc-0000-0000-0000-0000000000a1');

-- --- la tabla no tiene dónde escribir un texto --------------------------------

-- **El test que sostiene ADR-027.** Si algún día alguien agrega una columna de
-- texto libre, esto se cae y hay que justificarla.
select is(
  (select count(*)::int
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'notifications'
     and data_type in ('text', 'character varying')),
  0,
  'un aviso no tiene ninguna columna de texto: no hay dónde inventar urgencia'
);

-- --- un turno nuevo -------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2","role":"authenticated"}';

select lives_ok(
  $$select public.schedule_appointment(
      'dddddddd-0000-0000-0000-0000000000a1',
      now() + interval '3 days',
      now() + interval '3 days 2 hours')$$,
  'el artista da un turno'
);

-- Le llega a la PERSONA, no al artista: el turno lo asignó él.
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  (select count(*)::int from public.notifications
   where kind = 'appointment_scheduled'),
  1,
  'y a la persona le llega el aviso'
);

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2","role":"authenticated"}';

select is(
  (select count(*)::int from public.notifications),
  0,
  'al artista no: acaba de hacerlo él'
);

-- --- cancelar ---------------------------------------------------------------------

-- Cancela el artista: el aviso tiene que ir a la persona.
select lives_ok(
  $$select public.cancel_appointment(
      (select id from public.appointments limit 1))$$,
  'el artista cancela'
);

select is(
  (select count(*)::int from public.notifications
   where kind = 'appointment_cancelled'),
  0,
  'y no se avisa a sí mismo'
);

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- **El test de la dirección.**
select is(
  (select count(*)::int from public.notifications
   where kind = 'appointment_cancelled'),
  1,
  'la cancelación le llega al otro'
);

-- --- una denuncia resuelta ---------------------------------------------------------

select lives_ok(
  $$insert into public.reports
      (id, reporter_user_id, target_kind, reason, professional_id)
    values ('99999999-0000-0000-0000-0000000000a1',
            'aaaaaaaa-0000-0000-0000-0000000000a1', 'professional',
            'stolen_work', 'cccccccc-0000-0000-0000-0000000000a1')$$,
  'la persona denuncia'
);

-- El equipo la mira. Pasar a `reviewing` no es una resolución.
reset role;
update public.reports set status = 'reviewing'
where id = '99999999-0000-0000-0000-0000000000a1';

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  (select count(*)::int from public.notifications where kind = 'report_reviewed'),
  0,
  '"la estamos mirando" no es una resolución, y no avisa nada'
);

reset role;
update public.reports set status = 'actioned'
where id = '99999999-0000-0000-0000-0000000000a1';

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- **El test que cierra el hueco que dejó ADR-023.**
select is(
  (select outcome::text from public.notifications
   where kind = 'report_reviewed'),
  'actioned',
  'resuelta sí avisa, con cómo terminó'
);

-- --- apagado no escribe -------------------------------------------------------------

reset role;
insert into public.reports
  (id, reporter_user_id, target_kind, reason, professional_id)
values ('99999999-0000-0000-0000-0000000000a2',
        'aaaaaaaa-0000-0000-0000-0000000000a3', 'professional',
        'spam', 'cccccccc-0000-0000-0000-0000000000a1');

update public.reports set status = 'dismissed'
where id = '99999999-0000-0000-0000-0000000000a2';

-- **El test del interruptor.** Apagado no escribe: no es que escriba y no
-- muestre, porque eso sería guardar avisos sobre alguien que dijo que no.
select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaaaaaaa-0000-0000-0000-0000000000a3'),
  0,
  'a quien los apagó no se le escribe ninguno'
);

-- --- quién puede escribir y leer ------------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

select throws_ok(
  $$insert into public.notifications (user_id, kind, appointment_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'appointment_scheduled',
            (select id from public.appointments limit 1))$$,
  '42501',
  null,
  'el cliente no puede fabricarse un aviso'
);

select lives_ok(
  'select public.mark_notifications_read()',
  'marca leído lo suyo'
);

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2","role":"authenticated"}';

select is(
  (select count(*)::int from public.notifications),
  0,
  'y nadie ve la bandeja de nadie'
);

reset role;
select * from finish();
rollback;
