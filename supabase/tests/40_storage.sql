-- Storage: buckets, límites y aislamiento entre carpetas.
--
-- Postgres protege las filas; storage protege los bytes. Que `media_assets`
-- esté bien no dice nada sobre si el objeto al que apunta es alcanzable.

begin;
select plan(12);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@example.test'),
  ('aaaaaaaa-0000-0000-0000-00000000000b', 'b@example.test');

-- --- configuración de los buckets --------------------------------------------

select is(
  (select public from storage.buckets where id = 'references'),
  false,
  'El bucket de referencias es privado'
);

select is(
  (select public from storage.buckets where id = 'portfolio'),
  true,
  'El bucket de portfolio es público — es la obra que el artista aceptó mostrar'
);

select is_empty(
  $$
    select id from storage.buckets
    where 'image/svg+xml' = any(allowed_mime_types)
  $$,
  'Ningún bucket acepta SVG — es un documento ejecutable servido desde nuestro dominio'
);

select is_empty(
  $$ select id from storage.buckets where file_size_limit is null $$,
  'Todo bucket tiene tope de tamaño'
);

select is_empty(
  $$ select id from storage.buckets where allowed_mime_types is null $$,
  'Todo bucket tiene lista blanca de MIME'
);

-- --- objetos: A sube en su carpeta -------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'references',
      'aaaaaaaa-0000-0000-0000-00000000000a/ref-1.webp',
      'aaaaaaaa-0000-0000-0000-00000000000a'
    )
  $$,
  'A puede escribir en su propia carpeta de referencias'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'references',
      'aaaaaaaa-0000-0000-0000-00000000000b/robada.webp',
      'aaaaaaaa-0000-0000-0000-00000000000a'
    )
  $$,
  42501,
  null,
  'A no puede escribir en la carpeta de B, ni fabricando la ruta'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'references', 'suelta.webp', 'aaaaaaaa-0000-0000-0000-00000000000a'
    )
  $$,
  42501,
  null,
  'Un objeto sin carpeta de usuario se rechaza'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'portfolio',
      'aaaaaaaa-0000-0000-0000-00000000000a/falso.webp',
      'aaaaaaaa-0000-0000-0000-00000000000a'
    )
  $$,
  42501,
  null,
  'Nadie puede escribir en el catálogo desde el cliente'
);

-- --- B no ve lo de A ---------------------------------------------------------

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000b","role":"authenticated"}';

select is(
  (select count(*) from storage.objects where bucket_id = 'references'),
  0::bigint,
  'B no ve la referencia privada de A'
);

-- No se prueba un `delete` cruzado: storage tiene un trigger `protect_delete`
-- que rechaza cualquier borrado directo sobre la tabla y obliga a pasar por la
-- Storage API. La política de delete existe igual, y es lo que la API evalúa.

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';

select is(
  (select count(*) from storage.objects where bucket_id = 'references'),
  1::bigint,
  'A sí ve su propio objeto — el silencio para B no es que no exista'
);

reset role;

select is_empty(
  $$
    select polname from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage' and c.relname = 'objects'
      and 'anon'::regrole = any(p.polroles)
  $$,
  'Ninguna política de storage le da acceso a anon'
);

select * from finish();
rollback;
