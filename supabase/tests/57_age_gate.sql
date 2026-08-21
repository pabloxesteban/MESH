-- Mayoría de edad: qué se guarda, y qué no se puede hacer sin declararla.
--
-- Tres garantías:
--
-- 1. **Sin declaración no hay turno.** Es el único lugar de MESH con una
--    consecuencia física, y el único que merece una verificación del servidor.
--
-- 2. **Se chequea a la PERSONA, no a quien llama.** Quien llama es el artista:
--    es él quien asigna el turno desde el chat. Preguntar por `auth.uid()`
--    habría verificado la edad del tatuador, que no es el punto.
--
-- 3. **La declaración no se puede mover ni deshacer.** La primera es la que
--    vale y la que quedó con su hora; desdecirse sería borrar el rastro de
--    haberlo dicho.
--
-- Ver ADR-025.

begin;
select plan(7);

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000091', 'artista@example.test'),
  ('aaaaaaaa-0000-0000-0000-000000000092', 'sindeclarar@example.test');

insert into public.profiles (id) values
  ('aaaaaaaa-0000-0000-0000-000000000091'),
  ('aaaaaaaa-0000-0000-0000-000000000092')
on conflict (id) do nothing;

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-000000000091', id, 'agenda', 'Agenda',
       'agenda', true, 'aaaaaaaa-0000-0000-0000-000000000091', now()
from public.categories where slug = 'tattoo';

insert into public.conversations (id, user_id, professional_id) values
  ('dddddddd-0000-0000-0000-000000000091',
   'aaaaaaaa-0000-0000-0000-000000000092',
   'cccccccc-0000-0000-0000-000000000091');

-- El artista SÍ declaró. La persona no. Si el chequeo mirara a quien llama,
-- este turno se daría igual.
update public.profiles set adult_confirmed_at = now()
where id = 'aaaaaaaa-0000-0000-0000-000000000091';

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000091","role":"authenticated"}';

-- **El test que sostiene ADR-025.**
select throws_ok(
  $$select public.schedule_appointment(
      'dddddddd-0000-0000-0000-000000000091',
      now() + interval '2 days',
      now() + interval '2 days 2 hours')$$,
  'M0018',
  null,
  'sin declaración de la persona no hay turno, aunque el artista sí la haya hecho'
);

-- --- la persona declara ---------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000092","role":"authenticated"}';

select is(
  (select adult_confirmed_at from public.profiles
   where id = 'aaaaaaaa-0000-0000-0000-000000000092'),
  null,
  'antes de declarar no hay ninguna fecha guardada'
);

select lives_ok(
  'select public.confirm_adult()',
  'la persona declara que es mayor'
);

select isnt(
  (select adult_confirmed_at from public.profiles
   where id = 'aaaaaaaa-0000-0000-0000-000000000092'),
  null,
  'y queda la fecha en que lo dijo'
);

-- **El test de idempotencia.** La primera declaración es la que vale: si la
-- fecha se moviera, bastaría con volver a tocar el botón para borrar el rastro
-- de cuándo se dijo.
create temporary table declaracion_previa as
select adult_confirmed_at as cuando
from public.profiles
where id = 'aaaaaaaa-0000-0000-0000-000000000092';

select public.confirm_adult();

select is(
  (select adult_confirmed_at from public.profiles
   where id = 'aaaaaaaa-0000-0000-0000-000000000092'),
  (select cuando from declaracion_previa),
  'volver a declararlo no mueve la fecha'
);

-- Escribir la columna a mano sobre la ficha de otro no falla: no encuentra
-- ninguna fila, que es lo que corresponde. Lo que importa es que no la toque.
update public.profiles set adult_confirmed_at = now() - interval '10 years'
where id = 'aaaaaaaa-0000-0000-0000-000000000091';

reset role;

select ok(
  (select adult_confirmed_at from public.profiles
   where id = 'aaaaaaaa-0000-0000-0000-000000000091') > now() - interval '1 hour',
  'y no puede escribirle una declaración vieja a otra persona'
);

set local role authenticated;

-- --- ahora sí, el turno --------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000091","role":"authenticated"}';

select lives_ok(
  $$select public.schedule_appointment(
      'dddddddd-0000-0000-0000-000000000091',
      now() + interval '2 days',
      now() + interval '2 days 2 hours')$$,
  'con la declaración hecha, el turno se da'
);

reset role;
select * from finish();
rollback;
