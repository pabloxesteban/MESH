-- Búsquedas abiertas: la otra dirección de MESH.
--
-- Acá una persona expone fotos que subió para sí misma. La pregunta que decide
-- si esto es publicable no es "¿anda el mazo del artista?" — es **¿puede un
-- artista ver una búsqueda que nadie abrió?**. Todo lo demás es interfaz.
--
-- Y la segunda, que es la que se olvida: una búsqueda que se cierra tiene que
-- volver a ser privada de inmediato, sin migrar ni limpiar nada.
--
-- Ver ADR-014.

begin;
select plan(24);

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000d1', 'busca@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000d2', 'artista@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000d3', 'otro.artista@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000d4', 'curiosa@example.test');

-- El artista que hace fine-line, publicado.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000d1', id, 'artista-fina', 'Artista Fina',
       'artistafina', true, 'aaaaaaaa-0000-0000-0000-0000000000d2', now()
from public.categories where slug = 'tattoo';

-- Otro artista, publicado, pero que hace otra cosa.
insert into public.professionals
  (id, category_id, slug, display_name, instagram_handle, is_published,
   owner_user_id, claimed_at)
select 'cccccccc-0000-0000-0000-0000000000d2', id, 'artista-negra', 'Artista Negra',
       'artistanegra', true, 'aaaaaaaa-0000-0000-0000-0000000000d3', now()
from public.categories where slug = 'tattoo';

insert into public.professional_styles (professional_id, style_id, proficiency, is_primary)
select 'cccccccc-0000-0000-0000-0000000000d1', id, 1.0, true
from public.styles where slug = 'fine-line';

insert into public.professional_styles (professional_id, style_id, proficiency, is_primary)
select 'cccccccc-0000-0000-0000-0000000000d2', id, 1.0, true
from public.styles where slug = 'old-school';

-- Dos búsquedas de la misma persona: una abierta, una privada. Las dos piden
-- fine-line, así que lo único que las distingue es el interruptor.
insert into public.projects
  (id, user_id, category_id, title, is_open_to_professionals)
select 'ffffffff-0000-0000-0000-0000000000f1',
       'aaaaaaaa-0000-0000-0000-0000000000d1', id, 'Una linea fina', true
from public.categories where slug = 'tattoo';

insert into public.projects
  (id, user_id, category_id, title, is_open_to_professionals)
select 'ffffffff-0000-0000-0000-0000000000f2',
       'aaaaaaaa-0000-0000-0000-0000000000d1', id, 'Algo privado', false
from public.categories where slug = 'tattoo';

insert into public.project_styles (project_id, style_id, weight)
select 'ffffffff-0000-0000-0000-0000000000f1', id, 1.0
from public.styles where slug = 'fine-line';

insert into public.project_styles (project_id, style_id, weight)
select 'ffffffff-0000-0000-0000-0000000000f2', id, 1.0
from public.styles where slug = 'fine-line';

-- --- el artista que hace lo que se pide --------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d2","role":"authenticated"}';

select is(
  (select count(*) from public.get_open_search_feed('tattoo')),
  1::bigint,
  'El artista ve la búsqueda abierta que pide su estilo'
);

select is(
  (select project_id from public.get_open_search_feed('tattoo')),
  'ffffffff-0000-0000-0000-0000000000f1'::uuid,
  'Es la abierta, no la privada'
);

-- Este es EL test. Una búsqueda que nadie abrió no se ve, y no alcanza con que
-- no aparezca en el feed: la tabla tampoco se puede leer.
select is(
  (select count(*) from public.projects
   where id = 'ffffffff-0000-0000-0000-0000000000f2'),
  0::bigint,
  'Una búsqueda privada no existe para un artista, ni siquiera por id'
);

-- El feed devuelve la búsqueda, no a quien la hizo.
-- No es un detalle de implementación: es la garantía del producto. Si algún
-- día alguien agrega `user_id` a la proyección "porque hace falta para el
-- join", esto falla y hay que justificarlo.
select ok(
  (select pg_get_function_result(p.oid)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'get_open_search_feed')
    not like '%user_id%',
  'El feed no devuelve la identidad de quien busca'
);

select is(
  (select style_slugs from public.get_open_search_feed('tattoo')),
  array['fine-line'],
  'Vienen los estilos que pide'
);

-- --- el artista que hace otra cosa -------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d3","role":"authenticated"}';

-- No es "un match flojo": mostrarle una búsqueda de fine-line a alguien que
-- hace old-school es ruido, y el ruido vacía el mazo de sentido.
select is(
  (select count(*) from public.get_open_search_feed('tattoo')),
  0::bigint,
  'Un artista que no hace el estilo pedido no ve la búsqueda'
);

-- --- alguien sin perfil de artista -------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d4","role":"authenticated"}';

select is(
  (select count(*) from public.get_open_search_feed('tattoo')),
  0::bigint,
  'Sin perfil publicado el feed viene vacío, no falla'
);

select throws_ok(
  $$
    insert into public.project_interests
      (project_id, professional_id, verdict,
       price_min_cents, price_max_cents, price_currency, sessions)
    values ('ffffffff-0000-0000-0000-0000000000f1',
            'cccccccc-0000-0000-0000-0000000000d1', 'interest',
            8000000, 12000000, 'ARS', 1)
  $$,
  '42501',
  null,
  'Nadie manda interés a nombre de un profesional ajeno'
);

-- --- el interés ---------------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d2","role":"authenticated"}';

select lives_ok(
  $$
    insert into public.project_interests
      (project_id, professional_id, verdict,
       price_min_cents, price_max_cents, price_currency, sessions)
    values ('ffffffff-0000-0000-0000-0000000000f1',
            'cccccccc-0000-0000-0000-0000000000d1', 'interest',
            8000000, 12000000, 'ARS', 1)
  $$,
  'El artista levanta la mano ante una búsqueda abierta'
);

