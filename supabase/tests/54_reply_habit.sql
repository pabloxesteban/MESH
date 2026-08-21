-- Con qué frecuencia contesta un artista: qué se dice, y cuándo no se dice nada.
--
-- Cuatro garantías, y la tercera es la que hace que esto sirva para algo:
--
-- 1. **Con pocos datos no se dice nada.** Dos conversaciones no son una
--    costumbre. `null` y no un valor por default.
-- 2. **Se calcula al leer**, de mensajes que ocurrieron, con sus fechas.
-- 3. **Una conversación sin contestar cuenta como lenta.** Si solo contaran las
--    contestadas, quien contesta una de cada diez —rápido— se vería impecable:
--    el ghosteo premiado por la métrica que existe para mostrarlo.
-- 4. **Pero solo pasadas 72 horas.** Un mensaje de esta mañana todavía no dice
--    nada de nadie.
--
-- Ver ADR-022.

begin;
select plan(6);

delete from public.professionals;

-- Ocho personas distintas y no tres reutilizadas: `conversations` tiene una
-- sola fila por par (persona, artista), así que cada conversación necesita a
-- alguien nuevo del otro lado. Es la misma restricción que hace que abrir el
-- chat dos veces no cree dos hilos.
insert into auth.users (id, email)
select ('aaaaaaaa-0000-0000-0000-0000000000d' || n)::uuid,
       'escribe' || n || '@example.test'
from generate_series(1, 9) as n;

insert into public.profiles (id)
select ('aaaaaaaa-0000-0000-0000-0000000000d' || n)::uuid
from generate_series(1, 9) as n
on conflict (id) do nothing;

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000d1', id, 'contesta', 'Contesta',
       'contesta', true, 'aaaaaaaa-0000-0000-0000-0000000000d1', now()
from public.categories where slug = 'tattoo';

-- Una conversación por persona: d2..d9 contra el mismo artista.
insert into public.conversations (id, user_id, professional_id)
select ('dddddddd-0000-0000-0000-0000000000d' || n)::uuid,
       ('aaaaaaaa-0000-0000-0000-0000000000d' || (n + 1))::uuid,
       'cccccccc-0000-0000-0000-0000000000d1'
from generate_series(1, 8) as n;

-- Dos conversaciones contestadas en el día.
insert into public.messages (conversation_id, sender_user_id, body, created_at)
values
  ('dddddddd-0000-0000-0000-0000000000d1',
   'aaaaaaaa-0000-0000-0000-0000000000d2', 'hola', now() - interval '10 days'),
  ('dddddddd-0000-0000-0000-0000000000d1',
   'aaaaaaaa-0000-0000-0000-0000000000d1', 'hola', now() - interval '10 days' + interval '2 hours'),
  ('dddddddd-0000-0000-0000-0000000000d2',
   'aaaaaaaa-0000-0000-0000-0000000000d3', 'hola', now() - interval '9 days'),
  ('dddddddd-0000-0000-0000-0000000000d2',
   'aaaaaaaa-0000-0000-0000-0000000000d1', 'hola', now() - interval '9 days' + interval '3 hours');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d2","role":"authenticated"}';

-- **El test que evita el adorno.**
select is(
  public.get_reply_habit('cccccccc-0000-0000-0000-0000000000d1'),
  null,
  'con dos conversaciones no se dice nada: eso es una anécdota, no una costumbre'
);

-- La tercera, también contestada rápido.
set local role postgres;
insert into public.messages (conversation_id, sender_user_id, body, created_at)
values
  ('dddddddd-0000-0000-0000-0000000000d3',
   'aaaaaaaa-0000-0000-0000-0000000000d4', 'hola', now() - interval '8 days'),
  ('dddddddd-0000-0000-0000-0000000000d3',
   'aaaaaaaa-0000-0000-0000-0000000000d1', 'hola', now() - interval '8 days' + interval '1 hour');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d2","role":"authenticated"}';

select is(
  public.get_reply_habit('cccccccc-0000-0000-0000-0000000000d1')::text,
  'same_day',
  'con tres contestadas en el día, se dice que contesta en el día'
);

-- Una conversación de esta mañana, sin contestar: todavía no dice nada.
set local role postgres;
insert into public.messages (conversation_id, sender_user_id, body, created_at)
values
  ('dddddddd-0000-0000-0000-0000000000d4',
   'aaaaaaaa-0000-0000-0000-0000000000d5', 'hola', now() - interval '2 hours');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d2","role":"authenticated"}';

-- **El test que evita castigar a alguien por no haber leído todavía.**
select is(
  public.get_reply_habit('cccccccc-0000-0000-0000-0000000000d1')::text,
  'same_day',
  'un mensaje de hace dos horas sin contestar no cuenta todavía'
);

-- Tres conversaciones viejas sin contestar nunca.
set local role postgres;
insert into public.messages (conversation_id, sender_user_id, body, created_at)
values
  ('dddddddd-0000-0000-0000-0000000000d5',
   'aaaaaaaa-0000-0000-0000-0000000000d6', 'hola', now() - interval '20 days'),
  ('dddddddd-0000-0000-0000-0000000000d6',
   'aaaaaaaa-0000-0000-0000-0000000000d7', 'hola', now() - interval '21 days');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d2","role":"authenticated"}';

-- **El test que sostiene ADR-022.** Tres contestadas rápido y dos nunca: la
-- mediana de cinco cae en la tercera, todavía rápida. Con una más sin contestar
-- se da vuelta, y eso es lo que se prueba abajo.
select is(
  public.get_reply_habit('cccccccc-0000-0000-0000-0000000000d1')::text,
  'same_day',
  'tres contestadas y dos abandonadas: la mediana todavía dice que contesta'
);

set local role postgres;
insert into public.messages (conversation_id, sender_user_id, body, created_at)
values
  ('dddddddd-0000-0000-0000-0000000000d7',
   'aaaaaaaa-0000-0000-0000-0000000000d8', 'hola', now() - interval '22 days'),
  ('dddddddd-0000-0000-0000-0000000000d8',
   'aaaaaaaa-0000-0000-0000-0000000000d9', 'hola', now() - interval '23 days');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d2","role":"authenticated"}';

select is(
  public.get_reply_habit('cccccccc-0000-0000-0000-0000000000d1')::text,
  'slower',
  'con más conversaciones abandonadas que contestadas, se dice que tarda'
);

-- Un artista sin ninguna conversación.
set local role postgres;
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000d2', id, 'recien-llega', 'Recién Llega',
       'recienllega', true, null, null
from public.categories where slug = 'tattoo';

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d2","role":"authenticated"}';

select is(
  public.get_reply_habit('cccccccc-0000-0000-0000-0000000000d2'),
  null,
  'y de quien recién llega no se dice nada: no hay con qué'
);

reset role;
select * from finish();
rollback;
