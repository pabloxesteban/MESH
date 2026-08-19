-- Darse de alta como artista desde la app.
--
-- Hasta acá el único camino era un código que MESH entregaba a mano
-- (`claim_professional`). Eso hacía imposible recorrer el producto entero sin
-- que alguien con la service-role key preparara una fila primero — ni siquiera
-- para quien lo está construyendo.
--
-- Esto abre el alta propia. **Es un cambio de producto, no una comodidad de
-- desarrollo**: el catálogo deja de ser exclusivamente curado. Ver ADR-013,
-- que documenta qué se pierde y cómo se vuelve a cerrar el día que haga falta.
--
-- Lo que NO cambia:
--   · `claim_professional` sigue existiendo. Un perfil que MESH armó se sigue
--     reclamando con código, y ese camino no se toca.
--   · `is_fixture` sigue significando lo mismo. Un perfil creado por una
--     persona es real aunque el producto esté en pruebas: marcarlo como
--     ficticio sería mentir en la dirección contraria.
--   · Una persona tiene como mucho UN perfil. La restricción es explícita
--     abajo, no un supuesto del cliente.

-- --- un dueño, un perfil -----------------------------------------------------
--
-- Antes esto no hacía falta: los perfiles los creaba el seeder y el código se
-- consumía una sola vez. Con alta propia, sin este índice alguien puede tocar
-- "crear" dos veces y quedarse con dos perfiles, y `fetchOwnedProfessional`
-- —que hace `limit 1`— empezaría a devolver cualquiera de los dos.
create unique index professionals_one_per_owner
  on public.professionals (owner_user_id)
  where owner_user_id is not null;

-- --- crear el perfil propio --------------------------------------------------

