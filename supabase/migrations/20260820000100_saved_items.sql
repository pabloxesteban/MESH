-- Guardar una obra.
--
-- [ADR-003](../../docs/decisions/ADR-003-domain-model.md) había descartado
-- `SavedItem` y [D-010](../../docs/design/MESH-DESIGN-DECISIONS.md) lo dejó
-- afuera de nuevo al sacar el mazo. Esto lo revierte — ver ADR-016 — y el
-- motivo es el que se ve usando la app: alguien recorre Explorar juntando
-- ideas y no tiene dónde ponerlas. Hoy la única forma de no perder una obra es
-- sacarle una captura.
--
-- Tres decisiones que definen la forma:
--
-- 1. **Se guarda la OBRA, no el artista.** "Un corazón abajo de la foto" es
--    literalmente lo que se pidió, y además es lo que corresponde: alguien
--    junta ideas de tatuaje, no colecciona personas. El artista se alcanza
--    desde la obra, que es la regla de toda la app.
--
-- 2. **Guardar es privado.** Nadie ve lo que otro guardó, y el artista no ve
--    cuántos corazones tiene su obra. Un contador público convierte esto en
--    una métrica de vanidad, y de ahí a la carnada hay un paso — ver el
--    innegociable 3 de CLAUDE.md. Si algún día el artista tiene que verlo, es
--    otra decisión y va con su ADR.
--
-- 3. **Sin UPDATE.** Guardar y desguardar son insert y delete. Un `saved`
--    booleano que se togglea deja filas de gente que desguardó, y eso es
--    exactamente el estado que después alguien cuenta como si fuera interés.

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),

  -- Cascade: si se borra la cuenta, lo guardado se va con ella. No hay ningún
  -- motivo para conservar la lista de ideas de alguien que se fue.
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Cascade también: una obra que el artista bajó no puede seguir apareciendo
  -- en los guardados de nadie. Es el mismo camino que usa el retiro de un
  -- artista, y sin esto quedaría una fila apuntando a una imagen borrada.
  portfolio_item_id uuid not null
    references public.portfolio_items (id) on delete cascade,

  created_at timestamptz not null default now(),

  -- Guardar dos veces la misma obra es guardarla una vez. Sin esto, tocar el
  -- corazón dos veces rápido deja dos filas y la pantalla muestra la obra
  -- repetida.
  unique (user_id, portfolio_item_id)
);

comment on table public.saved_items is
  'Obra guardada por alguien. Privado: nadie más lo ve, ni el artista. Ver ADR-016.';

-- Consulta detrás del índice: la pantalla de guardados, que trae lo de una
-- persona ordenado por lo último que guardó.
create index saved_items_user_idx
  on public.saved_items (user_id, created_at desc);

-- El unique de arriba ya crea el índice que necesita el chequeo de "¿esta obra
-- está guardada?" al dibujar el corazón, así que no hace falta otro.

alter table public.saved_items enable row level security;
alter table public.saved_items force row level security;

revoke all on public.saved_items from anon, authenticated;
grant select, insert, delete on public.saved_items to authenticated;

-- Las tres políticas dicen lo mismo con distinto verbo, y a propósito no hay
-- una `for all`: la garantía genérica de `00_rls_guarantee.sql` las rechaza,
-- porque una sola política para todo esconde qué se puede hacer con qué.

create policy saved_items_select_own on public.saved_items
  for select to authenticated
  using (user_id = (select auth.uid()));

-- `with check` sobre `user_id`: sin esto, cualquiera podría escribir filas a
-- nombre de otro y llenarle los guardados.
create policy saved_items_insert_own on public.saved_items
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy saved_items_delete_own on public.saved_items
  for delete to authenticated
  using (user_id = (select auth.uid()));
