-- Ubicación real del estudio, puesta por el artista.
--
-- `locations.lat`/`lng` existen desde la taxonomía y siguen vacías a propósito
-- (ver `docs/product/matching.md` §4.1): son coordenadas de barrio, nadie las
-- verificó, y una distancia calculada sobre un centroide de barrio sería
-- precisión inventada. Esta migración no toca esa decisión ni el matching —
-- agrega coordenadas de otro origen: el artista parado en su propio estudio,
-- tocando "usar mi ubicación actual".
--
-- Dos consentimientos separados hacen esto verificable en vez de estimado:
-- el artista elige activamente publicar dónde encuentra su estudio (esta
-- migración), y quien busca activa su propia ubicación para ver la distancia
-- (RLS de esta tabla ya alcanza para eso — la coordenada del estudio es
-- pública para cualquier perfil publicado, igual que el barrio; el permiso
-- de GPS de quien busca vive en el cliente, no en la base).
--
-- Display-only: no es un componente del score de matching. El ranking sigue
-- siendo por comuna/barrio (`match/2`), que es verificable para los 8-15
-- artistas curados sin pedirle GPS a nadie. La distancia real es una etiqueta
-- que se agrega encima del resultado ya ordenado, no un criterio de orden.

alter table public.professionals
  add column studio_lat double precision check (studio_lat between -90 and 90),
  add column studio_lng double precision check (studio_lng between -180 and 180);

alter table public.professionals
  add constraint professionals_studio_location_complete check (
    (studio_lat is null) = (studio_lng is null)
  );

comment on column public.professionals.studio_lat is
  'Latitud real del estudio, provista por el artista dueño del perfil vía set_studio_location(). NULL = no publicada. No confundir con locations.lat, que es de barrio y sigue vacía.';

comment on column public.professionals.studio_lng is
  'Longitud real del estudio. Ver comentario de studio_lat.';

-- --- escribir la propia ubicación ---------------------------------------------

-- Mismo patrón que `claim_professional`: SECURITY DEFINER, sin política de
-- UPDATE general. Una política de UPDATE sobre `professionals` abriría la
-- puerta a mover cualquier columna de la fila propia (precio, disponibilidad,
-- estilos) con un solo `with check`, y esta escritura es angosta a propósito
-- — dos columnas, y nada más.
create or replace function public.set_studio_location(p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_updated uuid;
begin
  if v_user is null then
    raise exception 'hace falta una sesión para actualizar la ubicación'
      using errcode = '28000';
  end if;

  if p_lat is null or p_lng is null then
    raise exception 'hacen falta latitud y longitud'
      using errcode = '22004';
  end if;

  update public.professionals
    set studio_lat = p_lat,
        studio_lng = p_lng
  where owner_user_id = v_user
  returning id into v_updated;

  if v_updated is null then
    -- No tiene un perfil propio para actualizar. Mismo criterio que
    -- `claim_professional`: un solo mensaje, sin distinguir "no reclamaste
    -- ningún perfil" de cualquier otro motivo.
    raise exception 'no tenés un perfil para actualizar' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_studio_location(double precision, double precision) from public, anon;
grant execute on function public.set_studio_location(double precision, double precision) to authenticated;

comment on function public.set_studio_location is
  'Guarda la ubicación real del estudio del perfil que reclamó quien llama. No hay UPDATE directo sobre professionals para esto.';
