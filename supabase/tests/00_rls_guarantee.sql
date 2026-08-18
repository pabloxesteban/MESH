-- Garantía genérica de RLS.
--
-- Estos tests no conocen ninguna tabla por nombre. Recorren el catálogo, así
-- que una tabla nueva sin políticas rompe el CI sin que nadie se acuerde de
-- agregarla acá. Ese es todo el punto: la regla se impone sola.
--
-- Ver .claude/workflows/database-change.md §4.

begin;
select plan(9);

-- 1. RLS habilitado en toda tabla de `public`.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  $$,
  'Toda tabla de public tiene RLS habilitado'
);

-- 2. Y FORZADO. Sin esto, el dueño de la tabla se saltea sus propias políticas
--    y cualquier función SECURITY DEFINER se vuelve un agujero.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relforcerowsecurity
  $$,
  'Toda tabla de public tiene RLS forzado'
);

-- 3. Ninguna política `for all`. Una sola política para los cuatro verbos hace
--    que leer sea tan permisivo como borrar, y esconde que nunca se pensó el
--    caso de update.
select is_empty(
  $$
    select c.relname || '.' || p.polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and p.polcmd = '*'
  $$,
  'Ninguna política usa `for all`'
);

-- 4. Toda política de INSERT tiene `with check`. Sin él, la política no
--    restringe nada: `using` no se evalúa en un insert.
select is_empty(
  $$
    select c.relname || '.' || p.polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and p.polcmd = 'a' and p.polwithcheck is null
  $$,
  'Toda política de insert tiene with check'
);

-- 5. Toda política de UPDATE protege `using` Y `with check`. Con solo `using`,
--    alguien puede mover una fila propia hacia otro dueño.
select is_empty(
  $$
    select c.relname || '.' || p.polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and p.polcmd = 'w'
      and (p.polqual is null or p.polwithcheck is null)
  $$,
  'Toda política de update protege using y with check'
);

-- 6. Cada tabla tiene al menos una política, O ningún privilegio para roles de
--    cliente. Una tabla sin grants es inalcanzable tenga las políticas que
--    tenga — es el caso de `audit_events`, que a propósito no tiene ninguna.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
      and (
        has_table_privilege('authenticated', c.oid, 'select, insert, update, delete')
        or has_table_privilege('anon', c.oid, 'select, insert, update, delete')
      )
  $$,
  'Toda tabla sin políticas tampoco tiene grants de cliente'
);

-- 7. `anon` no tiene ningún privilegio en `public`. No existe camino de lectura
--    sin sesión: la sesión anónima de Supabase ES una sesión. Ver ADR-002.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger')
  $$,
  'El rol anon no tiene privilegios sobre ninguna tabla de public'
);

-- 8. Toda función SECURITY DEFINER de `public` fija su search_path. Una que lo
--    hereda es una escalada de privilegios esperando a que alguien cree una
--    función homónima en un esquema que esté antes en el path.
select is_empty(
  $$
    select p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (
        p.proconfig is null
        or not exists (
          select 1 from unnest(p.proconfig) as cfg
          where cfg like 'search_path=%'
        )
      )
  $$,
  'Toda función security definer fija search_path'
);

-- 9. `service_role` puede escribir en todas las tablas.
--
-- No es una garantía de seguridad sino de que el seeder funciona. Está acá
-- porque ya se rompió una vez: los privilegios por defecto del esquema `public`
-- vienen recortados en las versiones recientes de Supabase, `service_role`
-- quedó sin INSERT, y la carga falló recién al intentar escribir. Un privilegio
-- que se hereda es un privilegio que una actualización puede sacar.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not has_table_privilege('service_role', c.oid, 'select, insert, update, delete')
  $$,
  'service_role puede escribir en todas las tablas de public'
);

select * from finish();
rollback;