-- SECURITY DEFINER y no una política de INSERT: hay que fijar `owner_user_id`,
-- `is_published`, `is_fixture` y `category_id` desde el servidor. Con una
-- política, esas cuatro las mandaría el cliente y `with check` tendría que
-- defender cada una — incluido `is_fixture: true`, que dejaría a cualquiera
-- marcar su perfil como registro de prueba y saltearse los cortes que dependen
-- de esa columna.
create or replace function public.create_own_professional(
  p_display_name text,
  p_instagram text default null,
  p_whatsapp text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_category uuid;
  v_base text;
  v_slug text;
  v_intento integer := 1;
begin
  if v_user is null then
    raise exception 'hace falta una sesión' using errcode = '28000';
  end if;

  if p_display_name is null or btrim(p_display_name) = '' then
    raise exception 'hace falta un nombre' using errcode = '22004';
  end if;

  -- El mismo invariante que la restricción `professionals_published_is_contactable`,
  -- verificado acá para poder dar un mensaje que se entienda: un perfil
  -- publicado al que no se puede escribir es un callejón sin salida.
  if coalesce(btrim(p_instagram), '') = ''
     and coalesce(btrim(p_whatsapp), '') = '' then
    raise exception 'hace falta al menos un canal de contacto'
      using errcode = '22004';
  end if;

  if exists (
    select 1 from public.professionals where owner_user_id = v_user
  ) then
    raise exception 'ya tenés un perfil' using errcode = '23505';
  end if;

  select id into v_category
  from public.categories
  where slug = 'tattoo'::extensions.citext and is_active;

  if v_category is null then
    raise exception 'no hay categoría activa' using errcode = 'P0002';
  end if;

  -- Slug a partir del nombre: minúsculas, sin acentos, sin nada que no sea
  -- alfanumérico. Se deriva y no se pide, porque un slug es una ruta
  -- (`mesh://artista/{slug}`) y nadie debería tener que pensar en eso.
  -- `translate` y no la extensión `unaccent`: son cinco vocales y una eñe, y
  -- no vale sumar una extensión al esquema por eso.
  v_base := regexp_replace(
    translate(
      lower(btrim(p_display_name)),
      'áàäâãéèëêíìïîóòöôõúùüûñç',
      'aaaaaeeeeiiiiooooouuuunc'
    ),
    '[^a-z0-9]+', '-', 'g'
  );
  v_base := btrim(v_base, '-');
  if v_base = '' then v_base := 'artista'; end if;
  v_base := left(v_base, 40);

  v_slug := v_base;
  -- Un nombre repetido no es un error de quien se da de alta: hay más de una
  -- persona que se llama igual. Se numera y listo.
  while exists (
    select 1 from public.professionals where slug = v_slug::extensions.citext
  ) loop
    v_intento := v_intento + 1;
    v_slug := v_base || '-' || v_intento::text;
  end loop;

  insert into public.professionals (
    owner_user_id, category_id, slug, display_name,
    instagram_handle, whatsapp_e164,
    is_published, is_fixture, claimed_at
  ) values (
    v_user, v_category, v_slug::extensions.citext, btrim(p_display_name),
    nullif(btrim(p_instagram), ''), nullif(btrim(p_whatsapp), ''),
    true, false, now()
  );

  return v_slug;
end;
$$;

revoke all on function public.create_own_professional(text, text, text)
  from public, anon;
grant execute on function public.create_own_professional(text, text, text)
  to authenticated;

comment on function public.create_own_professional is
  'Crea el perfil de artista de quien llama. Uno por persona. Ver ADR-013.';

-- --- los estilos que declara el artista --------------------------------------

-- Sin esto, un perfil creado desde la app no tiene `professional_styles`, y el
-- componente Estilo del matching —que pesa 0,70— le da cero. O sea: existe en
-- el catálogo y no aparece nunca en los resultados de nadie.
--
-- Reemplaza el conjunto entero en vez de agregar de a uno: "estos son mis
-- estilos" es una sola decisión, y dos escrituras parciales dejan un estado
-- intermedio en el que el artista aparece recomendado para algo que ya sacó.
create or replace function public.set_own_styles(p_style_slugs text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_professional uuid;
  v_category uuid;
  v_slug text;
  v_style uuid;
  v_indice integer := 0;
begin
  if v_user is null then
    raise exception 'hace falta una sesión' using errcode = '28000';
  end if;

  select id, category_id into v_professional, v_category
  from public.professionals where owner_user_id = v_user;

  if v_professional is null then
    raise exception 'no tenés un perfil' using errcode = 'P0002';
  end if;

  delete from public.professional_styles where professional_id = v_professional;

  foreach v_slug in array coalesce(p_style_slugs, '{}') loop
    select id into v_style
    from public.styles
    where slug = v_slug::extensions.citext
      and category_id = v_category
      and is_active;

    -- Un slug que no existe se rechaza en vez de saltearse: guardar en
    -- silencio menos estilos de los que la persona eligió es peor que fallar.
    if v_style is null then
      raise exception 'el estilo "%" no existe en esta categoría', v_slug
        using errcode = '23503';
    end if;

    v_indice := v_indice + 1;
    -- Los primeros tres son primarios. El límite lo impone un trigger de la
    -- migración de `professionals`: si todo es primario, nada lo es.
    insert into public.professional_styles
      (professional_id, style_id, proficiency, is_primary)
    values (v_professional, v_style, 1.0, v_indice <= 3);
  end loop;
end;
$$;

revoke all on function public.set_own_styles(text[]) from public, anon;
grant execute on function public.set_own_styles(text[]) to authenticated;

comment on function public.set_own_styles is
  'Reemplaza los estilos declarados del perfil propio. Los primeros tres quedan primarios.';

-- --- la ubicación, ahora también con barrio ----------------------------------
--
-- La versión de dos argumentos guardaba las coordenadas y nada más, y el
-- barrio (`location_id`) se seguía cargando desde el seeder. Un artista que se
-- da de alta solo no pasa por el seeder nunca, así que sin esto queda sin
-- barrio — y el componente de Ubicación del matching se omite para él.
--
-- El barrio lo resuelve el geocoder del sistema operativo en el cliente y llega
-- como slug; acá se valida contra `locations` y se descarta si no existe. Ver
-- `apps/mobile/src/features/location/device.ts`.

drop function if exists public.set_studio_location(double precision, double precision);

create or replace function public.set_studio_location(
  p_lat double precision,
  p_lng double precision,
  p_neighborhood_slug text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_updated uuid;
  v_location uuid;
begin
  if v_user is null then
    raise exception 'hace falta una sesión para actualizar la ubicación'
      using errcode = '28000';
  end if;

  if p_lat is null or p_lng is null then
    raise exception 'hacen falta latitud y longitud' using errcode = '22004';
  end if;

  if p_neighborhood_slug is not null then
    -- `locations` no tiene `is_active`: la taxonomía de lugares no se
    -- desactiva, un barrio no deja de existir.
    select id into v_location
    from public.locations
    where slug = p_neighborhood_slug::extensions.citext;
  end if;

  update public.professionals
    set studio_lat = p_lat,
        studio_lng = p_lng,
        -- Un barrio que no reconocimos no borra el que ya estaba: el geocoder
        -- puede fallar una vez, y perder un dato bueno por eso sería peor.
        location_id = coalesce(v_location, location_id)
  where owner_user_id = v_user
  returning id into v_updated;

  if v_updated is null then
    raise exception 'no tenés un perfil para actualizar' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function
  public.set_studio_location(double precision, double precision, text)
  from public, anon;
grant execute on function
  public.set_studio_location(double precision, double precision, text)
  to authenticated;

comment on function public.set_studio_location is
  'Guarda la ubicación real del estudio y, si el barrio se reconoció, también el location_id.';
