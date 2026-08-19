-- Alta propia de artista.
--
-- Abrir el alta es lo que más superficie agrega de todo lo que se construyó:
-- hasta acá nadie podía escribir una fila de `professionals`. Las preguntas que
-- deciden si esto es publicable son tres — ¿puede alguien crear dos perfiles?
-- ¿puede tocar el de otro? ¿puede marcarse como registro de prueba y saltearse
-- los cortes que dependen de esa columna?
--
-- Ver ADR-013.

begin;
select plan(18);

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000b1', 'artista@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000b2', 'otra@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000b3', 'tocaya@example.test');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b1","role":"authenticated"}';

-- --- crear ---------------------------------------------------------------

select is(
  public.create_own_professional('Pablo Esteban', 'pablo.tattoo', null),
  'pablo-esteban',
  'El slug se deriva del nombre'
);

select is(
  (select owner_user_id from public.professionals where slug = 'pablo-esteban'),
  'aaaaaaaa-0000-0000-0000-0000000000b1'::uuid,
  'El perfil queda a nombre de quien llamó'
);

-- Si el alta creara perfiles sin publicar, no se podría recorrer el producto:
-- no aparecerían en el mazo ni en los matches de nadie.
select is(
  (select is_published from public.professionals where slug = 'pablo-esteban'),
  true,
  'El perfil nace publicado'
);

-- Marcar como ficticio un perfil que hizo una persona sería mentir en la
-- dirección contraria, y `is_fixture` corta el contacto y muestra una insignia.
select is(
  (select is_fixture from public.professionals where slug = 'pablo-esteban'),
  false,
  'Un perfil hecho por una persona NO es un registro de prueba'
);

select throws_ok(
  $$ select public.create_own_professional('Otro Nombre', 'otro.h', null) $$,
  '23505',
  null,
  'Una persona no puede tener dos perfiles'
);

-- --- estilos propios ------------------------------------------------------

select lives_ok(
  $$ select public.set_own_styles(array['fine-line', 'blackwork']) $$,
  'El artista declara sus estilos'
);

select is(
  (select count(*) from public.professional_styles ps
   join public.professionals p on p.id = ps.professional_id
   where p.slug = 'pablo-esteban'),
  2::bigint,
  'Quedaron los dos estilos'
);

-- Sin esto el componente Estilo del matching —que pesa 0,70— le da cero al
-- artista, y existe en el catálogo sin aparecer nunca en los resultados.
select is(
  (select count(*) from public.professional_styles ps
   join public.professionals p on p.id = ps.professional_id
   where p.slug = 'pablo-esteban' and ps.is_primary),
  2::bigint,
  'Los primeros estilos quedan primarios'
);

select lives_ok(
  $$ select public.set_own_styles(array['blackwork']) $$,
  'Volver a declarar reemplaza el conjunto entero'
);

select is(
  (select count(*) from public.professional_styles ps
   join public.professionals p on p.id = ps.professional_id
   where p.slug = 'pablo-esteban'),
  1::bigint,
  'El estilo que se sacó ya no está'
);

-- Guardar en silencio menos estilos de los que la persona eligió es peor que
-- fallar: creería que se recomienda por algo que no quedó guardado.
select throws_ok(
  $$ select public.set_own_styles(array['fine-line', 'no-existe']) $$,
  '23503',
  null,
  'Un estilo inexistente falla en vez de saltearse'
);

-- --- ubicación con barrio -------------------------------------------------

select lives_ok(
  $$ select public.set_studio_location(-34.5875, -58.4371, 'palermo') $$,
  'La ubicación guarda coordenadas y barrio'
);

select is(
  (select l.slug::text from public.professionals p
   join public.locations l on l.id = p.location_id
   where p.slug = 'pablo-esteban'),
  'palermo',
  'El barrio quedó en location_id, que es lo que puntúa el matching'
);

-- Un geocoder puede fallar una vez. Perder un barrio bueno por eso sería peor
-- que ignorar el fallo.
select lives_ok(
  $$ select public.set_studio_location(-34.60, -58.38, 'barrio-que-no-existe') $$,
  'Un barrio no reconocido no rompe la escritura'
);

select is(
  (select l.slug::text from public.professionals p
   join public.locations l on l.id = p.location_id
   where p.slug = 'pablo-esteban'),
  'palermo',
  'Un barrio no reconocido tampoco borra el que ya estaba'
);

-- --- nadie toca el perfil de otro -----------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b2","role":"authenticated"}';

select throws_ok(
  $$ select public.set_own_styles(array['fine-line']) $$,
  'P0002',
  null,
  'Sin perfil propio no se pueden declarar estilos'
);

-- El caso que importa: no es "un desconocido no puede", es "otro artista
-- legítimo tampoco".
select is(
  public.create_own_professional('Otra Persona', 'otra.h', null),
  'otra-persona',
  'Otra persona crea el suyo'
);

select is(
  (select count(*) from public.professional_styles ps
   join public.professionals p on p.id = ps.professional_id
   where p.slug = 'pablo-esteban'),
  1::bigint,
  'Nada de lo anterior tocó los estilos del primero'
);

reset role;

select * from finish();
rollback;
