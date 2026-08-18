-- Barrios: un segundo nivel bajo la ciudad.
--
-- `locations` tenía un solo nivel, y el comentario de la tabla decía que un
-- barrio no era una ubicación — que el día que lo quisiéramos iba a ser una
-- columna nueva y no un campo torcido. Estas son esas columnas.
--
-- Por qué importa: MESH V1 es CABA, así que "misma ciudad" es constante y no
-- discrimina nada. Con 48 barrios sí discrimina, y "¿qué tan lejos me queda?"
-- pasa a tener una respuesta.
--
-- Sin coordenadas. `lat`/`lng` siguen vacías: no escribimos coordenadas que no
-- verificamos, y una distancia en línea recta miente sobre una ciudad con río,
-- autopistas y subte. En su lugar `group_key` lleva la **comuna** de CABA (las
-- 15 de la Ley 1777), que es división administrativa real: "misma comuna" es un
-- hecho verificable, no una estimación nuestra de cercanía.

alter table public.locations
  add column kind text not null default 'city'
    check (kind in ('city', 'neighborhood')),
  add column parent_id uuid references public.locations (id) on delete restrict,
  add column group_key text check (group_key <> '');

comment on column public.locations.kind is
  'city | neighborhood. Un barrio siempre cuelga de una ciudad vía parent_id.';

comment on column public.locations.parent_id is
  'La ciudad de un barrio. Null en una ciudad.';

comment on column public.locations.group_key is
  'Agrupación oficial dentro de la ciudad — en CABA, la comuna. Null cuando no aplica. Dos null NO son el mismo grupo.';

-- Un barrio necesita padre; una ciudad no puede tenerlo. Sin esto, un barrio
-- huérfano queda fuera de toda comparación de cercanía y se ve igual que una
-- ciudad.
alter table public.locations
  add constraint locations_parent_matches_kind check (
    (kind = 'neighborhood' and parent_id is not null) or
    (kind = 'city' and parent_id is null)
  );

-- Un barrio cuelga de una ciudad, no de otro barrio. Dos niveles y no un árbol:
-- un árbol arbitrario obliga a recorrerlo para responder "¿misma ciudad?", que
-- es la pregunta que este esquema tiene que contestar barato.
create or replace function public.locations_parent_is_a_city()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if not exists (
      select 1 from public.locations
      where id = new.parent_id and kind = 'city'
    ) then
      raise exception 'parent_id tiene que apuntar a una ubicación con kind = city';
    end if;
  end if;
  return new;
end;
$$;

create trigger locations_parent_is_a_city
  before insert or update of parent_id on public.locations
  for each row execute function public.locations_parent_is_a_city();

-- Para poblar el selector de barrios de una ciudad sin escanear la tabla.
create index locations_parent_id_idx on public.locations (parent_id)
  where parent_id is not null;
