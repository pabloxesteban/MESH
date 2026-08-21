-- Borrar la cuenta, de verdad.
--
-- Ver ADR-024.
--
-- ## El bug que esto además arregla
--
-- Hasta hoy, borrar un usuario que tuviera un perfil de artista **fallaba**.
-- `professionals.owner_user_id` es `on delete set null`, y la tabla tiene un
-- check que exige `(claimed_at is null) = (owner_user_id is null)`: al vaciar
-- el dueño, `claimed_at` quedaba lleno y la restricción rechazaba el borrado.
--
-- Nadie lo había visto porque nunca se había borrado una cuenta. Era la clase
-- de bug que aparece el día que alguien ejerce un derecho.
--
-- ## Por qué el perfil de artista se va con la persona, siempre
--
-- Aunque MESH lo haya curado. La fila tiene su nombre, sus fotos y su
-- Instagram: dejarla publicada porque "la armamos nosotros" sería retener
-- justamente lo que la persona pidió que no retengamos. Volver a cargarla es
-- una corrida del seeder, y solo con un consentimiento nuevo.
--
-- ## Qué NO hace esta función
--
-- No borra los archivos de storage. Borrar la fila de `storage.objects` deja el
-- archivo huérfano en el bucket, así que eso lo hace la Edge Function
-- `delete-account` con la API de storage, **antes** de llamar acá. Si esta
-- función se llamara sola, quedarían fotos sin dueño. Está escrito en el
-- comentario de la función para que nadie la use suelta.

/**
 * Borra la cuenta de quien llama, y todo lo que cuelga de ella.
 *
 * `security definer` porque tiene que tocar `auth.users`, que ningún rol de
 * cliente puede tocar. El candado es que **no recibe a quién borrar**: saca el
 * id de `auth.uid()`, así que la única cuenta que puede borrar es la propia.
 * Un parámetro `p_user_id` acá habría sido una función de borrar a cualquiera.
 *
 * El orden importa y no es arbitrario:
 *
 * 1. **El perfil de artista primero.** Si no, el `on delete set null` de
 *    `owner_user_id` choca con el check de `claimed_at` y el borrado falla.
 * 2. **La auditoría antes del borrado**, porque después ya no hay sesión desde
 *    la cual escribirla. Lleva el uuid y nada más: ni mail, ni nombre, ni qué
 *    tenía adentro. Es la prueba de que se borró, no un archivo de lo borrado.
 * 3. **`auth.users` al final.** El cascade se lleva `profiles` y de ahí todo
 *    lo demás: proyectos, conversaciones, mensajes, turnos, reseñas,
 *    guardados, hilos del asistente, denuncias y bloqueos.
 */
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  quien uuid := (select auth.uid());
  perfil uuid;
begin
  if quien is null then
    raise exception 'hace falta una sesión' using errcode = '28000';
  end if;

  select p.id into perfil
  from public.professionals p
  where p.owner_user_id = quien;

  if perfil is not null then
    delete from public.professionals where id = perfil;
  end if;

  insert into public.audit_events
    (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    quien,
    'account_deleted',
    'profile',
    quien,
    -- Solo si tenía perfil de artista, que es lo que un revisor necesita para
    -- entender por qué desapareció una ficha del catálogo. Nada de la persona.
    jsonb_build_object('had_professional', perfil is not null)
  );

  delete from auth.users where id = quien;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account is
  'Borra la cuenta de quien llama. NO borra archivos de storage: eso lo hace la Edge Function delete-account antes de llamar acá. Ver ADR-024.';
