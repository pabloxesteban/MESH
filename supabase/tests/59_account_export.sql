-- Llevarte lo tuyo: qué entra, qué no, y de quién.
--
-- Cuatro garantías:
--
-- 1. **Entra lo tuyo**, incluido lo que le contaste al asistente.
--
-- 2. **No entra lo que escribieron otros.** El export lleva tus mensajes, no
--    las respuestas del artista. Un archivo que se comparte y se reenvía es una
--    superficie de distribución nueva, y las palabras de otra persona no son
--    tuyas para abrirlas ahí.
--
-- 3. **No entra lo de nadie más.** La función no recibe a quién exportar.
--
-- 4. **Sin sesión no exporta nada.**
--
-- Ver ADR-028.

begin;
select plan(12);

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000b7', 'seva@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000b8', 'artista@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000b9', 'ajena@example.test');

insert into public.profiles (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-0000000000b7', 'Quien Se Va'),
  ('aaaaaaaa-0000-0000-0000-0000000000b8', 'El Artista'),
  ('aaaaaaaa-0000-0000-0000-0000000000b9', 'Otra Persona')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000b7', id, 'el-artista', 'El Artista',
       'elartista', true, 'aaaaaaaa-0000-0000-0000-0000000000b8', now()
from public.categories where slug = 'tattoo';

insert into public.projects
  (id, user_id, category_id, title, description, status)
select 'ffffffff-0000-0000-0000-0000000000b7',
       'aaaaaaaa-0000-0000-0000-0000000000b7', id,
       'Algo de línea fina', 'Lo quiero en el antebrazo, en negro.', 'active'
from public.categories where slug = 'tattoo';

insert into public.conversations (id, user_id, professional_id) values
  ('dddddddd-0000-0000-0000-0000000000b7',
   'aaaaaaaa-0000-0000-0000-0000000000b7',
   'cccccccc-0000-0000-0000-0000000000b7');

insert into public.messages (conversation_id, sender_user_id, body) values
  ('dddddddd-0000-0000-0000-0000000000b7',
   'aaaaaaaa-0000-0000-0000-0000000000b7', 'hola, cuanto sale algo chico'),
  ('dddddddd-0000-0000-0000-0000000000b7',
   'aaaaaaaa-0000-0000-0000-0000000000b8', 'te sale ochenta mil');

insert into public.assistant_threads (id, user_id, category_id)
select 'eeeeeeee-0000-0000-0000-0000000000b7',
       'aaaaaaaa-0000-0000-0000-0000000000b7', id
from public.categories where slug = 'tattoo';

insert into public.assistant_turns (thread_id, role, body) values
  ('eeeeeeee-0000-0000-0000-0000000000b7', 'person', 'algo para mi viejo'),
  ('eeeeeeee-0000-0000-0000-0000000000b7', 'assistant', '¿Dónde lo pensás?');

-- Una búsqueda de otra persona, para probar que no se filtra.
insert into public.projects (id, user_id, category_id, title, status)
select 'ffffffff-0000-0000-0000-0000000000b8',
       'aaaaaaaa-0000-0000-0000-0000000000b9', id, 'La búsqueda de otra',
       'active'
from public.categories where slug = 'tattoo';

-- --- sin sesión ---------------------------------------------------------------

set local role authenticated;

select throws_ok(
  'select public.export_own_account()',
  '28000',
  null,
  'sin sesión no se exporta nada'
);

-- --- con sesión ----------------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b7","role":"authenticated"}';

select is(
  (select public.export_own_account() #>> '{cuenta,correo}'),
  'seva@example.test',
  'el export trae su correo, que ninguna política de cliente alcanza'
);

select is(
  (select public.export_own_account() #>> '{cuenta,nombre}'),
  'Quien Se Va',
  'y su nombre'
);

select is(
  (select jsonb_array_length(public.export_own_account() -> 'busquedas')),
  1,
  'trae su búsqueda, y solo la suya'
);

select is(
  (select public.export_own_account() #>> '{busquedas,0,lo_que_pediste}'),
  'Lo quiero en el antebrazo, en negro.',
  'con lo que escribió adentro'
);

select is(
  (select jsonb_array_length(public.export_own_account() -> 'conversaciones')),
  1,
  'trae la conversación'
);

select is(
  (select jsonb_array_length(
     public.export_own_account() #> '{conversaciones,0,tus_mensajes}')),
  1,
  'con SU mensaje'
);

-- **El test que sostiene la regla de ADR-028.**
select ok(
  (public.export_own_account())::text not like '%ochenta mil%',
  'y sin la respuesta del artista: lo que escribieron otros no es suyo para llevárselo'
);

select is(
  (select public.export_own_account() #>> '{conversaciones,0,con}'),
  'El Artista',
  'aunque sí con quién habló, que es un hecho suyo'
);

-- El asistente entero: del otro lado no hay una persona.
select is(
  (select jsonb_array_length(
     public.export_own_account() #> '{asistente,0,turnos}')),
  2,
  'del asistente vienen los dos lados: enfrente no hay ninguna persona'
);

-- **El test de aislamiento.**
select ok(
  (public.export_own_account())::text not like '%La búsqueda de otra%',
  'la búsqueda de otra persona no aparece por ningún lado'
);

-- --- el artista exporta lo suyo ---------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b8","role":"authenticated"}';

select is(
  (select public.export_own_account() #>> '{perfil_de_artista,nombre}'),
  'El Artista',
  'y quien tiene perfil de artista se lleva también su perfil'
);

reset role;
select * from finish();
rollback;
