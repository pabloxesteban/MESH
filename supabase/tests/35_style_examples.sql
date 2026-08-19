-- get_style_examples: selección determinística, nunca desde lo no publicado.
--
-- La pregunta que decide si esto es publicable: ¿puede devolver una imagen
-- que la persona no debería poder ver, o una elegida al azar? Las dos cosas
-- rompen el punto del selector visual — mostrar SIEMPRE lo mismo para el
-- mismo estilo, y nunca algo que no pasó por curación/publicación.

begin;
select plan(5);

delete from public.professionals;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'a@example.test');

insert into public.professionals (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000c1', id, 'publicada', 'Publicada', 'publicada', true
from public.categories where slug = 'tattoo';

insert into public.professionals (id, category_id, slug, display_name, instagram_handle, is_published)
select 'cccccccc-0000-0000-0000-0000000000c2', id, 'sin-publicar', 'Sin publicar', 'sinpublicar', false
from public.categories where slug = 'tattoo';

insert into public.media_assets (id, bucket, path, mime_type) values
  ('bbbbbbbb-0000-0000-0000-0000000000b1', 'portfolio', 'publicada/1/lg.webp', 'image/webp'),
  ('bbbbbbbb-0000-0000-0000-0000000000b2', 'portfolio', 'publicada/2/lg.webp', 'image/webp'),
  ('bbbbbbbb-0000-0000-0000-0000000000b3', 'portfolio', 'sin-publicar/1/lg.webp', 'image/webp');

insert into public.portfolio_items (id, professional_id, media_id) values
  -- Dos piezas publicadas con fine-line, pesos distintos.
  ('dddddddd-0000-0000-0000-0000000000d1', 'cccccccc-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000b1'),
  ('dddddddd-0000-0000-0000-0000000000d2', 'cccccccc-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000b2'),
  -- Una pieza con más peso en fine-line, pero de un perfil sin publicar.
  ('dddddddd-0000-0000-0000-0000000000d3', 'cccccccc-0000-0000-0000-0000000000c2', 'bbbbbbbb-0000-0000-0000-0000000000b3');

insert into public.portfolio_item_styles (portfolio_item_id, style_id, weight)
select 'dddddddd-0000-0000-0000-0000000000d1', id, 0.6 from public.styles where slug = 'fine-line';
insert into public.portfolio_item_styles (portfolio_item_id, style_id, weight)
select 'dddddddd-0000-0000-0000-0000000000d2', id, 0.9 from public.styles where slug = 'fine-line';
insert into public.portfolio_item_styles (portfolio_item_id, style_id, weight)
select 'dddddddd-0000-0000-0000-0000000000d3', id, 1.0 from public.styles where slug = 'fine-line';

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  (select media_path from public.get_style_examples('tattoo') where style_slug = 'fine-line'),
  'publicada/2/lg.webp',
  'Elige la pieza publicada de mayor peso, no la de mayor peso a secas'
);

select ok(
  not exists (
    select 1 from public.get_style_examples('tattoo')
    where media_path = 'sin-publicar/1/lg.webp'
  ),
  'Nunca devuelve una imagen de un perfil sin publicar, aunque pese más'
);

select is(
  (select count(*) from public.get_style_examples('tattoo') where style_slug = 'blackwork'),
  0::bigint,
  'Un estilo sin ninguna pieza publicada no aparece — nada de rellenar con otra cosa'
);

select is(
  (select count(*) from public.get_style_examples('tattoo')),
  (select count(*) from public.get_style_examples('tattoo')),
  'Determinístico: dos llamadas devuelven la misma cantidad de filas'
);

reset role;
set local role anon;

select throws_ok(
  $$ select * from public.get_style_examples('tattoo') $$,
  '42501',
  null,
  'anon (sin ninguna sesión, ni siquiera anónima) no puede ejecutar la función'
);

select * from finish();
rollback;
