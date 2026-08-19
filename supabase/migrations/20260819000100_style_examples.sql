-- get_style_examples: una foto real por estilo, para reconocer en vez de leer.
--
-- Nace de un pedido concreto: la gente que sabe lo que quiere pero no sabe
-- cómo se llama el estilo. Una lista de nombres no ayuda — necesitan ver una
-- foto y reconocer "eso". No es un problema de vocabulario, es de reconocimiento
-- visual, así que la respuesta es visual y no un glosario.
--
-- Sigue siendo cero ML: no hay clasificación de imágenes ni inferencia sobre lo
-- que el usuario sube. La foto de ejemplo sale del catálogo YA etiquetado por
-- cada artista al cargar su portafolio — es la misma etiqueta que ya alimenta
-- el matching, mostrada en vez de escondida detrás de un nombre.
--
-- Selección determinística: para cada estilo, la pieza publicada con mayor
-- peso declarado (`portfolio_item_styles.weight`), desempatado por id de
-- pieza. Mismas entradas, mismo resultado — no hay "elegido al azar" ni
-- "el más lindo a criterio nuestro".
--
-- SECURITY INVOKER, como get_discovery_feed: corre con los permisos de quien
-- llama, así que las políticas de professionals/portfolio_items/media_assets
-- se aplican adentro. Un estilo sin ninguna pieza publicada simplemente no
-- aparece en el resultado — no hay fila que rellenar con nada inventado.
create or replace function public.get_style_examples(p_category_slug text)
returns table (
  style_slug text,
  media_bucket text,
  media_path text,
  media_blurhash text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct on (s.id)
    s.slug::text as style_slug,
    m.bucket as media_bucket,
    m.path as media_path,
    m.blurhash as media_blurhash
  from public.styles s
  join public.categories c on c.id = s.category_id
  join public.portfolio_item_styles pis on pis.style_id = s.id
  join public.portfolio_items pi on pi.id = pis.portfolio_item_id
  join public.professionals p on p.id = pi.professional_id
  join public.media_assets m on m.id = pi.media_id
  where c.slug = p_category_slug::extensions.citext
    and c.is_active
    and s.is_active
    and p.is_published
  order by s.id, pis.weight desc, pi.id;
$$;

comment on function public.get_style_examples is
  'Una foto real y publicada por estilo, para el selector visual. Determinístico: mayor peso declarado, desempatado por id.';

revoke all on function public.get_style_examples(text) from public, anon;
grant execute on function public.get_style_examples(text) to authenticated;
