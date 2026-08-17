-- Buckets de storage y sus políticas.
--
-- Postgres protege las FILAS; storage protege los BYTES. Son dos capas
-- distintas y hay que escribir las dos: una fila de `media_assets` que nadie
-- puede leer no sirve de nada si el objeto de storage al que apunta es público
-- y su ruta es adivinable.
--
-- La convención de rutas es la que hace posible la política: el PRIMER segmento
-- de la ruta es el id de quien sube. Así el predicado no depende de nada que
-- mande el cliente salvo la ruta misma, y la ruta se compara contra
-- `auth.uid()`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Catálogo: lectura pública, escritura solo del service role (el seeder).
  -- Es público a propósito — es la obra que el artista aceptó mostrar, y
  -- firmar cada tarjeta del mazo sería un round trip por imagen.
  (
    'portfolio', 'portfolio', true, 12582912,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  -- Referencias de proyecto: privadas. Es la foto que alguien sacó en su casa.
  -- Se sirven con URLs firmadas de vida corta, generadas a demanda.
  (
    'references', 'references', false, 12582912,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic']
  ),
  -- Avatares: lectura pública, escritura del dueño.
  (
    'avatars', 'avatars', true, 2097152,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- El tope de tamaño y la lista de MIME son de nivel bucket, o sea que los
-- impone el servicio de storage antes de escribir un byte. Los chequeos del
-- cliente son UX; esto es lo que realmente impone. Sin SVG en ninguna lista: un
-- SVG es un documento ejecutable servido desde nuestro dominio.

-- --- portfolio ---------------------------------------------------------------
--
-- Sin políticas de escritura: el bucket es público para leer y solo lo escribe
-- el service role, que pasa por encima de RLS. Una política de escritura para
-- `authenticated` sería una superficie de ataque a cambio de nada.

create policy "portfolio: lectura para cualquier sesión"
  on storage.objects for select to authenticated
  using (bucket_id = 'portfolio');

-- --- references --------------------------------------------------------------

create policy "references: leer solo lo propio"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'references'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "references: escribir solo en la carpeta propia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'references'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Sin UPDATE: reemplazar una referencia es subir una nueva y borrar la vieja.
-- Un update sobre un objeto de storage cambiaría los bytes debajo de una fila
-- de `media_assets` que ya registró un checksum.

create policy "references: borrar solo lo propio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'references'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- --- avatars -----------------------------------------------------------------

create policy "avatars: lectura para cualquier sesión"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

create policy "avatars: escribir solo en la carpeta propia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: borrar solo lo propio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- `anon` no aparece en ninguna política: no hay camino de lectura sin sesión,
-- ni para filas ni para bytes. La sesión anónima de Supabase ES una sesión.
