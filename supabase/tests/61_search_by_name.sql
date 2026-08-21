-- Buscar a alguien por nombre.
--
-- Seis garantías:
--
-- 1. **Los acentos no esconden a nadie.** "martin" encuentra a Martín, y al
--    revés también.
-- 2. **Alcanza con un pedazo del apellido**, no hay que escribir el nombre
--    entero ni empezar por el principio.
-- 3. **Quien todavía no subió obra aparece igual.** La grilla lo esconde
--    —su tarjeta saldría vacía— pero una búsqueda por nombre es puntería.
-- 4. **Lo que no está publicado no se encuentra**, ni escribiendo el nombre
--    exacto.
-- 5. **A quien bloqueaste no lo encontrás.** El bloqueo se impone en la base,
--    no en la pantalla.
-- 6. **Un comodín no devuelve el catálogo.** Escribir `%` es escribir `%`.
--
-- Y el orden: primero el exacto, después el que arranca así.

begin;
select plan(13);

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000d1', 'busca@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000d2', 'duena@example.test');

insert into public.profiles (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-0000000000d1', 'Quien busca'),
  ('aaaaaaaa-0000-0000-0000-0000000000d2', 'La duena')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000d1', id, 'martin-quiroga',
       'Martín Quiroga', 'martinq', true
from public.categories where slug = 'tattoo';

insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000d2', id, 'martina-sosa',
       'Martina Sosa', 'martinas', true
from public.categories where slug = 'tattoo';

-- Publicada y sin una sola obra. La grilla la esconde; la búsqueda no.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000d3', id, 'delfina-roig',
       'Delfina Roig', 'delfinaroig', true
from public.categories where slug = 'tattoo';

-- Sin publicar: no existe para nadie.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000d4', id, 'martin-oculto',
       'Martín Oculto', 'martinoculto', false,
       'aaaaaaaa-0000-0000-0000-0000000000d2', now()
from public.categories where slug = 'tattoo';

-- Los dos Martín sí tienen obra, para que el desempate por obra no los mueva.
insert into public.media_assets (id, bucket, path, mime_type, width, height)
values
  ('eeeeeeee-0000-0000-0000-0000000000d1', 'portfolio', 'd1.jpg',
   'image/jpeg', 800, 1000),
  ('eeeeeeee-0000-0000-0000-0000000000d2', 'portfolio', 'd2.jpg',
   'image/jpeg', 800, 1000);

insert into public.portfolio_items (professional_id, media_id, sort_order)
values
  ('cccccccc-0000-0000-0000-0000000000d1',
   'eeeeeeee-0000-0000-0000-0000000000d1', 0),
  ('cccccccc-0000-0000-0000-0000000000d2',
   'eeeeeeee-0000-0000-0000-0000000000d2', 0);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d1","role":"authenticated"}';

-- --- acentos -----------------------------------------------------------------

select is(
  (select count(*)::int from public.search_professionals('tattoo', 'martin')),
  2,
  'sin tilde encuentra a Martín y a Martina'
);

select is(
  (select count(*)::int from public.search_professionals('tattoo', 'MARTÍN')),
  2,
  'con tilde y en mayúscula, lo mismo'
);

-- --- un pedazo del apellido ---------------------------------------------------

select is(
  (select display_name from public.search_professionals('tattoo', 'roig')),
  'Delfina Roig',
  'alcanza con el apellido: no hay que arrancar por el principio'
);

-- --- sin obra -----------------------------------------------------------------

select is(
  (select jsonb_array_length(pieces) from public.search_professionals('tattoo', 'roig')),
  0,
  'y aparece aunque no haya subido una sola obra'
);

select is(
  (select count(*)::int from public.get_artist_grid('tattoo')
   where slug = 'delfina-roig'),
  0,
  'la grilla, en cambio, sigue sin mostrarla: su tarjeta saldría vacía'
);

-- --- el orden -----------------------------------------------------------------

select is(
  (select slug from public.search_professionals('tattoo', 'martin quiroga')
   limit 1),
  'martin-quiroga',
  'el nombre exacto va primero'
);

select is(
  (select slug from public.search_professionals('tattoo', 'martina') limit 1),
  'martina-sosa',
  'y el que arranca así, antes que el que lo lleva adentro'
);

-- --- lo que no está publicado --------------------------------------------------

select is(
  (select count(*)::int from public.search_professionals('tattoo', 'oculto')),
  0,
  'a quien no publicó su perfil no se lo encuentra ni con el nombre exacto'
);

-- --- comodines y ruido ---------------------------------------------------------

-- Dos caracteres para pasar el piso de largo: lo que se está probando acá es
-- el escapado, no el mínimo. Sin escapar, `like '%%%%%'` devuelve el catálogo
-- entero como si fuera un resultado de búsqueda.
select is(
  (select count(*)::int from public.search_professionals('tattoo', '%%')),
  0,
  'un comodín es un carácter, no una llave del catálogo'
);

select is(
  (select count(*)::int from public.search_professionals('tattoo', 'm_rtin')),
  0,
  'y el guión bajo tampoco es un comodín'
);

select is(
  (select count(*)::int from public.search_professionals('tattoo', 'm')),
  0,
  'una sola letra no es una búsqueda: es un teclado a medio escribir'
);

select is(
  (select count(*)::int from public.search_professionals('tattoo', '   ')),
  0,
  'y el vacío tampoco devuelve nada'
);

-- --- el bloqueo ----------------------------------------------------------------

insert into public.blocks (blocker_user_id, blocked_professional_id)
values ('aaaaaaaa-0000-0000-0000-0000000000d1',
        'cccccccc-0000-0000-0000-0000000000d1');

select is(
  (select count(*)::int from public.search_professionals('tattoo', 'martin')),
  1,
  'a quien bloqueaste no lo encontrás ni buscándolo por su nombre'
);

select * from finish();
rollback;
