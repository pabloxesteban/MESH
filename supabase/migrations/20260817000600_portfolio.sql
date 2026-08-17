-- portfolio_items: la obra. Es la unidad sobre la que se desliza.
--
-- El gusto se aprende de piezas, no de artistas: "me gusta esta obra" es un
-- dato honesto, "me gusta este artista" es una conclusión que todavía no
-- corresponde sacar. Ver docs/product/matching.md §3.

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null
    references public.professionals(id) on delete cascade,
  -- RESTRICT: nunca dejar huérfana la referencia de imagen de una pieza. Si
  -- alguien quiere borrar la media, primero borra la pieza.
  media_id uuid not null references public.media_assets(id) on delete restrict,
  caption text check (caption is null or length(caption) between 1 and 280),
  year integer check (year is null or year between 1900 and 2100),
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  is_fixture boolean not null default false,
  created_at timestamptz not null default now(),
  -- Una imagen se muestra una sola vez: dos piezas apuntando al mismo archivo
  -- serían dos tarjetas idénticas en el mazo.
  unique (media_id)
);

comment on table public.portfolio_items is
  'Obra de un profesional. Unidad del feed de descubrimiento y del vector de gusto.';

-- Consulta detrás del índice: la grilla del perfil, en orden.
create index portfolio_items_professional_sort_idx
  on public.portfolio_items (professional_id, sort_order);

-- Consulta detrás del índice: el hero del perfil y la primera tarjeta del mazo.
create index portfolio_items_featured_idx
  on public.portfolio_items (professional_id)
  where is_featured;

-- Consulta detrás del índice: la política de SELECT del catálogo en
-- media_assets, que llega desde la media hacia la pieza.
create index portfolio_items_media_idx on public.portfolio_items (media_id);

alter table public.portfolio_items enable row level security;
alter table public.portfolio_items force row level security;

revoke all on public.portfolio_items from anon, authenticated;
grant select on public.portfolio_items to authenticated;

create policy portfolio_items_select_published on public.portfolio_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.professionals p
      where p.id = portfolio_items.professional_id and p.is_published
    )
  );

-- --- portfolio_item_styles ---------------------------------------------------

create table public.portfolio_item_styles (
  portfolio_item_id uuid not null
    references public.portfolio_items(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete restrict,
  -- Los pesos suman 1 por pieza, así una obra con cuatro etiquetas no pesa más
  -- que una enfocada. Lo impone el validador del seed y lo verifica un test de
  -- base de datos, no un trigger: un trigger tendría que dispararse en el
  -- último insert del conjunto, lo que es frágil.
  weight numeric(4, 3) not null check (weight > 0 and weight <= 1),
  primary key (portfolio_item_id, style_id)
);

comment on table public.portfolio_item_styles is
  'Etiquetas de estilo de una pieza, ponderadas. Los pesos suman 1 por pieza.';

-- Consulta detrás del índice: "qué obra hay de este estilo", usado al explicar
-- un match y al armar el mazo filtrado.
create index portfolio_item_styles_style_idx
  on public.portfolio_item_styles (style_id);

alter table public.portfolio_item_styles enable row level security;
alter table public.portfolio_item_styles force row level security;

revoke all on public.portfolio_item_styles from anon, authenticated;
grant select on public.portfolio_item_styles to authenticated;

create policy portfolio_item_styles_select_published
  on public.portfolio_item_styles
  for select to authenticated
  using (
    exists (
      select 1
      from public.portfolio_items pi
      join public.professionals p on p.id = pi.professional_id
      where pi.id = portfolio_item_styles.portfolio_item_id and p.is_published
    )
  );

-- --- lectura del catálogo en media_assets ------------------------------------
--
-- La migración de media dejó `media_assets` con acceso solo a lo propio, porque
-- ahí todavía no existía la tabla que define qué está publicado. Acá sí.
--
-- El predicado es deliberadamente estrecho: una fila de media curada se ve
-- únicamente si cuelga de una pieza de un profesional publicado, o si es su
-- avatar o su hero. Sin eso, `select * from media_assets` devolvería los paths
-- de todo el catálogo sin publicar, que es exactamente el material que todavía
-- no acordamos mostrar.

create policy media_assets_select_published_catalog on public.media_assets
  for select to authenticated
  using (
    owner_user_id is null
    and (
      exists (
        select 1
        from public.portfolio_items pi
        join public.professionals p on p.id = pi.professional_id
        where pi.media_id = media_assets.id and p.is_published
      )
      or exists (
        select 1
        from public.professionals p
        where p.is_published
          and (p.avatar_media_id = media_assets.id
            or p.hero_media_id = media_assets.id)
      )
    )
  );

-- Consultas detrás de los índices: la segunda mitad de la política de arriba.
create index professionals_avatar_media_idx
  on public.professionals (avatar_media_id)
  where avatar_media_id is not null;

create index professionals_hero_media_idx
  on public.professionals (hero_media_id)
  where hero_media_id is not null;
