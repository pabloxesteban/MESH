-- GENERADO — no editar a mano.
--
-- Fuente: packages/domain/src/taxonomy/. Regenerar con:
--   npm run db:reference
--
-- Datos de referencia solamente: categorías, estilos y ubicaciones. Los
-- artistas NO van acá — los carga tools/seed desde content/artists/, con
-- consentimiento verificado. Ver docs/product/content-policy.md.
--
-- Idempotente: `supabase db reset` lo corre en cada reinicio, y agregar una
-- fila no puede romper las que ya existen ni cambiarles el id.

-- --- categories ---

insert into public.categories (slug, name_key, sort_order, is_active)
values ('tattoo', 'category.tattoo', 1, true)
on conflict (slug) do update set
  name_key = excluded.name_key,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- --- styles ---

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'fine-line', 'style.tattoo.fine-line',
  'style.tattoo.fine-line.description', array['linea fina', 'microrealismo lineal']::text[],
  1, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'blackwork', 'style.tattoo.blackwork',
  'style.tattoo.blackwork.description', array['negro solido']::text[],
  2, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'dotwork', 'style.tattoo.dotwork',
  'style.tattoo.dotwork.description', array['puntillismo']::text[],
  3, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'old-school', 'style.tattoo.old-school',
  'style.tattoo.old-school.description', array['oldschool']::text[],
  4, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'traditional', 'style.tattoo.traditional',
  'style.tattoo.traditional.description', array['tradicional', 'american traditional']::text[],
  5, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'neo-traditional', 'style.tattoo.neo-traditional',
  'style.tattoo.neo-traditional.description', array['neotradicional']::text[],
  6, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'realism', 'style.tattoo.realism',
  'style.tattoo.realism.description', array['realismo']::text[],
  7, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'black-and-grey', 'style.tattoo.black-and-grey',
  'style.tattoo.black-and-grey.description', array['negro y gris', 'black and gray']::text[],
  8, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'watercolor', 'style.tattoo.watercolor',
  'style.tattoo.watercolor.description', array['acuarela']::text[],
  9, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'ornamental', 'style.tattoo.ornamental',
  'style.tattoo.ornamental.description', array['ornamental geometrico']::text[],
  10, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'japanese', 'style.tattoo.japanese',
  'style.tattoo.japanese.description', array['japones', 'irezumi']::text[],
  11, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'lettering', 'style.tattoo.lettering',
  'style.tattoo.lettering.description', array['caligrafia', 'tipografia']::text[],
  12, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'minimalist', 'style.tattoo.minimalist',
  'style.tattoo.minimalist.description', array['minimalista', 'minimal']::text[],
  13, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'fileteado-porteno', 'style.tattoo.fileteado-porteno',
  'style.tattoo.fileteado-porteno.description', array['fileteado']::text[],
  14, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.styles (
  category_id, slug, name_key, description_key, aliases, sort_order, is_active
)
select
  c.id, 'handpoke', 'style.tattoo.handpoke',
  'style.tattoo.handpoke.description', array['stick and poke', 'a mano']::text[],
  15, true
from public.categories c where c.slug = 'tattoo'
on conflict (category_id, slug) do update set
  name_key = excluded.name_key,
  description_key = excluded.description_key,
  aliases = excluded.aliases,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- --- locations: ciudades ---

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('caba', 'AR', 'Ciudad Autónoma de Buenos Aires', 'Buenos Aires', 'amba', 'city', null, null)
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('vicente-lopez', 'AR', 'Buenos Aires', 'Vicente López', 'amba', 'city', null, null)
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('san-isidro', 'AR', 'Buenos Aires', 'San Isidro', 'amba', 'city', null, null)
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('tigre', 'AR', 'Buenos Aires', 'Tigre', 'amba', 'city', null, null)
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('san-martin', 'AR', 'Buenos Aires', 'San Martín', 'amba', 'city', null, null)
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('moron', 'AR', 'Buenos Aires', 'Morón', 'amba', 'city', null, null)
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('avellaneda', 'AR', 'Buenos Aires', 'Avellaneda', 'amba', 'city', null, null)
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('lomas-de-zamora', 'AR', 'Buenos Aires', 'Lomas de Zamora', 'amba', 'city', null, null)
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('quilmes', 'AR', 'Buenos Aires', 'Quilmes', 'amba', 'city', null, null)
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('la-plata', 'AR', 'Buenos Aires', 'La Plata', 'la-plata', 'city', null, null)
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

-- --- locations: barrios ---

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('retiro', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-1')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('san-nicolas', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-1')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('puerto-madero', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-1')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('san-telmo', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-1')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('montserrat', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-1')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('constitucion', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-1')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('recoleta', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-2')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('balvanera', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-3')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('san-cristobal', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-3')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('la-boca', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-4')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('barracas', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-4')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('parque-patricios', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-4')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('nueva-pompeya', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-4')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('almagro', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-5')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('boedo', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-5')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('caballito', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-6')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('flores', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-7')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('parque-chacabuco', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-7')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-soldati', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-8')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-riachuelo', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-8')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-lugano', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-8')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('liniers', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-9')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('mataderos', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-9')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('parque-avellaneda', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-9')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-luro', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-10')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('velez-sarsfield', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-10')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('floresta', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-10')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('monte-castro', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-10')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-real', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-10')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('versalles', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-10')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-general-mitre', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-11')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-devoto', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-11')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-del-parque', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-11')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-santa-rita', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-11')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('coghlan', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-12')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('saavedra', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-12')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-urquiza', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-12')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-pueyrredon', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-12')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('nunez', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-13')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('belgrano', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-13')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('colegiales', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-13')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('palermo', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-14')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('chacarita', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-15')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-crespo', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-15')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('paternal', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-15')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('villa-ortuzar', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-15')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('agronomia', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-15')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key, kind, parent_id, group_key)
values ('parque-chas', 'AR', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'amba', 'neighborhood', (select id from public.locations where slug = 'caba'), 'comuna-15')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  group_key = excluded.group_key;
