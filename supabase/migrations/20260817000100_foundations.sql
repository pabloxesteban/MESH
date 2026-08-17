-- Fundaciones: extensiones, enums y el trigger de updated_at.
--
-- No crea ninguna tabla, así que no lleva políticas. Toda migración que SÍ cree
-- una tabla tiene que habilitar y forzar RLS y agregar sus políticas en el
-- mismo archivo — el CI falla si no. Ver .claude/workflows/database-change.md.

create extension if not exists citext with schema extensions;

-- Enums: conjuntos cerrados, chicos, compartidos con los tipos de
-- packages/domain. Cualquier cosa plausiblemente abierta (estilos, categorías)
-- es una tabla, no un enum.

create type public.availability_status as enum (
  'open',
  'limited',
  'waitlist',
  'closed'
);

create type public.interaction_verdict as enum ('like', 'pass');

create type public.interaction_source as enum ('discover', 'search', 'profile');

create type public.project_timing as enum ('asap', 'weeks', 'months', 'flexible');

create type public.project_status as enum ('draft', 'active', 'archived');

-- La UI muestra la banda, nunca el puntaje numérico: con una ciudad y una
-- docena de artistas, dos cifras significativas afirman una resolución que los
-- datos no sostienen. Ver docs/decisions/ADR-005-matching.md.
create type public.match_band as enum ('strong', 'good', 'possible');

-- Mantiene updated_at. Se aplica a toda tabla mutable.
--
-- search_path fijado en vacío y nombres completamente calificados: una función
-- SECURITY DEFINER con search_path heredado es una escalada de privilegios
-- esperando a que alguien cree una función con el mismo nombre en un esquema
-- que esté antes en el path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Trigger de updated_at. Ver docs/architecture/data-model.md §6.';
