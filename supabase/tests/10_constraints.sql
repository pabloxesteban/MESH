-- Tests de rechazo, uno por restricción.
--
-- Cada restricción del esquema expresa un invariante de producto. Un test que
-- solo verifica el camino feliz no prueba nada sobre una restricción: prueba
-- que no molesta. Lo que hay que verificar es que efectivamente RECHACE.

begin;
select plan(18);

-- --- fixtures ----------------------------------------------------------------

insert into auth.users (id, email)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test');

create temporary table ids as
select
  (select id from public.categories where slug = 'tattoo') as category_id,
  (select id from public.styles where slug = 'fine-line') as fine_line_id,
  (select id from public.styles where slug = 'blackwork') as blackwork_id,
  (select id from public.styles where slug = 'dotwork') as dotwork_id,
  (select id from public.styles where slug = 'realism') as realism_id,
  (select id from public.styles where slug = 'handpoke') as handpoke_id,
  (select id from public.locations where slug = 'caba') as location_id;

insert into public.media_assets (id, bucket, path, mime_type)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'portfolio', 'x/1.jpg', 'image/jpeg');

insert into public.professionals (id, category_id, slug, display_name, instagram_handle)
select 'cccccccc-0000-0000-0000-000000000001', category_id, 'test-artist', 'Test Artist', 'testartist'
from ids;

insert into public.portfolio_items (id, professional_id, media_id)
values (
  'dddddddd-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001'
);

-- --- professionals -----------------------------------------------------------

select throws_ok(
  $$
    insert into public.professionals (category_id, slug, display_name, price_min_cents)
    select category_id, 'p-1', 'X', 50000 from ids
  $$,
  23514,
  null,
  'Un precio sin moneda ni fecha se rechaza — un precio sin fecha no es información'
);

select throws_ok(
  $$
    insert into public.professionals (
      category_id, slug, display_name,
      price_min_cents, price_max_cents, price_currency, priced_at
    )
    select category_id, 'p-2', 'X', 90000, 50000, 'ARS', '2026-08-01' from ids
  $$,
  23514,
  null,
  'Un precio mínimo mayor que el máximo se rechaza'
);

select throws_ok(
  $$
    insert into public.professionals (category_id, slug, display_name, availability_status)
    select category_id, 'p-3', 'X', 'open'::public.availability_status from ids
  $$,
  23514,
  null,
  'Una disponibilidad sin fecha se rechaza — no podríamos saber si está vieja'
);

select throws_ok(
  $$
    insert into public.professionals (category_id, slug, display_name, is_published)
    select category_id, 'p-4', 'X', true from ids
  $$,
  23514,
  null,
  'Un profesional publicado sin canal de contacto se rechaza'
);

select throws_ok(
  $$
    insert into public.professionals (category_id, slug, display_name, claimed_at)
    select category_id, 'p-5', 'X', now() from ids
  $$,
  23514,
  null,
  'Un perfil reclamado sin dueño se rechaza'
);

select throws_ok(
  $$
    insert into public.professionals (category_id, slug, display_name, instagram_handle)
    select category_id, 'p-6', 'X', 'https://instagram.com/alguien' from ids
  $$,
  23514,
  null,
  'Instagram tiene que ser el handle pelado, no una URL'
);

select throws_ok(
  $$
    insert into public.professionals (category_id, slug, display_name, whatsapp_e164)
    select category_id, 'p-7', 'X', '11 5555-1234' from ids
  $$,
  23514,
  null,
  'WhatsApp tiene que estar en E.164'
);

-- --- professional_styles -----------------------------------------------------

insert into public.professional_styles (professional_id, style_id, proficiency, is_primary)
select 'cccccccc-0000-0000-0000-000000000001', fine_line_id, 1.0, true from ids;
insert into public.professional_styles (professional_id, style_id, proficiency, is_primary)
select 'cccccccc-0000-0000-0000-000000000001', blackwork_id, 1.0, true from ids;
insert into public.professional_styles (professional_id, style_id, proficiency, is_primary)
select 'cccccccc-0000-0000-0000-000000000001', dotwork_id, 1.0, true from ids;

