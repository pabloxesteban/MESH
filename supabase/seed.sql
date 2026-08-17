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

-- --- locations ---

insert into public.locations (slug, country_code, admin_area, city, metro_key)
values ('caba', 'AR', 'Ciudad Autónoma de Buenos Aires', 'Buenos Aires', 'amba')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key)
values ('vicente-lopez', 'AR', 'Buenos Aires', 'Vicente López', 'amba')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key)
values ('san-isidro', 'AR', 'Buenos Aires', 'San Isidro', 'amba')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key)
values ('tigre', 'AR', 'Buenos Aires', 'Tigre', 'amba')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key)
values ('san-martin', 'AR', 'Buenos Aires', 'San Martín', 'amba')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key)
values ('moron', 'AR', 'Buenos Aires', 'Morón', 'amba')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key)
values ('avellaneda', 'AR', 'Buenos Aires', 'Avellaneda', 'amba')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key)
values ('lomas-de-zamora', 'AR', 'Buenos Aires', 'Lomas de Zamora', 'amba')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key)
values ('quilmes', 'AR', 'Buenos Aires', 'Quilmes', 'amba')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key;

insert into public.locations (slug, country_code, admin_area, city, metro_key)
values ('la-plata', 'AR', 'Buenos Aires', 'La Plata', 'la-plata')
on conflict (slug) do update set
  country_code = excluded.country_code,
  admin_area = excluded.admin_area,
  city = excluded.city,
  metro_key = excluded.metro_key;
