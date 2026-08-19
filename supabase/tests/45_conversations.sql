-- Aislamiento del chat.
--
-- La pregunta que decide si esto es publicable: ¿puede alguien leer una
-- conversación en la que no está? Todo lo demás del chat es interfaz.
--
-- Se ejecuta como `authenticated` con un claim `sub`, igual que 20_cross_user:
-- correr como `postgres` probaría que postgres puede hacer cosas, que no es
-- ninguna noticia.

begin;
select plan(16);

-- --- fixtures (como postgres) ------------------------------------------------

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'cliente@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'intrusa@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000a3', 'artista@example.test');

-- Reclamado y publicado: se puede chatear.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000c1', id, 'reclamada', 'Reclamada',
       'reclamada', true, 'aaaaaaaa-0000-0000-0000-0000000000a3', now()
from public.categories where slug = 'tattoo';

-- Publicado pero SIN dueño: no hay nadie del otro lado.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000c2', id, 'sin-duenio', 'Sin dueño',
       'sinduenio', true
from public.categories where slug = 'tattoo';

-- --- somos el cliente --------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok(
  $$
    insert into public.conversations (id, user_id, professional_id)
    values ('eeeeeeee-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000a1',
            'cccccccc-0000-0000-0000-0000000000c1')
  $$,
  'La persona abre un hilo con un perfil reclamado y publicado'
);

-- Un hilo contra un perfil sin dueño sería una bandeja de salida que no llega
-- a ningún lado: el mensaje quedaría escrito y nadie podría leerlo nunca.
select throws_ok(
  $$
    insert into public.conversations (user_id, professional_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000a1',
            'cccccccc-0000-0000-0000-0000000000c2')
  $$,
  '42501',
  null,
  'No se puede abrir un hilo con un perfil sin reclamar'
);

select throws_ok(
  $$
    insert into public.conversations (user_id, professional_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000a2',
            'cccccccc-0000-0000-0000-0000000000c1')
  $$,
  '42501',
  null,
  'No se puede abrir un hilo en nombre de otra persona'
);

select lives_ok(
  $$
    insert into public.messages (id, conversation_id, sender_user_id, body)
    values ('ffffffff-0000-0000-0000-0000000000f1',
            'eeeeeeee-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000a1',
            'Hola, quería consultarte por un diseño')
  $$,
  'La persona escribe en su propio hilo'
);

-- Sin esto, alguien podría escribir en su propio hilo firmando con el id de
-- otro y hacer aparecer un mensaje que esa persona nunca mandó.
select throws_ok(
  $$
    insert into public.messages (conversation_id, sender_user_id, body)
    values ('eeeeeeee-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000a3',
            'firmado con el id de la artista')
  $$,
  '42501',
  null,
  'No se puede firmar un mensaje con el id de otro, ni en el hilo propio'
);

select is(
  (select last_message_at is not null from public.conversations
   where id = 'eeeeeeee-0000-0000-0000-0000000000e1'),
  true,
  'El trigger movió last_message_at al insertar el mensaje'
);

-- Un mensaje es un registro, no un borrador.
select throws_ok(
  $$
    update public.messages set body = 'otra cosa'
    where id = 'ffffffff-0000-0000-0000-0000000000f1'
  $$,
  '42501',
  null,
  'Nadie edita un mensaje, ni el que lo escribió'
);

select throws_ok(
  $$ delete from public.messages
     where id = 'ffffffff-0000-0000-0000-0000000000f1' $$,
  '42501',
  null,
  'Nadie borra un mensaje: la conversación también es del otro'
);

select lives_ok(
  $$ select public.mark_conversation_read('eeeeeeee-0000-0000-0000-0000000000e1') $$,
  'La persona marca leído su propio hilo'
);

select is(
  (select professional_read_at from public.conversations
   where id = 'eeeeeeee-0000-0000-0000-0000000000e1'),
  null,
  'Marcar leído del lado propio NO tocó el del otro'
);

-- --- somos la intrusa --------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2","role":"authenticated"}';

select is(
  (select count(*) from public.conversations),
  0::bigint,
  'Una tercera persona no ve ningún hilo ajeno'
);

select is(
  (select count(*) from public.messages),
  0::bigint,
  'Una tercera persona no ve ningún mensaje ajeno'
);

select throws_ok(
  $$
    insert into public.messages (conversation_id, sender_user_id, body)
    values ('eeeeeeee-0000-0000-0000-0000000000e1',
            'aaaaaaaa-0000-0000-0000-0000000000a2',
            'me metí en un hilo ajeno')
  $$,
  '42501',
  null,
  'Una tercera persona NO puede escribir en un hilo ajeno'
);

select throws_ok(
  $$ select public.mark_conversation_read('eeeeeeee-0000-0000-0000-0000000000e1') $$,
  'P0002',
  null,
  'Marcar leído un hilo ajeno falla igual que uno inexistente'
);

-- --- somos la artista dueña --------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a3","role":"authenticated"}';

select is(
  (select count(*) from public.messages),
  1::bigint,
  'La dueña del perfil SÍ lee los mensajes que le mandaron'
);

-- El artista responde, no inicia. Al revés sería un canal de mensajes no
-- pedidos hacia gente que solo miró un perfil.
select throws_ok(
  $$
    insert into public.conversations (user_id, professional_id)
    values ('aaaaaaaa-0000-0000-0000-0000000000a2',
            'cccccccc-0000-0000-0000-0000000000c1')
  $$,
  '42501',
  null,
  'La artista NO puede abrir un hilo con alguien que no le escribió'
);

reset role;

select * from finish();
rollback;
