-- Buscar a alguien por nombre.
--
-- Hasta hoy la app tenía dos formas de llegar a una persona —la grilla de
-- Inicio y la obra de Explorar— y **ninguna servía si ya sabías a quién
-- buscabas**. Quien llega porque una amiga le pasó un nombre tenía que
-- desplazarse hasta encontrarlo de casualidad, y con el alta propia de
-- ADR-013 eso empeora sola: cada artista nuevo que se registra le pide a
-- alguien que lo busque, y no había dónde.
--
-- Tres decisiones que se ven en el código de abajo:
--
-- 1. **Sin acentos y sin mayúsculas.** "martin" encuentra a Martín. En un
--    mercado donde la mitad de los nombres llevan tilde y nadie la escribe
--    en un teclado de teléfono, exigirla sería esconder gente.
-- 2. **A quien no subió obra también se lo encuentra.** La grilla lo
--    esconde a propósito —su tarjeta saldría vacía— pero una búsqueda por
--    nombre es puntería: si preguntás por esa persona, la respuesta correcta
--    es esa persona. La tarjeta lo dice con palabras.
-- 3. **El orden lo decide el parecido, no la cercanía.** Si escribiste un
--    nombre querés ese nombre, no el estudio más cerca que se le parezca.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;


-- Normaliza un texto para comparar: sin acentos y en minúscula.
--
-- `immutable` de verdad, no por optimismo: `unaccent(text)` de un argumento es
-- apenas `stable` porque resuelve el diccionario contra el `search_path` del
-- momento. Nombrando el diccionario explícito la función queda determinística,
-- que es lo que pide un índice funcional.
create or replace function public.search_key(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(
    extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, ''))
  )
$$;

comment on function public.search_key(text) is
  'Texto normalizado para buscar: sin acentos, en minúscula. Inmutable a propósito.';


-- Trigramas sobre el nombre normalizado. Es el índice que hace que
-- `like '%algo%'` no sea un recorrido de tabla cuando el catálogo crezca.
create index if not exists professionals_display_name_trgm
  on public.professionals
  using gin (public.search_key(display_name) extensions.gin_trgm_ops);


/**
 * Busca profesionales publicados por nombre o por slug.
 *
 * Devuelve exactamente la misma forma que `get_artist_grid` para que la
 * pantalla reutilice la tarjeta sin traducir nada.
 *
 * `security invoker`: lee los bloqueos de quien pregunta y nada más, igual
 * que la grilla. A quien bloqueaste no lo encontrás ni buscándolo.
 */
create or replace function public.search_professionals(
  p_category_slug text,
  p_query text,
  p_limit integer default 20,
  p_pieces integer default 6
)
returns table (
  professional_id uuid,
  slug text,
  display_name text,
  is_fixture boolean,
  avatar_path text,
  neighborhood_slug text,
  studio_lat double precision,
  studio_lng double precision,
  pieces jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with viewer as (
    select (select auth.uid()) as user_id
  ),
  termino as (
    select
      public.search_key(btrim(coalesce(p_query, ''))) as q
  ),
  patron as (
    -- El texto lo escribe una persona, así que puede traer `%` o `_`. Sin
    -- escapar, un `%` solo devolvería el catálogo entero como si fuera un
    -- resultado. Se escapan acá una vez y no en cada fila.
    select
      t.q,
      replace(replace(replace(t.q, '\', '\\'), '%', '\%'), '_', '\_') as safe
    from termino t
  )
  select
    p.id,
    p.slug::text,
    p.display_name,
    p.is_fixture,
    avatar.path,
    l.slug::text,
    p.studio_lat,
    p.studio_lng,
    coalesce(
      (
        select jsonb_agg(pieza order by pieza->>'sort')
        from (
          select jsonb_build_object(
            'id', pi.id,
            'sort', lpad(pi.sort_order::text, 6, '0'),
            'path', m.path,
            'width', m.width,
            'height', m.height,
            'blurhash', m.blurhash
          ) as pieza
          from public.portfolio_items pi
          join public.media_assets m on m.id = pi.media_id
          where pi.professional_id = p.id
          order by pi.is_featured desc, pi.sort_order
          limit greatest(coalesce(p_pieces, 6), 1)
        ) elegidas
      ),
      '[]'::jsonb
    )
  from public.professionals p
  join public.categories c on c.id = p.category_id
  cross join viewer v
  cross join patron pat
  left join public.locations l on l.id = p.location_id
  left join public.media_assets avatar on avatar.id = p.avatar_media_id
  where p.is_published
    and c.is_active
    and c.slug = p_category_slug::extensions.citext
    and v.user_id is not null
    -- Una sola letra devuelve medio catálogo y no es una búsqueda: es un
    -- teclado a medio escribir. Dos es el piso.
    and length(pat.q) >= 2
    and (
      public.search_key(p.display_name) like '%' || pat.safe || '%' escape '\'
      or public.search_key(p.slug::text) like '%' || pat.safe || '%' escape '\'
    )
    -- Misma regla que la grilla y que el mazo: lo que bloqueaste no vuelve.
    and not exists (
      select 1 from public.blocks b
      where b.blocker_user_id = v.user_id
        and b.blocked_professional_id = p.id
    )
  order by
    -- Primero el nombre exacto, después el que arranca así, después el que
    -- tiene una palabra que arranca así, y al final el que lo lleva adentro.
    -- `strpos` y no `like` porque acá no hay índice que aprovechar y el texto
    -- crudo no necesita escaparse.
    case
      when public.search_key(p.display_name) = pat.q then 0
      when strpos(public.search_key(p.display_name), pat.q) = 1 then 1
      when strpos(public.search_key(p.display_name), ' ' || pat.q) > 0 then 2
      else 3
    end,
    -- Entre dos que empatan, primero quien tiene obra para mostrar: la
    -- tarjeta con carrusel dice más que la que anuncia que está vacía.
    (exists (
      select 1 from public.portfolio_items pi where pi.professional_id = p.id
    )) desc,
    public.search_key(p.display_name),
    p.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

comment on function public.search_professionals(text, text, integer, integer) is
  'Busca artistas publicados por nombre o slug, sin acentos ni mayúsculas. Respeta bloqueos.';

revoke all on function public.search_professionals(text, text, integer, integer)
  from public, anon;
grant execute on function public.search_professionals(text, text, integer, integer)
  to authenticated;
