-- Diseño propio: tamaño y precio declarados por el artista sobre una pieza
-- puntual de portfolio_items. Ver ADR-034.
--
-- Columnas sobre una tabla que ya existe, no una tabla nueva: la sub-sección
-- "Diseños propios" del perfil lee la misma fila que ya lee "Obra", filtrada
-- por `is_original_design`. Una partición 1:1 acá repetiría el error que
-- ADR-003 ya rechazó para professionals/ProfessionalProfile — un join más y
-- un segundo juego de políticas sin ninguna diferencia de comportamiento.
--
-- Sin RLS nueva: portfolio_items ya tiene políticas de owner completas desde
-- 20260818000300_artist_portfolio.sql (insert/update/delete propios, select
-- pública filtrada por professionals.is_published), y esas políticas cubren
-- la fila entera — no hay grant por columnas en ningún lado del esquema. Ver
-- ADR-034 §6.
--
-- Sin índice nuevo: no hay ninguna consulta con nombre que filtre u ordene
-- por size_label (texto libre, no se agrupa), y la sub-sección de diseños
-- propios se trae con el mismo `where professional_id = X` que ya cubre
-- portfolio_items_professional_sort_idx. Ver ADR-034, al pie del esquema
-- propuesto.

alter table public.portfolio_items
  add column is_original_design boolean not null default false,

  -- Tamaño real de ESTA pieza, en palabras del artista. Texto libre a
  -- propósito — ver ADR-034 §3: un objeto ya dibujado necesita precisión real
  -- ("8x10cm"), no una categoría de intención como traits/size, que se
  -- construyó para un brief todavía sin definir.
  add column size_label text
    check (size_label is null or length(size_label) between 1 and 60),

  -- Precio puntual, no un rango: ver ADR-034 §4. Mismo patrón de "declarado +
  -- fechado" que professionals.price, forma distinta — el objeto ya existe,
  -- con un tamaño ya fijo, así que no queda ninguna incógnita que un rango
  -- exprese con honestidad.
  add column price_cents integer check (price_cents is null or price_cents > 0),
  add column price_currency char(3)
    check (price_currency is null or price_currency ~ '^[A-Z]{3}$'),
  add column priced_at date;

alter table public.portfolio_items
  -- Precio completo o ausente. Mismo espíritu que
  -- professionals_price_complete: un precio sin fecha no es información.
  add constraint portfolio_items_price_complete check (
    (price_cents is null and price_currency is null and priced_at is null)
    or (price_cents is not null and price_currency is not null
      and priced_at is not null)
  ),

  -- Tamaño y precio solo tienen sentido sobre un diseño propio. Un tatuaje ya
  -- hecho no se vende — esta restricción es la que impide esa contradicción.
  add constraint portfolio_items_offer_shape check (
    is_original_design
    or (
      size_label is null
      and price_cents is null
      and price_currency is null
      and priced_at is null
    )
  );

comment on column public.portfolio_items.is_original_design is
  'true = diseño propio del artista, ofrecido tal cual está. false = tatuaje ya hecho en un cliente. Ver ADR-034.';
comment on column public.portfolio_items.size_label is
  'Tamaño real de esta pieza, en palabras del artista ("8x10cm", "mano chica"). Texto libre, no taxonomía: ver ADR-034 §3. Solo con is_original_design.';
comment on column public.portfolio_items.price_cents is
  'Precio puntual de ESTA pieza, declarado por el artista. Solo con is_original_design. Nunca un rango: el objeto ya tiene una forma fija. Ver ADR-034.';
