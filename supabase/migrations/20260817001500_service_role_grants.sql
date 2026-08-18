-- Grants explícitos para `service_role`.
--
-- Por qué hace falta esto si `service_role` es la clave de administración: los
-- privilegios por defecto de la plataforma NO son un contrato. En este mismo
-- proyecto, `service_role` quedó con solo REFERENCES/TRIGGER/TRUNCATE sobre las
-- tablas nuevas —los privilegios por defecto del esquema `public` vienen
-- recortados en las versiones recientes de Supabase— y el seeder falló con
-- "permission denied for table categories" recién al intentar cargar.
--
-- La misma regla que aplicamos a los roles de cliente aplica acá: lo que un rol
-- puede hacer se escribe, no se hereda. Que esto sea explícito además hace que
-- una actualización de la plataforma no pueda romper la carga en silencio.
--
-- Esto NO afloja nada. `service_role` ya pasa por encima de RLS (BYPASSRLS) y
-- solo existe en tools/seed y en los secretos de CI. Ver
-- docs/security/security-model.md §7.

grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Y para lo que venga después, para que una migración futura no tenga que
-- acordarse de repetir esto.
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;