select throws_ok(
  $$
    insert into public.project_interests (project_id, professional_id, verdict)
    values ('ffffffff-0000-0000-0000-0000000000f1',
            'cccccccc-0000-0000-0000-0000000000d1', 'pass')
  $$,
  '23505',
  null,
  'Una búsqueda se decide una sola vez'
);

-- Adivinar el uuid de una búsqueda privada no alcanza: la política pide que
-- esté abierta, y sin eso la persona vería aparecer un artista sobre algo que
-- nunca publicó.
select throws_ok(
  $$
    insert into public.project_interests
      (project_id, professional_id, verdict,
       price_min_cents, price_max_cents, price_currency, sessions)
    values ('ffffffff-0000-0000-0000-0000000000f2',
            'cccccccc-0000-0000-0000-0000000000d1', 'interest',
            8000000, 12000000, 'ARS', 1)
  $$,
  '42501',
  null,
  'No se manda interés a una búsqueda privada, ni sabiendo su id'
);

select is(
  (select count(*) from public.get_open_search_feed('tattoo')),
  0::bigint,
  'Lo que ya decidió no vuelve al mazo'
);

-- Un interés NO es un mensaje: no abre ninguna conversación.
select is(
  (select count(*) from public.conversations),
  0::bigint,
  'Levantar la mano no abre un chat'
);

-- Un paso es una decisión privada del artista, igual que el paso de una
-- persona sobre una obra. Que exista la fila no significa que alguien la vea.
reset role;
insert into public.project_interests (project_id, professional_id, verdict)
values ('ffffffff-0000-0000-0000-0000000000f1',
        'cccccccc-0000-0000-0000-0000000000d2', 'pass');
set local role authenticated;

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d1","role":"authenticated"}';

select is(
  (select count(*) from public.project_interests where verdict = 'pass'),
  0::bigint,
  'A nadie le llega la noticia de que la pasaron de largo'
);

-- --- lo que ve la persona -----------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d1","role":"authenticated"}';

select is(
  (select count(*) from public.get_search_interests(
    'ffffffff-0000-0000-0000-0000000000f1')),
  1::bigint,
  'La persona ve quién levantó la mano'
);

select is(
  (select professional_slug from public.get_search_interests(
    'ffffffff-0000-0000-0000-0000000000f1')),
  'artista-fina',
  'Y ve quién es: del lado del artista la identidad sí va completa'
);

-- Sin argumento: todas las búsquedas propias de una, que es lo que necesita la
-- pestaña — nadie piensa "en cuál de mis búsquedas fue".
select is(
  (select count(*) from public.get_search_interests()),
  1::bigint,
  'Sin argumento vienen los interesados en todas mis búsquedas'
);

-- --- una búsqueda ajena -------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d4","role":"authenticated"}';

select is(
  (select count(*) from public.get_search_interests(
    'ffffffff-0000-0000-0000-0000000000f1')),
  0::bigint,
  'Nadie ve los interesados en una búsqueda que no es suya'
);

select is(
  (select count(*) from public.project_interests),
  0::bigint,
  'Un tercero no lee la tabla de intereses'
);

-- --- descartar ----------------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d2","role":"authenticated"}';

-- El artista ve el suyo, pero no puede retirarlo: igual que un mensaje no se
-- desmanda.
select is(
  (select count(*) from public.project_interests),
  1::bigint,
  'El artista ve a qué levantó la mano'
);

-- Deshacer existe porque una decisión de una décima de segundo se equivoca.
-- Sin esto, el mazo castiga el error mandándole a una persona un interés que
-- no era.
delete from public.project_interests
  where project_id = 'ffffffff-0000-0000-0000-0000000000f1';

select is(
  (select count(*) from public.project_interests),
  0::bigint,
  'El artista deshace su decisión'
);

select is(
  (select count(*) from public.get_open_search_feed('tattoo')),
  1::bigint,
  'Y la búsqueda vuelve al mazo'
);

-- De nuevo, para poder probar el descarte del otro lado.
insert into public.project_interests
  (project_id, professional_id, verdict,
   price_min_cents, price_max_cents, price_currency, sessions)
values ('ffffffff-0000-0000-0000-0000000000f1',
        'cccccccc-0000-0000-0000-0000000000d1', 'interest',
        8000000, 12000000, 'ARS', 1);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d1","role":"authenticated"}';

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d1","role":"authenticated"}';

delete from public.project_interests
  where project_id = 'ffffffff-0000-0000-0000-0000000000f1';

select is(
  (select count(*) from public.get_search_interests(
    'ffffffff-0000-0000-0000-0000000000f1')),
  0::bigint,
  'La persona descarta: su bandeja, su decisión'
);

-- --- cerrar una búsqueda -------------------------------------------------------

-- Sin migrar nada, sin limpiar nada: apagar el interruptor la vuelve privada en
-- la siguiente lectura.
update public.projects
  set is_open_to_professionals = false
  where id = 'ffffffff-0000-0000-0000-0000000000f1';

-- El otro artista pasa a hacer fine-line tambien, para que lo único que pueda
-- explicar un feed vacío sea el interruptor apagado.
reset role;
insert into public.professional_styles (professional_id, style_id, proficiency, is_primary)
select 'cccccccc-0000-0000-0000-0000000000d2', id, 1.0, false
from public.styles where slug = 'fine-line';

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000d3","role":"authenticated"}';

select is(
  (select count(*) from public.get_open_search_feed('tattoo')),
  0::bigint,
  'Cerrarla la saca del mazo de todos, en la lectura siguiente'
);

reset role;

select * from finish();
rollback;
