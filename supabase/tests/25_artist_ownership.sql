-- Aislamiento del flujo de artista.
--
-- La pregunta que decide si esto es publicable: ¿puede un artista tocar el
-- perfil de otro? Todo lo demás del flujo es interfaz.
--
-- Se ejecuta como `authenticated` con un claim `sub`, igual que 20_cross_user:
-- correr como `postgres` probaría que postgres puede hacer cosas, que no es
-- ninguna noticia.

begin;
select plan(23);

-- --- fixtures (como postgres) ------------------------------------------------

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'briza@example.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'otra@example.test');

-- Dos perfiles sin reclamar, cada uno con su código.
insert into public.professionals (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000c1', id, 'briza', 'Briza', 'briza', true
from public.categories where slug = 'tattoo';

insert into public.professionals (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000c2', id, 'otra', 'Otra', 'otra', true
from public.categories where slug = 'tattoo';

insert into public.professional_claims (professional_id, code) values
  ('cccccccc-0000-0000-0000-0000000000c1', 'BRIZA123'),
  ('cccccccc-0000-0000-0000-0000000000c2', 'OTRA4567');

-- Una media por pieza. `portfolio_items.media_id` es UNIQUE, así que reusar la
-- misma en dos inserts haría fallar el segundo por la restricción y no por la
-- política — y el test pasaría verde con la política rota. Se descubrió
-- aflojando la política a propósito y viendo que fallaba por el motivo
-- equivocado.
insert into public.media_assets (id, bucket, path, mime_type, owner_user_id) values
  ('bbbbbbbb-0000-0000-0000-0000000000b1', 'portfolio', 'briza/1/lg.webp', 'image/webp',
   'aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('bbbbbbbb-0000-0000-0000-0000000000b2', 'portfolio', 'briza/2/lg.webp', 'image/webp',
   'aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('bbbbbbbb-0000-0000-0000-0000000000b3', 'portfolio', 'otra/1/lg.webp', 'image/webp',
   'aaaaaaaa-0000-0000-0000-0000000000a2'),
  ('bbbbbbbb-0000-0000-0000-0000000000b4', 'portfolio', 'otra/2/lg.webp', 'image/webp',
   'aaaaaaaa-0000-0000-0000-0000000000a2');

-- --- somos Briza -------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- La tabla de códigos no existe para el cliente. Si se pudiera leer, cualquiera
-- listaría los códigos y reclamaría perfiles ajenos.
select throws_ok(
  'select * from public.professional_claims',
  '42501',
  null,
  'El cliente no puede leer los códigos de reclamo'
);

select is(
  public.claim_professional('BRIZA123'),
  'briza',
  'Un código válido devuelve el slug del perfil reclamado'
);

select throws_ok(
  $$ select public.claim_professional('BRIZA123') $$,
  'P0002',
  null,
  'El mismo código no se puede usar dos veces'
);

select throws_ok(
  $$ select public.claim_professional('NOEXISTE') $$,
  'P0002',
  null,
  'Un código inexistente falla con el mismo error que uno usado'
);

-- Ahora Briza es dueña de `briza`. Puede escribir su portafolio.
select lives_ok(
  $$
    insert into public.portfolio_items (id, professional_id, media_id)
    values ('dddddddd-0000-0000-0000-0000000000d1',
            'cccccccc-0000-0000-0000-0000000000c1',
            'bbbbbbbb-0000-0000-0000-0000000000b1')
  $$,
  'La dueña puede agregar una pieza a SU perfil'
);

select lives_ok(
  $$
    insert into public.portfolio_item_styles (portfolio_item_id, style_id, weight)
    select 'dddddddd-0000-0000-0000-0000000000d1', id, 1.0
    from public.styles where slug = 'traditional'
  $$,
  'La dueña puede etiquetar el estilo de su pieza'
);

select lives_ok(
  $$ delete from public.portfolio_items where id = 'dddddddd-0000-0000-0000-0000000000d1' $$,
  'La dueña puede borrar su propia pieza'
);

-- Y NO puede tocar el perfil de otra.
select throws_ok(
  $$
    insert into public.portfolio_items (professional_id, media_id)
    values ('cccccccc-0000-0000-0000-0000000000c2',
            'bbbbbbbb-0000-0000-0000-0000000000b2')
  $$,
  '42501',
  null,
  'La dueña NO puede agregar una pieza al perfil de otra'
);

-- Una fila de media del catálogo tiene que apuntar a la carpeta propia. Sin
-- atar el path al slug, una artista podría registrar una fila que apunta al
-- objeto de otra y quedarse con su imagen adentro de su propio perfil.
select lives_ok(
  $$
    insert into public.media_assets (bucket, path, mime_type, owner_user_id)
    values ('portfolio', 'briza/nueva/lg.jpg', 'image/jpeg',
            'aaaaaaaa-0000-0000-0000-0000000000a1')
  $$,
  'La dueña puede registrar media bajo SU slug'
);

select throws_ok(
  $$
    insert into public.media_assets (bucket, path, mime_type, owner_user_id)
    values ('portfolio', 'otra/robada/lg.jpg', 'image/jpeg',
            'aaaaaaaa-0000-0000-0000-0000000000a1')
  $$,
  '42501',
  null,
  'La dueña NO puede registrar media bajo el slug de otra'
);

-- --- ubicación del estudio (set_studio_location) -----------------------------

select lives_ok(
  $$ select public.set_studio_location(-34.5875, -58.4371) $$,
  'La dueña puede setear la ubicación de SU estudio'
);

select is(
  (select studio_lat from public.professionals where slug = 'briza'),
  -34.5875::double precision,
  'La latitud quedó guardada tal cual se envió'
);

select is(
  (select studio_lng from public.professionals where slug = 'briza'),
  -58.4371::double precision,
  'La longitud quedó guardada tal cual se envió'
);

-- No hay política de UPDATE sobre `professionals` para el cliente: la única
-- vía es la función. Sin esto, un `with check` roto en una política futura
-- pasaría inadvertido.
select throws_ok(
  $$ update public.professionals set studio_lat = 0 where slug = 'briza' $$,
  '42501',
  null,
  'No hay UPDATE directo sobre professionals, ni siquiera de la fila propia'
);

select throws_ok(
  $$ select public.set_studio_location(200, -58.4371) $$,
  '23514',
  null,
  'Una latitud fuera de rango se rechaza'
);

select throws_ok(
  $$ select public.set_studio_location(-34.5875, null) $$,
  '22004',
  null,
  'Longitud faltante se rechaza antes de llegar a la restricción de la tabla'
);

-- --- somos la otra artista ---------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2","role":"authenticated"}';

-- Todavía no reclamó ningún perfil: la función no tiene ninguna fila propia
-- que tocar. El mismo error que "existe pero algo más falló" — no hay una
-- rama que distinga los dos casos.
select throws_ok(
  $$ select public.set_studio_location(-34.6037, -58.3816) $$,
  'P0002',
  null,
  'Sin perfil propio reclamado, set_studio_location no tiene qué actualizar'
);

select is(
  public.claim_professional('OTRA4567'),
  'otra',
  'Otra artista reclama su propio perfil'
);

select lives_ok(
  $$ select public.set_studio_location(-34.6037, -58.3816) $$,
  'Con perfil propio ya reclamado, puede setear SU ubicación'
);

select is(
  (select studio_lat from public.professionals where slug = 'briza'),
  -34.5875::double precision,
  'Setear la ubicación de otra no tocó la de Briza'
);

-- Con perfil propio reclamado, sigue sin poder escribir en el de Briza. Este es
-- el caso que importa: no es "un desconocido no puede", es "un artista legítimo
-- tampoco".
select throws_ok(
  $$
    insert into public.portfolio_items (professional_id, media_id)
    values ('cccccccc-0000-0000-0000-0000000000c1',
            'bbbbbbbb-0000-0000-0000-0000000000b3')
  $$,
  '42501',
  null,
  'Una artista con perfil propio NO puede escribir en el de otra'
);

-- Un update tampoco puede mover una pieza de un perfil a otro. Sin `with check`
-- en la política, este pasaría.
reset role;
insert into public.portfolio_items (id, professional_id, media_id)
values ('dddddddd-0000-0000-0000-0000000000d2',
        'cccccccc-0000-0000-0000-0000000000c2',
        'bbbbbbbb-0000-0000-0000-0000000000b4');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2","role":"authenticated"}';

select throws_ok(
  $$
    update public.portfolio_items
    set professional_id = 'cccccccc-0000-0000-0000-0000000000c1'
    where id = 'dddddddd-0000-0000-0000-0000000000d2'
  $$,
  '42501',
  null,
  'No se puede mover una pieza propia al perfil de otra'
);

reset role;

select is(
  (select owner_user_id from public.professionals where slug = 'briza'),
  'aaaaaaaa-0000-0000-0000-0000000000a1'::uuid,
  'Nada de lo anterior cambió quién es la dueña de briza'
);

select * from finish();
rollback;
