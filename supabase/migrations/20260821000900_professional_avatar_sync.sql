-- Sincronizar la foto de perfil con la tarjeta de Inicio, de verdad.
--
-- ADR-030 dice que subir la foto personal (`profiles.avatar_media_id`)
-- también actualiza `professionals.avatar_media_id` cuando quien sube tiene
-- perfil propio — es la misma cara en los dos lugares, y es lo que hace que
-- el aviso "Todavía no subiste una foto de perfil" desaparezca solo.
--
-- Pero `professionals` nunca tuvo una política de UPDATE ni un grant directo
-- para `authenticated` (ver `20260819000400_artist_self_signup.sql`: todo
-- lo que un artista escribe sobre su fila pasa por funciones angostas,
-- `security definer`, una por campo). El cliente venía haciendo
-- `update professionals set avatar_media_id = ...` directo, y eso siempre
-- devolvió 42501 antes de llegar a RLS — falla cerrada, no es un agujero,
-- pero rompe la promesa de la ADR para cualquier artista, no solo un caso
-- raro. Esta función es el camino que faltaba, con la misma forma que
-- `set_studio_location`.

create or replace function public.set_own_professional_avatar(p_media_id uuid)
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
    raise exception 'hace falta una sesión para actualizar la foto'
      using errcode = '28000';
  end if;

  if p_media_id is null then
    raise exception 'hace falta el id de la foto' using errcode = '22004';
  end if;

  -- El media asset tiene que ser del bucket de avatares y pertenecerle a
  -- quien llama. `media_assets_insert_own` ya exige `owner_user_id =
  -- auth.uid()` al subir, pero esta función corre con los privilegios del
  -- dueño de la función (`security definer`), así que no hereda esa
  -- protección sola — se revalida acá.
  if not exists (
    select 1 from public.media_assets
    where id = p_media_id
      and bucket = 'avatars'
      and owner_user_id = v_user
  ) then
    raise exception 'la foto no existe o no te pertenece' using errcode = '42501';
  end if;

  update public.professionals
    set avatar_media_id = p_media_id
  where owner_user_id = v_user
  returning id into v_updated;

  if v_updated is null then
    raise exception 'no tenés un perfil para actualizar' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_own_professional_avatar(uuid) from public, anon;
grant execute on function public.set_own_professional_avatar(uuid) to authenticated;

comment on function public.set_own_professional_avatar is
  'Apunta el avatar del perfil profesional propio a un media asset ya subido. Ver ADR-030.';