select throws_ok(
  $$
    insert into public.professional_styles (professional_id, style_id, proficiency, is_primary)
    select 'cccccccc-0000-0000-0000-000000000001', realism_id, 1.0, true from ids
  $$,
  null,
  null,
  'Un cuarto estilo primario se rechaza — si todo es primario, nada lo es'
);

select lives_ok(
  $$
    insert into public.professional_styles (professional_id, style_id, proficiency, is_primary)
    select 'cccccccc-0000-0000-0000-000000000001', handpoke_id, 0.6, false from ids
  $$,
  'Un cuarto estilo NO primario se acepta'
);

select throws_ok(
  $$
    insert into public.professional_styles (professional_id, style_id, proficiency)
    select 'cccccccc-0000-0000-0000-000000000001', realism_id, 0 from ids
  $$,
  23514,
  null,
  'Una pericia de cero se rechaza — ausencia se representa con ausencia de fila'
);

-- --- portfolio ---------------------------------------------------------------

select throws_ok(
  $$
    insert into public.portfolio_items (professional_id, media_id)
    values (
      'cccccccc-0000-0000-0000-000000000001',
      'bbbbbbbb-0000-0000-0000-000000000001'
    )
  $$,
  23505,
  null,
  'Dos piezas sobre la misma imagen se rechazan — serían dos tarjetas idénticas'
);

-- --- media_assets ------------------------------------------------------------

select throws_ok(
  $$
    insert into public.media_assets (bucket, path, mime_type)
    values ('portfolio', 'x/evil.svg', 'image/svg+xml')
  $$,
  23514,
  null,
  'Un SVG se rechaza — es un documento ejecutable servido desde nuestro dominio'
);

select throws_ok(
  $$
    insert into public.media_assets (bucket, path, mime_type)
    values ('portfolio', '/x/1.jpg', 'image/jpeg')
  $$,
  23514,
  null,
  'Un path absoluto se rechaza'
);

-- --- interactions ------------------------------------------------------------

select throws_ok(
  $$
    insert into public.interactions (user_id, portfolio_item_id, verdict, is_saved, source)
    values (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'dddddddd-0000-0000-0000-000000000001',
      'pass', true, 'discover'
    )
  $$,
  23514,
  null,
  'Guardar algo que se pasó se rechaza'
);

insert into public.interactions (user_id, portfolio_item_id, verdict, source)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000001',
  'like', 'discover'
);

select throws_ok(
  $$
    insert into public.interactions (user_id, portfolio_item_id, verdict, source)
    values (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'dddddddd-0000-0000-0000-000000000001',
      'pass', 'discover'
    )
  $$,
  23505,
  null,
  'Dos interacciones sobre la misma pieza se rechazan — es estado, no un log'
);

-- --- matches -----------------------------------------------------------------

select throws_ok(
  $$
    insert into public.matches (
      user_id, professional_id, score, band, components, reasons,
      matching_version, taste_version
    )
    values (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      0.9, 'strong',
      '{"style": 0.8}'::jsonb,
      '[{"component": "price", "template_key": "reason.price"}]'::jsonb,
      'match/1', 'taste/1'
    )
  $$,
  23514,
  null,
  'Una razón que nombra un componente ausente se rechaza — es una afirmación falsa'
);

select throws_ok(
  $$
    insert into public.matches (
      user_id, professional_id, score, band, components, reasons,
      matching_version, taste_version
    )
    values (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      0.9, 'strong',
      '{"style": 0.8, "location": 0}'::jsonb,
      '[{"component": "location", "template_key": "reason.location"}]'::jsonb,
      'match/1', 'taste/1'
    )
  $$,
  23514,
  null,
  'Una razón sobre un componente con aporte cero se rechaza'
);

select lives_ok(
  $$
    insert into public.matches (
      user_id, professional_id, score, band, components, reasons,
      matching_version, taste_version
    )
    values (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      0.9, 'strong',
      '{"style": 0.8, "location": 1}'::jsonb,
      '[{"component": "style", "template_key": "reason.style", "terms": ["fine-line"]}, {"component": "location", "template_key": "reason.location"}]'::jsonb,
      'match/1', 'taste/1'
    )
  $$,
  'Razones fundadas en componentes con aporte se aceptan'
);

select * from finish();
rollback;
